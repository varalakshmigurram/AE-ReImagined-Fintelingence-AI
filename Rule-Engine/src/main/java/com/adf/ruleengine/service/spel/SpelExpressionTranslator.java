package com.adf.ruleengine.service.spel;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.regex.*;

/**
 * Translates AE rule description text into SpEL (Spring Expression Language) expressions.
 * Maps natural language patterns from the rule spec into executable conditions.
 */
@Service
@Slf4j
public class SpelExpressionTranslator {

    // ─── Pattern registry: (regex, spel template, variables extracted) ──────
    private static final List<TranslationPattern> PATTERNS = buildPatterns();

    public TranslationResult translate(String ruleId, String description) {
        if (description == null || description.isBlank()) {
            return TranslationResult.failed("Empty description");
        }

        String normalized = description.trim().replaceAll("\\s+", " ");

        for (TranslationPattern p : PATTERNS) {
            Matcher m = p.pattern.matcher(normalized);
            if (m.find()) {
                try {
                    String spel = p.buildSpel(m);
                    String precondition = p.buildPrecondition(m);
                    return TranslationResult.success(spel, precondition, p.result, p.description);
                } catch (Exception e) {
                    log.warn("Pattern matched but spel build failed for ruleId={}: {}", ruleId, e.getMessage());
                }
            }
        }

        // Fallback: wrap as comment
        return TranslationResult.partial(
            "/* MANUAL_REVIEW: " + normalized.replace("*/", "* /") + " */",
            "Automatic translation not available — manual SpEL required"
        );
    }

