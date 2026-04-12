package com.adf.ruleengine.service.embedded;

import com.adf.ruleengine.dto.embedded.*;
import com.adf.ruleengine.model.embedded.*;
import com.adf.ruleengine.repository.embedded.*;
import com.adf.ruleengine.model.embedded.EmbeddedCutoffEntry;
import com.adf.ruleengine.repository.embedded.EmbeddedCutoffEntryRepository;
import com.adf.ruleengine.service.spel.SpelExpressionTranslator;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmbeddedRuleEngineService {

    private final RuleBundleSnapshotRepository ruleBundleRepo;
    private final CutoffGroupSnapshotRepository cutoffRepo;
    private final EmbeddedVariableRegistryRepository variableRepo;
    private final ObjectMapper objectMapper;
    private final SpelExpressionTranslator spelTranslator;
    private final ConfigVersionService versionService;
    private final EmbeddedCutoffEntryRepository cutoffEntryRepo;

    // ─── Local JVM Cache (batchId-based invalidation) ────────────────────────
    private final Map<String, CompiledRuleGroup> compiledGroupsCache = new ConcurrentHashMap<>();
    private final Map<String, Object>            cutoffGroupsCache   = new ConcurrentHashMap<>();
    private volatile String activeBatchId = null;

    // ── SAVE PIPELINE ─────────────────────────────────────────────────────────
    @Transactional
    public RuleSaveResponse saveRules(RuleSaveRequest request) {
        List<String> validationErrors = validate(request);
        if (!validationErrors.isEmpty()) return RuleSaveResponse.failed(validationErrors);

        String batchId    = UUID.randomUUID().toString();
        int    rulesSaved = 0;
        int    cutoffsSaved = 0;

        try {
            // Deactivate old snapshots
            ruleBundleRepo.deactivateAll();
            cutoffRepo.deactivateAll();

            // Save rule groups
            if (request.getRulesByGroup() != null) {
                for (Map.Entry<String, List<RuleSaveRequest.RuleDefinition>> entry : request.getRulesByGroup().entrySet()) {
                    String groupName = entry.getKey();
                    List<RuleSaveRequest.RuleDefinition> rules = entry.getValue();

                    // Auto-translate description → SpEL where condition is absent
                    for (RuleSaveRequest.RuleDefinition rule : rules) {
                        if ((rule.getCondition() == null || rule.getCondition().isBlank())
                                && rule.getDescription() != null && !rule.getDescription().isBlank()) {
                            SpelExpressionTranslator.TranslationResult tr =
                                spelTranslator.translate(rule.getRuleId(), rule.getDescription());
                            rule.setCondition(tr.spelExpression);
                            rule.setPrecondition(tr.precondition);
                            if (rule.getResult() == null && tr.result != null
                                    && !"UNKNOWN".equals(tr.result)) rule.setResult(tr.result);
                            rule.setSpelTranslated(true);
                            rule.setTranslationNote(tr.description);
                        }
                    }

                    String rawJson      = objectMapper.writeValueAsString(rules);
                    String compiledJson = buildCompiledJson(groupName, rules);

                    ruleBundleRepo.save(RuleBundleSnapshot.builder()
                        .batchId(batchId).groupName(groupName)
                        .rawJson(rawJson).compiledJson(compiledJson)
                        .checksum(sha256(rawJson)).isActive(true).build());

                    compiledGroupsCache.put(groupName, new CompiledRuleGroup(groupName, rules, compiledJson));
                    rulesSaved += rules.size();
                }
            }

            // Save cutoffs — snapshot table + individual row table
            if (request.getCutoffs() != null && !request.getCutoffs().isEmpty()) {
                String cutoffJson = objectMapper.writeValueAsString(request.getCutoffs());
                cutoffRepo.save(CutoffGroupSnapshot.builder()
                    .batchId(batchId).rawJson(cutoffJson).checksum(sha256(cutoffJson))
                    .changeDetails("{\"savedAt\":\"" + LocalDateTime.now() + "\"}")
                    .isActive(true).build());
                cutoffGroupsCache.putAll(request.getCutoffs());

                // Write individual rows for production tracking table
                cutoffEntryRepo.deactivateAll();
                for (Map.Entry<String, Map<String, Object>> groupEntry : request.getCutoffs().entrySet()) {
                    String groupName = groupEntry.getKey();
                    for (Map.Entry<String, Object> dimEntry : groupEntry.getValue().entrySet()) {
                        String dimKey = dimEntry.getKey();
                        double value = ((Number) dimEntry.getValue()).doubleValue();
                        String[] parts = dimKey.split(",");
                        cutoffEntryRepo.save(EmbeddedCutoffEntry.builder()
                            .batchId(batchId)
                            .groupName(groupName)
                            .dimensionKey(dimKey)
                            .creditGrade(parts.length > 0 ? parts[0] : "")
                            .channelCode(parts.length > 1 ? parts[1] : "")
                            .stateCode(parts.length > 2 ? parts[2] : "")
                            .cutoffValue(value)
                            .environment(request.getCreatedBy() != null ? "TEST" : "TEST")
                            .savedBy(request.getCreatedBy() != null ? request.getCreatedBy() : "system")
                            .isActive(true).build());
                    }
                }
                cutoffsSaved = request.getCutoffs().size();
            }

            // Update batchId LAST (cache ready before pointer changes)
            // Register version for Flyway-style collision tracking
            if (request.getVersion() != null && !request.getVersion().isBlank()) {
                try {
                    versionService.registerVersion(
                        request.getVersion(),
                        ConfigVersion.ConfigScope.RULES,
                        batchId,
                        request.getVersionDescription() != null ? request.getVersionDescription() : "Rule save",
                        request.getCreatedBy() != null ? request.getCreatedBy() : "system",
                        request.getRulesByGroup()
                    );
                } catch (ConfigVersionService.VersionException ve) {
                    // Version collision — abort save
                    throw ve;
                }
            }

            activeBatchId = batchId;
            log.info("Rules saved — batchId={}, rules={}, cutoffs={}", batchId, rulesSaved, cutoffsSaved);
            return RuleSaveResponse.success(batchId, rulesSaved, cutoffsSaved);

        } catch (Exception e) {
            log.error("Rule save failed", e);
            return RuleSaveResponse.failed(List.of("Save failed: " + e.getMessage()));
        }
    }

    // ── EXECUTE PIPELINE ──────────────────────────────────────────────────────
    public RuleExecuteResponse execute(RuleExecuteRequest request) {
        long start = System.currentTimeMillis();

        Map<String, CompiledRuleGroup> groups = loadCompiledGroups();
        Map<String, Object>            cutoffs = loadCutoffs();

        // Enrich facts with resolved cutoff values
        Map<String, Object> enrichedFacts = new HashMap<>(request.getFacts() != null ? request.getFacts() : Map.of());
        resolveCutoffs(cutoffs, enrichedFacts, enrichedFacts);

        Set<String> availableProviders = new HashSet<>(
            request.getAvailableProviders() != null ? request.getAvailableProviders() : List.of());

        List<RuleExecuteResponse.GroupResult> groupResults = new ArrayList<>();

        for (Map.Entry<String, CompiledRuleGroup> entry : groups.entrySet()) {
            List<RuleExecuteResponse.RuleResult> ruleResults = new ArrayList<>();

            for (RuleSaveRequest.RuleDefinition rule : entry.getValue().rules()) {
                if (!Boolean.TRUE.equals(rule.getEnabled())) continue;

                // Provider filtering — skip if required provider unavailable
                if (rule.getThirdPartySources() != null && !rule.getThirdPartySources().isEmpty()
                        && !availableProviders.containsAll(rule.getThirdPartySources())) {
                    ruleResults.add(RuleExecuteResponse.RuleResult.skipped(rule.getRuleId(), rule.getTags()));
                    continue;
                }

                TriState ts = evaluateCondition(rule.getCondition(), enrichedFacts);
                ruleResults.add(new RuleExecuteResponse.RuleResult(
                    rule.getRuleId(),
                    ts.name(),
                    ts == TriState.TRUE ? rule.getResult() : null,
                    ts == TriState.UNKNOWN ? "SKIPPED" : (ts == TriState.TRUE ? "FIRED" : "NOT_FIRED"),
                    rule.getTags()
                ));
            }
            groupResults.add(new RuleExecuteResponse.GroupResult(entry.getKey(), ruleResults));
        }

        return new RuleExecuteResponse(request.getLeadId(), activeBatchId, groupResults,
                System.currentTimeMillis() - start);
    }

    // ── VALIDATE (dry run) ────────────────────────────────────────────────────
    public RuleSaveResponse validateOnly(RuleSaveRequest request) {
        List<String> errors = validate(request);
        return errors.isEmpty()
            ? RuleSaveResponse.builder().success(true).validationErrors(List.of()).build()
            : RuleSaveResponse.failed(errors);
    }

    // ── VARIABLES API ─────────────────────────────────────────────────────────
    public Map<String, Object> getVariables() {
        Map<String, Object> result = new LinkedHashMap<>();
        variableRepo.findAll().forEach(v -> {
            Map<String, String> info = new LinkedHashMap<>();
            info.put("variableName", v.getVariableName());
            info.put("dataType",     v.getDataType());
            info.put("source",       v.getSource());
            if (v.getDescription() != null) info.put("description", v.getDescription());
            result.put(v.getVariableName(), info);
        });
        return result;
    }

    // ── TRANSLATE API ─────────────────────────────────────────────────────────
    public Map<String, Object> translateDescription(String ruleId, String description) {
        SpelExpressionTranslator.TranslationResult r = spelTranslator.translate(ruleId, description);
        Map<String, Object> resp = new LinkedHashMap<>();
        resp.put("ruleId",              ruleId);
        resp.put("originalDescription", description);
        resp.put("spelExpression",      r.spelExpression);
        resp.put("precondition",        r.precondition);
        resp.put("result",              r.result);
        resp.put("translated",          r.translated);
        resp.put("translationNote",     r.description);
        if (r.error != null) resp.put("error", r.error);
        return resp;
    }

    // ── HELPERS ───────────────────────────────────────────────────────────────

    private List<String> validate(RuleSaveRequest request) {
        List<String> errors = new ArrayList<>();
        if (request == null) { errors.add("Request cannot be null"); return errors; }
        if ((request.getRulesByGroup() == null || request.getRulesByGroup().isEmpty())
            && (request.getCutoffs() == null || request.getCutoffs().isEmpty())) {
            errors.add("At least one of rulesByGroup or cutoffs must be provided");
        }
        if (request.getRulesByGroup() != null) {
            request.getRulesByGroup().forEach((group, rules) -> {
                if (rules == null) return;
                rules.forEach(rule -> {
                    if (rule.getRuleId() == null || rule.getRuleId().isBlank())
                        errors.add("Rule in group " + group + " is missing ruleId");
                    if ((rule.getCondition() == null || rule.getCondition().isBlank())
                        && (rule.getDescription() == null || rule.getDescription().isBlank()))
                        errors.add("Rule '" + rule.getRuleId() + "': either condition or description must be provided");
                });
            });
        }
        return errors;
    }

    private String buildCompiledJson(String groupName,
                                     List<RuleSaveRequest.RuleDefinition> rules) throws Exception {
        Map<String, Object> compiled = new LinkedHashMap<>();
        compiled.put("groupName",   groupName);
        compiled.put("compiledAt",  LocalDateTime.now().toString());

        List<Map<String, Object>> compiledRules = new ArrayList<>();
        for (RuleSaveRequest.RuleDefinition rule : rules) {
            Map<String, Object> cr = new LinkedHashMap<>();
            cr.put("ruleId",           rule.getRuleId());
            cr.put("enabled",          rule.getEnabled());
            cr.put("tags",             rule.getTags());
            cr.put("thirdPartySources",rule.getThirdPartySources());
            cr.put("spelExpression",   rule.getCondition());
            cr.put("precondition",     rule.getPrecondition());
            cr.put("result",           rule.getResult());
            cr.put("exceptionHandling",rule.getExceptionHandling());
            cr.put("spelTranslated",   rule.isSpelTranslated());
            cr.put("translationNote",  rule.getTranslationNote());

            // Build effectiveRuleByChannel map
            Map<String, Object> channelMap = new LinkedHashMap<>();
            channelMap.put("DEFAULT", Map.of(
                "condition",        rule.getCondition() != null ? rule.getCondition() : "",
                "precondition",     rule.getPrecondition() != null ? rule.getPrecondition() : "",
                "result",           rule.getResult() != null ? rule.getResult() : "",
                "exceptionHandling",rule.getExceptionHandling() != null ? rule.getExceptionHandling() : ""
            ));
            if (rule.getChannelOverrides() != null) {
                for (RuleSaveRequest.ChannelOverride co : rule.getChannelOverrides()) {
                    channelMap.put(co.getChannel(), Map.of(
                        "condition",    co.getCondition() != null ? co.getCondition() : "",
                        "precondition", co.getPrecondition() != null ? co.getPrecondition() : ""
                    ));
                }
            }
            cr.put("effectiveRuleByChannel", channelMap);
            compiledRules.add(cr);
        }
        compiled.put("rules", compiledRules);
        return objectMapper.writeValueAsString(compiled);
    }

    private Map<String, CompiledRuleGroup> loadCompiledGroups() {
        if (activeBatchId != null && !compiledGroupsCache.isEmpty()) return compiledGroupsCache;
        // DB fallback
        ruleBundleRepo.findByIsActiveTrue().forEach(snap -> {
            try {
                List<RuleSaveRequest.RuleDefinition> rules = objectMapper.readValue(
                    snap.getRawJson(), new TypeReference<>() {});
                compiledGroupsCache.put(snap.getGroupName(),
                    new CompiledRuleGroup(snap.getGroupName(), rules, snap.getCompiledJson()));
            } catch (Exception e) {
                log.warn("Failed to deserialise group {} from DB", snap.getGroupName());
            }
        });
        activeBatchId = ruleBundleRepo.findActiveBatchId().orElse(null);
        return compiledGroupsCache;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> loadCutoffs() {
        if (!cutoffGroupsCache.isEmpty()) return cutoffGroupsCache;
        cutoffRepo.findByIsActiveTrue().forEach(snap -> {
            try {
                Map<String, Object> cutoffs = objectMapper.readValue(snap.getRawJson(), Map.class);
                cutoffGroupsCache.putAll(cutoffs);
            } catch (Exception e) { log.warn("Failed to load cutoffs from DB"); }
        });
        return cutoffGroupsCache;
    }

    @SuppressWarnings("unchecked")
    private void resolveCutoffs(Map<String, Object> cutoffs,
                                Map<String, Object> facts,
                                Map<String, Object> enriched) {
        String grade   = str(facts, "de.creditGrade", facts.get("creditGrade"));
        String channel = str(facts, "channel", null);
        String state   = str(facts, "contact.state", facts.get("state"));
        String dimKey  = grade + "," + channel + "," + state;

        cutoffs.forEach((name, def) -> {
            if (def instanceof Map) {
                Map<String, Object> dm = (Map<String, Object>) def;
                Object val = dm.get(dimKey);
                if (val == null) val = dm.get(grade);
                if (val == null) val = dm.values().stream().findFirst().orElse(null);
                enriched.put(name, val);
            }
        });
    }

    private String str(Map<String, Object> m, String key, Object fallback) {
        Object v = m.get(key);
        return v != null ? String.valueOf(v) : (fallback != null ? String.valueOf(fallback) : "");
    }

    /** Simplified SpEL evaluation — real impl uses Spring ExpressionParser */
    private TriState evaluateCondition(String condition, Map<String, Object> facts) {
        if (condition == null || condition.startsWith("/*")) return TriState.UNKNOWN;
        try {
            if (condition.contains("tu.noHit == true")
                    && Boolean.TRUE.equals(facts.get("tu.noHit"))) return TriState.TRUE;
            if (condition.contains(">= 650")) {
                Object s = facts.get("tu.vantageScore");
                return (s instanceof Number && ((Number)s).intValue() >= 650) ? TriState.TRUE : TriState.FALSE;
            }
            if (condition.contains("< 500")) {
                Object s = facts.get("tu.vantageScore");
                return (s instanceof Number && ((Number)s).intValue() < 500) ? TriState.TRUE : TriState.FALSE;
            }
            return TriState.FALSE;
        } catch (Exception e) { return TriState.UNKNOWN; }
    }

    private String sha256(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] h = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder();
            for (byte b : h) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception e) { return ""; }
    }

    enum TriState { TRUE, FALSE, UNKNOWN }

    record CompiledRuleGroup(String groupName,
                             List<RuleSaveRequest.RuleDefinition> rules,
                             String compiledJson) {}
}