    private static List<TranslationPattern> buildPatterns() {
        List<TranslationPattern> p = new ArrayList<>();

        // ── Score / numeric threshold rules ─────────────────────────────────

        // "If Vantage score < Cutoff, reject" → tu.vantageScore < cutoffValue
        p.add(new TranslationPattern(
            Pattern.compile("(?i)vantage(?:\\s+score)?\\s*[<≤]\\s*(?:Cutoff|cutoff)\\b.*reject"),
            (m, vars) -> "tu.vantageScore < cutoffs.getOrDefault('vantageScoreCutoff', 500)",
            (m, vars) -> "availableProviders.contains('tu')",
            "HARD", "Vantage score below cutoff → reject"
        ));

        // "If CV score < Cutoff, reject"
        p.add(new TranslationPattern(
            Pattern.compile("(?i)cv\\s*score\\s*[<≤]\\s*(?:Cutoff|cutoff)\\b.*reject"),
            (m, vars) -> "tu.cvScore < cutoffs.getOrDefault('cvScoreCutoff', 500)",
            (m, vars) -> "availableProviders.contains('tu')",
            "HARD", "CV score below cutoff → reject"
        ));

        // "If FICO Score <= Cutoff, reject" (AE_ASSIGNED_CREDIT_SCORE)
        p.add(new TranslationPattern(
            Pattern.compile("(?i)fico\\s*score\\s*[<≤]=?\\s*(\\d+)"),
            (m, vars) -> "facts['assignedCreditScore'] <= " + m.group(1),
            (m, vars) -> null,
            "HARD", "FICO score below threshold → reject"
        ));

        // "If customer stated income <= Cutoff then reject" (AE_LOW_INCOME)
        p.add(new TranslationPattern(
            Pattern.compile("(?i)(?:customer\\s+stated\\s+income|stated\\s+annual\\s+income|income)\\s*[<≤]=?\\s*(?:Cutoff|cutoff|\\d+)"),
            (m, vars) -> {
                // Try to extract numeric cutoff from description
                Matcher nm = Pattern.compile("(?:cutoff\\s+\\d+=\\s*|=\\s*)(\\d+)").matcher(m.group(0));
                String cutoffVal = nm.find() ? nm.group(1) : "cutoffs.getOrDefault('incomeCutoff', 25000)";
                return "facts['statedAnnualIncome'] <= " + cutoffVal;
            },
            (m, vars) -> null,
            "HARD", "Income below threshold → reject"
        ));

        // ── State / FEB check ────────────────────────────────────────────────
        p.add(new TranslationPattern(
            Pattern.compile("(?i)(?:customer\\s+is\\s+from\\s+FEB|FEB\\s+state|invalid.*state)"),
            (m, vars) -> "febStates.contains(facts['contact.state'])",
            (m, vars) -> "facts.containsKey('contact.state')",
            "HARD", "Customer in FEB (forbidden) state → reject"
        ));

        // ── Address check ────────────────────────────────────────────────────
        p.add(new TranslationPattern(
            Pattern.compile("(?i)(?:address.*PO\\s*BOX|PO\\s*BOX.*reject)"),
            (m, vars) -> "facts['contact.address'] != null && facts['contact.address'].toUpperCase().contains('PO BOX')",
            (m, vars) -> "facts.containsKey('contact.address')",
            "HARD", "PO BOX address → reject"
        ));

        // ── Loan amount rules ────────────────────────────────────────────────
        p.add(new TranslationPattern(
            Pattern.compile("(?i)(?:requested\\s+loan\\s+amount|loan\\s+amount)\\s*[>≥]\\s*(?:Cutoff|cutoff)"),
            (m, vars) -> "facts['requestedLoanAmount'] > cutoffs.getOrDefault('maxLoanAmountCutoff', 15000)",
            (m, vars) -> "facts.containsKey('requestedLoanAmount')",
            "HARD", "Requested loan amount exceeds channel cutoff → reject"
        ));

        // ── PTSMI rule ───────────────────────────────────────────────────────
        p.add(new TranslationPattern(
            Pattern.compile("(?i)PTSMI|repayment\\s+amount\\s*/\\s*(?:customer\\s+)?stated\\s+monthly\\s+income"),
            (m, vars) -> "(facts['repaymentAmount'] / facts['statedMonthlyIncome']) > cutoffs.getOrDefault('ptsmiCutoff', 0.115)",
            (m, vars) -> "facts.containsKey('statedMonthlyIncome') && facts['statedMonthlyIncome'] > 0",
            "HARD", "Payment-to-income ratio exceeds threshold → reject"
        ));

        // ── LTI rule ─────────────────────────────────────────────────────────
        p.add(new TranslationPattern(
            Pattern.compile("(?i)LTI|loan\\s+amount\\s*/\\s*(?:customer\\s+stated\\s+)?annual\\s+income"),
            (m, vars) -> "(facts['loanAmount'] / facts['statedAnnualIncome']) > cutoffs.getOrDefault('ltiCutoff', 0.3)",
            (m, vars) -> "facts.containsKey('statedAnnualIncome') && facts['statedAnnualIncome'] > 0",
            "HARD", "Loan-to-income ratio exceeds threshold → reject"
        ));

        // ── Dedup rule ───────────────────────────────────────────────────────
        p.add(new TranslationPattern(
            Pattern.compile("(?i)(?:dedup|already\\s+seen).*(?:30\\s+days|last\\s+30)"),
            (m, vars) -> "dedupService.seenInLastNDays(facts['ssn'], 30) && !dedupService.offeredInAnyChannel(facts['ssn'])",
            (m, vars) -> "facts.containsKey('ssn')",
            "HARD", "Customer seen in last 30 days and not offered → dedup reject"
        ));

        // ── Negative file ────────────────────────────────────────────────────
        p.add(new TranslationPattern(
            Pattern.compile("(?i)negative\\s+file"),
            (m, vars) -> "negativeFileService.isInNegativeFile(facts['ssn'])",
            (m, vars) -> "facts.containsKey('ssn')",
            "HARD", "Customer in negative file → reject"
        ));

        // ── TU No Hit ────────────────────────────────────────────────────────
        p.add(new TranslationPattern(
            Pattern.compile("(?i)TU\\s+no\\s+hit|no\\s+hit.*reject"),
            (m, vars) -> "tu.noHit == true",
            (m, vars) -> "availableProviders.contains('tu')",
            "HARD", "TU no-hit → reject"
        ));

        // ── Thin file rules ──────────────────────────────────────────────────
        p.add(new TranslationPattern(
            Pattern.compile("(?i)thin\\s+file.*G106S\\s*[<≤]=?\\s*(\\d+)"),
            (m, vars) -> "tu.g106s <= " + m.group(1),
            (m, vars) -> "availableProviders.contains('tu')",
            "HARD", "Thin file — G106S below threshold → reject"
        ));

        // ── Student loan rule ────────────────────────────────────────────────
        p.add(new TranslationPattern(
            Pattern.compile("(?i)SG68S\\s*>\\s*0.*SG34S\\s*=\\s*['\"]?Y['\"]?"),
            (m, vars) -> "tu.sg68s > 0 && 'Y'.equals(tu.sg34s)",
            (m, vars) -> "availableProviders.contains('tu')",
            "HARD", "Student loan attributes triggered → reject"
        ));

        // ── Credit grade F ───────────────────────────────────────────────────
        p.add(new TranslationPattern(
            Pattern.compile("(?i)credit\\s+grade.*['\"]?F['\"]?.*reject"),
            (m, vars) -> "'F'.equals(facts['de.creditGrade'])",
            (m, vars) -> "facts.containsKey('de.creditGrade')",
            "HARD", "Credit grade F → reject"
        ));

        // ── Suspicious score (too high) ──────────────────────────────────────
        p.add(new TranslationPattern(
            Pattern.compile("(?i)suspicious.*(?:CV|vantage)\\s*score.*[>≥]\\s*(?:Cutoff|cutoff|(\\d+))"),
            (m, vars) -> {
                String cutoff = m.group(1) != null ? m.group(1) : "cutoffs.getOrDefault('suspiciousScoreCutoff', 720)";
                String scoreVar = m.group(0).toLowerCase().contains("vantage") ? "tu.vantageScore" : "tu.cvScore";
                return scoreVar + " > " + cutoff;
            },
            (m, vars) -> "availableProviders.contains('tu')",
            "HARD", "Suspiciously high score → reject"
        ));

        // ── Charge-off rule ──────────────────────────────────────────────────
        p.add(new TranslationPattern(
            Pattern.compile("(?i)CO02S.*[>≥]\\s*(?:Cutoff|cutoff|(\\d+))"),
            (m, vars) -> "tu.co02s > " + (m.group(1) != null ? m.group(1) : "cutoffs.getOrDefault('chargeOffCutoff', 6)"),
            (m, vars) -> "availableProviders.contains('tu')",
            "HARD", "Charge-off trades exceed threshold → reject"
        ));

        // ── QS low income + credit rating ────────────────────────────────────
        p.add(new TranslationPattern(
            Pattern.compile("(?i)(?:annual\\s*[Ii]ncome|income)\\s*[<≤]=?\\s*(\\d+).*[Cc]redit\\s*[Rr]ating\\s*[<≤]=?\\s*(\\d+)"),
            (m, vars) -> "facts['statedAnnualIncome'] <= " + m.group(1) + " && facts['creditRating'] <= " + m.group(2),
            (m, vars) -> "facts.containsKey('statedAnnualIncome') && facts.containsKey('creditRating')",
            "HARD", "Low income AND low credit rating → reject"
        ));

        return p;
    }

    // ─── Inner types ─────────────────────────────────────────────────────────

    @FunctionalInterface
    interface SpelBuilder { String build(Matcher m, Map<String, String> vars) throws Exception; }

    static class TranslationPattern {
        final Pattern pattern;
        final SpelBuilder spelFn;
        final SpelBuilder precondFn;
        final String result;
        final String description;

        TranslationPattern(Pattern pattern, SpelBuilder spelFn, SpelBuilder precondFn, String result, String description) {
            this.pattern = pattern; this.spelFn = spelFn;
            this.precondFn = precondFn; this.result = result; this.description = description;
        }

        String buildSpel(Matcher m) throws Exception { return spelFn.build(m, Map.of()); }
        String buildPrecondition(Matcher m) throws Exception {
            return precondFn != null ? precondFn.build(m, Map.of()) : null;
        }
    }

    public static class TranslationResult {
        public final String spelExpression;
        public final String precondition;
        public final String result;
        public final String description;
        public final boolean translated;
        public final String error;

        private TranslationResult(String spel, String pre, String result, String desc, boolean ok, String err) {
            this.spelExpression = spel; this.precondition = pre; this.result = result;
            this.description = desc; this.translated = ok; this.error = err;
        }

        static TranslationResult success(String spel, String pre, String result, String desc) {
            return new TranslationResult(spel, pre, result, desc, true, null);
        }
        static TranslationResult partial(String spel, String err) {
            return new TranslationResult(spel, null, "UNKNOWN", null, false, err);
        }
        static TranslationResult failed(String err) {
            return new TranslationResult(null, null, null, null, false, err);
        }
    }
}
