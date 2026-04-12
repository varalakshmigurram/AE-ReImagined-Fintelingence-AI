package com.adf.ruleengine.service.excel;

import com.adf.ruleengine.model.embedded.EmbeddedVariableRegistry;
import com.adf.ruleengine.repository.embedded.EmbeddedVariableRegistryRepository;
import com.adf.ruleengine.repository.embedded.RuleBundleSnapshotRepository;
import com.adf.ruleengine.repository.RuleRepository;
import com.adf.ruleengine.model.Rule;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.*;
import java.util.stream.Collectors;

/**
 * UW Excel Ingestion Engine.
 *
 * Pipeline:
 *   1. Parse Rules sheet — extract all rules with sub-rule variants
 *   2. Detect highlighted cells (Yellow = needs attention, Red = warning, Grey = disabled)
 *   3. Cross-reference each highlighted rule with current engine config (variable registry + active bundle)
 *   4. Run AI suggestion engine — produces typed change suggestions for each delta found
 *
 * Change suggestion types:
 *   - FIELD_RENAME        e.g. v11AdfModelScore → v11MarketModelScore
 *   - CUTOFF_CHANGE       e.g. 500 → 600
 *   - OPERATOR_CHANGE     e.g. < → <=
 *   - ADD_RULE            new rule found in Excel but missing in engine
 *   - REMOVE_RULE         rule greyed-out in Excel, still active in engine
 *   - TAG_MODIFY          tag addition/removal e.g. ELIGIBLE_FOR_JGW
 *   - CHANNEL_EXTENSION   new channel override needed
 *   - CONDITION_REWRITE   full condition change
 *   - SEGMENT_CHANGE      applicable segment changed
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class UWExcelIngestionService {

    private final RuleBundleSnapshotRepository ruleBundleRepo;
    private final RuleRepository ruleRepository;
    private final EmbeddedVariableRegistryRepository variableRepo;
    private final ObjectMapper objectMapper;

    // Color constants
    private static final String YELLOW  = "FFFFFF00";
    private static final String RED     = "FFFF0000";
    private static final String BLUE_HDR = "FFBDD7EE";
    private static final String DARK_RED = "FFC00000"; // "greyout" equivalent in this workbook

    // ─── Main entry point ─────────────────────────────────────────────────────
    public UWIngestionResult ingest(MultipartFile file) throws Exception {
        try (InputStream is = file.getInputStream();
             Workbook wb = new XSSFWorkbook(is)) {

            Sheet rulesSheet = wb.getSheet("Rules");
            if (rulesSheet == null) throw new RuntimeException("'Rules' sheet not found in uploaded Excel");

            // 1. Parse all rows
            List<ExcelRuleRow> allRows = parseRulesSheet(rulesSheet);

            // 2. Separate by highlight type
            List<ExcelRuleRow> yellowRows  = allRows.stream().filter(r -> r.hasColor(YELLOW)).collect(Collectors.toList());
            List<ExcelRuleRow> redRows     = allRows.stream().filter(r -> r.hasColor(RED)).collect(Collectors.toList());
            List<ExcelRuleRow> greyedRows  = allRows.stream().filter(r -> r.hasColor(DARK_RED)).collect(Collectors.toList());
            List<ExcelRuleRow> normalRows  = allRows.stream().filter(r -> r.isPrimaryRule() && !r.isAnyHighlighted()).collect(Collectors.toList());

            // 3. Load current engine state
            Map<String, Object> engineState = loadCurrentEngineState();
            List<EmbeddedVariableRegistry> variables = variableRepo.findAll();
            Map<String, String> varNameMap = variables.stream()
                .collect(Collectors.toMap(EmbeddedVariableRegistry::getVariableName, EmbeddedVariableRegistry::getVariableName, (a,b)->a));

            // 4. Generate change suggestions
            List<ChangeSuggestion> suggestions = generateSuggestions(
                yellowRows, redRows, greyedRows, normalRows, engineState, varNameMap);

            // 5. Build result
            return UWIngestionResult.builder()
                .sourceFilename(file.getOriginalFilename())
                .totalRulesParsed(allRows.stream().filter(ExcelRuleRow::isPrimaryRule).map(r -> r.ruleId).filter(s -> !s.isBlank()).collect(Collectors.toSet()).size())
                .allExtractedRules(allRows)
                .yellowHighlightedRows(yellowRows)
                .redHighlightedRows(redRows)
                .greyedOutRows(greyedRows)
                .changeSuggestions(suggestions)
                .engineStateSummary(buildEngineSummary(engineState))
                .build();
        }
    }

    // ─── Parse Rules sheet ────────────────────────────────────────────────────
    private List<ExcelRuleRow> parseRulesSheet(Sheet ws) {
        List<ExcelRuleRow> rows = new ArrayList<>();
        String currentSection = "Before Data Pull";
        String currentRuleId  = "";

        for (int rowIdx = 0; rowIdx <= ws.getLastRowNum(); rowIdx++) {
            Row row = ws.getRow(rowIdx);
            if (row == null) continue;

            String b = cellStr(row, 1); // B
            String c = cellStr(row, 2); // C
            String d = cellStr(row, 3); // D
            String e = cellStr(row, 4); // E
            String f = cellStr(row, 5); // F
            String g = cellStr(row, 6); // G
            String h = cellStr(row, 7); // H

            String bColor = cellColor(row, 1);
            String cColor = cellColor(row, 2);
            String dColor = cellColor(row, 3);
            String eColor = cellColor(row, 4);
            String fColor = cellColor(row, 5);
            String gColor = cellColor(row, 6);

            // Section header
            if (BLUE_HDR.equals(bColor) && !b.isBlank()) {
                currentSection = b;
                continue;
            }

            // Skip empty rows
            if (c.isBlank() && d.isBlank() && h.isBlank()) continue;

            // Track current primary rule
            if (h.startsWith("AE_")) currentRuleId = h;

            Map<String, String> cellColors = new LinkedHashMap<>();
            if (!cColor.isBlank()) cellColors.put("C", cColor);
            if (!dColor.isBlank()) cellColors.put("D", dColor);
            if (!eColor.isBlank()) cellColors.put("E", eColor);
            if (!fColor.isBlank()) cellColors.put("F", fColor);
            if (!gColor.isBlank()) cellColors.put("G", gColor);

            ExcelRuleRow ruleRow = ExcelRuleRow.builder()
                .excelRow(rowIdx + 1)
                .section(currentSection)
                .subRule(c)
                .description(d)
                .segment(e)
                .cutoff(f)
                .applyPercent(g)
                .ruleId(h.startsWith("AE_") ? h : "")
                .parentRuleId(h.startsWith("AE_") ? h : currentRuleId)
                .cellColors(cellColors)
                .build();

            rows.add(ruleRow);
        }
        return rows;
    }

    // ─── AI Change Suggestion Engine ─────────────────────────────────────────
    @SuppressWarnings("unchecked")
    private List<ChangeSuggestion> generateSuggestions(
            List<ExcelRuleRow> yellowRows,
            List<ExcelRuleRow> redRows,
            List<ExcelRuleRow> greyedRows,
            List<ExcelRuleRow> normalRows,
            Map<String, Object> engineState,
            Map<String, String> varNameMap) {
        // Cross-check: any highlighted rule missing from the ae_rules (Rules Config tab)?
        for (ExcelRuleRow row : yellowRows) {
            String ruleId = row.getEffectiveRuleId();
            if (!isRuleInConfigTable(ruleId, engineState)) {
                log.warn("Rule {} is yellow in UW spec but NOT found in ae_rules config table", ruleId);
            }
        }

        List<ChangeSuggestion> suggestions = new ArrayList<>();

        // Get active rules from engine (from compiled JSON)
        Map<String, Object> activeRules = (Map<String, Object>) engineState.getOrDefault("activeRulesByGroup", Map.of());

        // ── Analyse each yellow row ──────────────────────────────────────────
        for (ExcelRuleRow row : yellowRows) {
            String ruleId = row.getEffectiveRuleId();

            // Find this rule in the current engine config
            Map<String, Object> engineRule = findRuleInEngine(ruleId, activeRules);

            if (engineRule == null) {
                // Rule is in Excel (yellow = needs attention) but NOT in engine → ADD suggestion
                suggestions.add(ChangeSuggestion.builder()
                    .type(ChangeType.ADD_RULE)
                    .severity(Severity.HIGH)
                    .ruleId(ruleId)
                    .subRule(row.subRule)
                    .section(row.section)
                    .title("New rule found in UW spec — not in engine")
                    .description("Rule " + ruleId + " (sub-rule " + row.subRule + ") is highlighted in the UW spec but has no corresponding entry in the rule engine. It needs to be added.")
                    .excelValue(row.description)
                    .excelCutoff(row.cutoff)
                    .excelSegment(row.segment)
                    .suggestedPayload(buildAddRulePayload(row))
                    .source(SuggestionSource.YELLOW_HIGHLIGHT)
                    .excelRow(row.excelRow)
                    .build());
                continue;
            }

            String engineCondition = String.valueOf(engineRule.getOrDefault("condition", ""));
            String engineCutoff    = extractCutoffFromCondition(engineCondition);

            // ── Cutoff change detection ──────────────────────────────────────
            if (!row.cutoff.isBlank()) {
                String excelCutoff = parseCutoffValue(row.cutoff);
                if (!excelCutoff.isBlank() && !excelCutoff.equals(engineCutoff)) {
                    suggestions.add(ChangeSuggestion.builder()
                        .type(ChangeType.CUTOFF_CHANGE)
                        .severity(Severity.HIGH)
                        .ruleId(ruleId)
                        .subRule(row.subRule)
                        .section(row.section)
                        .title("Cutoff value change: " + engineCutoff + " → " + excelCutoff)
                        .description("UW team has updated the cutoff for rule " + ruleId + " from " + engineCutoff + " to " + excelCutoff + " in the Excel spec (highlighted yellow).")
                        .currentEngineValue(engineCutoff)
                        .excelValue(excelCutoff)
                        .excelCutoff(row.cutoff)
                        .excelSegment(row.segment)
                        .suggestedPayload(buildCutoffChangePayload(ruleId, engineCondition, engineCutoff, excelCutoff))
                        .source(SuggestionSource.YELLOW_HIGHLIGHT)
                        .excelRow(row.excelRow)
                        .build());
                }
            }

            // ── Operator change detection (< vs <=, > vs >=) ─────────────────
            if (!row.description.isBlank()) {
                String excelOp   = extractOperator(row.description);
                String engineOp  = extractOperator(engineCondition);
                if (!excelOp.isBlank() && !engineOp.isBlank() && !excelOp.equals(engineOp)) {
                    suggestions.add(ChangeSuggestion.builder()
                        .type(ChangeType.OPERATOR_CHANGE)
                        .severity(Severity.HIGH)
                        .ruleId(ruleId)
                        .subRule(row.subRule)
                        .section(row.section)
                        .title("Operator change: \"" + engineOp + "\" → \"" + excelOp + "\"")
                        .description("The condition operator for " + ruleId + " has changed in the UW spec. Engine uses \"" + engineOp + "\", Excel spec says \"" + excelOp + "\".")
                        .currentEngineValue(engineOp)
                        .excelValue(excelOp)
                        .suggestedPayload(buildOperatorChangePayload(ruleId, engineCondition, engineOp, excelOp))
                        .source(SuggestionSource.YELLOW_HIGHLIGHT)
                        .excelRow(row.excelRow)
                        .build());
                }
            }

            // ── Segment change detection ──────────────────────────────────────
            if (!row.segment.isBlank()) {
                String engineSegment = String.valueOf(engineRule.getOrDefault("applicableSegment", ""));
                if (!engineSegment.isBlank() && !row.segment.equalsIgnoreCase(engineSegment)) {
                    suggestions.add(ChangeSuggestion.builder()
                        .type(ChangeType.SEGMENT_CHANGE)
                        .severity(Severity.MEDIUM)
                        .ruleId(ruleId)
                        .subRule(row.subRule)
                        .section(row.section)
                        .title("Segment change for " + ruleId)
                        .description("Applicable segment changed from \"" + engineSegment + "\" to \"" + row.segment + "\" in UW spec.")
                        .currentEngineValue(engineSegment)
                        .excelValue(row.segment)
                        .source(SuggestionSource.YELLOW_HIGHLIGHT)
                        .excelRow(row.excelRow)
                        .build());
                }
            }
        }

        // ── Greyed-out rows = candidate for REMOVE ───────────────────────────
        for (ExcelRuleRow row : greyedRows) {
            String ruleId = row.getEffectiveRuleId();
            Map<String, Object> engineRule = findRuleInEngine(ruleId, activeRules);
            if (engineRule != null) {
                suggestions.add(ChangeSuggestion.builder()
                    .type(ChangeType.REMOVE_RULE)
                    .severity(Severity.MEDIUM)
                    .ruleId(ruleId)
                    .subRule(row.subRule)
                    .section(row.section)
                    .title("Rule greyed-out in spec — disable in engine?")
                    .description("Row " + row.excelRow + " for " + ruleId + " is greyed-out/dark-red in the Excel spec, suggesting it may have been deprecated. The rule is still active in the engine.")
                    .currentEngineValue(String.valueOf(engineRule.getOrDefault("enabled", "true")))
                    .excelValue("disabled (greyed out)")
                    .suggestedPayload(buildDisableRulePayload(ruleId))
                    .source(SuggestionSource.GREYED_OUT)
                    .excelRow(row.excelRow)
                    .build());
            }
        }

        // ── Field rename suggestions (based on variable registry cross-reference) ─
        generateFieldRenameSuggestions(yellowRows, varNameMap, suggestions);

        // ── Tag modification suggestions ─────────────────────────────────────
        generateTagSuggestions(yellowRows, activeRules, suggestions);

        // ── Channel extension suggestions ────────────────────────────────────
        generateChannelExtensionSuggestions(yellowRows, activeRules, suggestions);

        // Sort by severity then rule ID
        suggestions.sort(Comparator.comparing((ChangeSuggestion s) -> s.severity.ordinal())
            .thenComparing(s -> s.ruleId));

        return suggestions;
    }

    private void generateFieldRenameSuggestions(List<ExcelRuleRow> rows, Map<String, String> varMap, List<ChangeSuggestion> out) {
        // Known field renames based on the Excel spec content vs variable registry
        Map<String, String> knownRenames = new LinkedHashMap<>();
        knownRenames.put("v11AdfModelScore", "v11MarketModelScore");
        knownRenames.put("V11_ADF_model_score", "V11_Market_model_score");
        knownRenames.put("V11_ADF_TU_model_score", "V11_Market_TU_model_score");
        knownRenames.put("V11_ADF_FT_model_score", "V11_Market_FT_model_score");

        for (ExcelRuleRow row : rows) {
            for (Map.Entry<String, String> rename : knownRenames.entrySet()) {
                if (row.description.toLowerCase().contains(rename.getValue().toLowerCase()) &&
                    !varMap.containsKey(rename.getValue().replace("V11_Market_", "v11Market"))) {
                    out.add(ChangeSuggestion.builder()
                        .type(ChangeType.FIELD_RENAME)
                        .severity(Severity.HIGH)
                        .ruleId(row.getEffectiveRuleId())
                        .subRule(row.subRule)
                        .section(row.section)
                        .title("Variable rename: " + rename.getKey() + " → " + rename.getValue())
                        .description("The UW spec references \"" + rename.getValue() + "\" but the variable registry has \"" + rename.getKey() + "\". The field name needs to be updated across all rules and the variable registry.")
                        .currentEngineValue(rename.getKey())
                        .excelValue(rename.getValue())
                        .suggestedPayload(buildFieldRenamePayload(rename.getKey(), rename.getValue()))
                        .source(SuggestionSource.VARIABLE_CROSS_REF)
                        .excelRow(row.excelRow)
                        .build());
                    break;
                }
            }
        }
    }

    private void generateTagSuggestions(List<ExcelRuleRow> rows, Map<String, Object> activeRules, List<ChangeSuggestion> out) {
        // Check if ELIGIBLE_FOR_JGW tag should be added/removed based on highlighted rows
        Set<String> eligibleRules = Set.of("AE_TUSOFT_CV_SCORE", "AE_TUSOFT_VANTAGE_SCORE", "AE_RISK_RULE");
        for (ExcelRuleRow row : rows) {
            String ruleId = row.getEffectiveRuleId();
            if (eligibleRules.contains(ruleId)) {
                Map<String, Object> engineRule = findRuleInEngine(ruleId, activeRules);
                if (engineRule != null) {
                    @SuppressWarnings("unchecked")
                    List<String> tags = (List<String>) engineRule.getOrDefault("tags", List.of());
                    if (!tags.contains("ELIGIBLE_FOR_JGW")) {
                        out.add(ChangeSuggestion.builder()
                            .type(ChangeType.TAG_MODIFY)
                            .severity(Severity.LOW)
                            .ruleId(ruleId)
                            .subRule(row.subRule)
                            .section(row.section)
                            .title("Add tag ELIGIBLE_FOR_JGW to " + ruleId)
                            .description("Based on the UW spec context, " + ruleId + " should carry the ELIGIBLE_FOR_JGW tag. Current tags: " + tags)
                            .currentEngineValue(String.join(", ", tags))
                            .excelValue("ELIGIBLE_FOR_JGW (add)")
                            .suggestedPayload(buildTagPayload(ruleId, tags, "ELIGIBLE_FOR_JGW", true))
                            .source(SuggestionSource.YELLOW_HIGHLIGHT)
                            .excelRow(row.excelRow)
                            .build());
                    }
                }
            }
        }
    }

    private void generateChannelExtensionSuggestions(List<ExcelRuleRow> rows, Map<String, Object> activeRules, List<ChangeSuggestion> out) {
        // Identify rows with channel-specific segments that differ from the primary rule
        Map<String, List<ExcelRuleRow>> byRule = rows.stream()
            .collect(Collectors.groupingBy(ExcelRuleRow::getEffectiveRuleId));

        for (Map.Entry<String, List<ExcelRuleRow>> entry : byRule.entrySet()) {
            List<ExcelRuleRow> variants = entry.getValue();
            if (variants.size() <= 1) continue;

            // Multiple yellow variants = channel overrides might be needed
            boolean hasChannelVariants = variants.stream()
                .anyMatch(r -> r.segment.toLowerCase().contains("channel in") ||
                               r.segment.toLowerCase().contains("ckpq") ||
                               r.segment.toLowerCase().contains("qs") ||
                               r.segment.toLowerCase().contains("lt") ||
                               r.segment.toLowerCase().contains("ml") ||
                               r.segment.toLowerCase().contains("mo"));

            if (hasChannelVariants) {
                out.add(ChangeSuggestion.builder()
                    .type(ChangeType.CHANNEL_EXTENSION)
                    .severity(Severity.MEDIUM)
                    .ruleId(entry.getKey())
                    .section(variants.get(0).section)
                    .title("Channel-specific overrides needed for " + entry.getKey())
                    .description(variants.size() + " channel variants highlighted in UW spec for " + entry.getKey() +
                        ". These need channel-specific cutoffs/conditions: " +
                        variants.stream().map(r -> r.segment + "=" + r.cutoff).collect(Collectors.joining("; ")))
                    .suggestedPayload(buildChannelOverridesPayload(entry.getKey(), variants))
                    .source(SuggestionSource.YELLOW_HIGHLIGHT)
                    .excelRow(variants.get(0).excelRow)
                    .build());
            }
        }
    }

    // ─── Payload builders ─────────────────────────────────────────────────────

    private Map<String, Object> buildAddRulePayload(ExcelRuleRow row) {
        Map<String, Object> rule = new LinkedHashMap<>();
        rule.put("ruleId", row.getEffectiveRuleId() + "_" + row.subRule.replaceAll("[^a-zA-Z0-9]", "_"));
        rule.put("description", row.description);
        rule.put("result", "HARD");
        rule.put("exceptionHandling", "MARK_ERROR");
        rule.put("enabled", true);
        rule.put("tags", List.of("ELIGIBLE_FOR_JGW"));
        rule.put("thirdPartySources", inferProviders(row.description));
        rule.put("applicableSegment", row.segment);
        if (!row.cutoff.isBlank()) rule.put("cutoffNote", row.cutoff);
        return Map.of("action", "ADD_RULE", "ruleDefinition", rule);
    }

    private Map<String, Object> buildCutoffChangePayload(String ruleId, String condition, String oldVal, String newVal) {
        String newCondition = condition.replace(oldVal, newVal);
        return Map.of("action", "UPDATE_CONDITION", "ruleId", ruleId,
            "oldCondition", condition, "newCondition", newCondition,
            "cutoffChange", Map.of("from", oldVal, "to", newVal));
    }

    private Map<String, Object> buildOperatorChangePayload(String ruleId, String condition, String oldOp, String newOp) {
        String newCondition = condition.replace(" " + oldOp + " ", " " + newOp + " ");
        return Map.of("action", "UPDATE_CONDITION", "ruleId", ruleId,
            "oldCondition", condition, "newCondition", newCondition,
            "operatorChange", Map.of("from", oldOp, "to", newOp));
    }

    private Map<String, Object> buildDisableRulePayload(String ruleId) {
        return Map.of("action", "DISABLE_RULE", "ruleId", ruleId, "enabled", false);
    }

    private Map<String, Object> buildFieldRenamePayload(String oldName, String newName) {
        return Map.of("action", "RENAME_VARIABLE", "from", oldName, "to", newName,
            "affectedScopes", List.of("variable_registry", "rule_conditions", "cutoff_keys"));
    }

    private Map<String, Object> buildTagPayload(String ruleId, List<String> current, String tag, boolean add) {
        List<String> newTags = new ArrayList<>(current);
        if (add && !newTags.contains(tag)) newTags.add(tag);
        else newTags.remove(tag);
        return Map.of("action", "UPDATE_TAGS", "ruleId", ruleId, "tags", newTags);
    }

    private Map<String, Object> buildChannelOverridesPayload(String ruleId, List<ExcelRuleRow> variants) {
        List<Map<String, Object>> overrides = variants.stream()
            .filter(r -> !r.cutoff.isBlank())
            .map(r -> (Map<String, Object>) (Map<String, ?>) Map.of("channel", inferChannel(r.segment), "segment", r.segment, "cutoff", r.cutoff))
            .toList();
        return Map.of("action", "ADD_CHANNEL_OVERRIDES", "ruleId", ruleId, "channelOverrides", overrides);
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    private String cellStr(Row row, int col) {
        Cell cell = row.getCell(col);
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING  -> cell.getStringCellValue().trim();
            case NUMERIC -> {
                double d = cell.getNumericCellValue();
                yield d == Math.floor(d) ? String.valueOf((long)d) : String.valueOf(d);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            default      -> "";
        };
    }

    private String cellColor(Row row, int col) {
        Cell cell = row.getCell(col);
        if (cell == null || cell.getCellType() == CellType.BLANK) return "";
        CellStyle style = cell.getCellStyle();
        if (style == null) return "";
        Color color = style.getFillForegroundColorColor();
        if (color instanceof org.apache.poi.xssf.usermodel.XSSFColor xc) {
            byte[] rgb = xc.getARGB();
            if (rgb != null && rgb.length == 4) {
                return String.format("%02X%02X%02X%02X", rgb[0]&0xFF, rgb[1]&0xFF, rgb[2]&0xFF, rgb[3]&0xFF);
            }
        }
        return "";
    }

    private String extractOperator(String text) {
        if (text.contains("<=")) return "<=";
        if (text.contains(">=")) return ">=";
        if (text.contains(" < ")) return "<";
        if (text.contains(" > ")) return ">";
        if (text.contains("==")) return "==";
        return "";
    }

    private String parseCutoffValue(String cutoffStr) {
        if (cutoffStr.isBlank()) return "";
        // Handle "Cutoff_1: 45" format
        if (cutoffStr.contains(":")) {
            String[] parts = cutoffStr.split("\n");
            if (parts.length > 0) {
                String first = parts[0].replaceAll("[^0-9.]", "").trim();
                return first;
            }
        }
        return cutoffStr.replaceAll("[^0-9.]", "").trim();
    }

    private String extractCutoffFromCondition(String condition) {
        // Extract numeric cutoff from condition like "tu.cvScore < 500"
        String[] tokens = condition.split("\\s+");
        for (int i = 0; i < tokens.length; i++) {
            if (tokens[i].matches("[0-9]+\\.?[0-9]*")) return tokens[i];
        }
        return "";
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> findRuleInEngine(String ruleId, Map<String, Object> activeRules) {
        for (Object groupObj : activeRules.values()) {
            if (groupObj instanceof List<?> rules) {
                for (Object rObj : rules) {
                    if (rObj instanceof Map<?,?> rule) {
                        if (ruleId.equals(rule.get("ruleId"))) return (Map<String,Object>) rule;
                    }
                }
            }
        }
        return null;
    }

    /** Check if a rule ID exists in the ae_rules config table (Rules tab) */
    private boolean isRuleInConfigTable(String ruleId, Map<String, Object> engineState) {
        @SuppressWarnings("unchecked")
        Map<String, String> configIds = (Map<String, String>) engineState.getOrDefault("configRuleIds", Map.of());
        return configIds.containsKey(ruleId);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> loadCurrentEngineState() {
        Map<String, Object> state = new LinkedHashMap<>();
        Map<String, Object> rulesByGroup = new LinkedHashMap<>();

        ruleBundleRepo.findByIsActiveTrue().forEach(snap -> {
            try {
                List<Object> rules = objectMapper.readValue(snap.getRawJson(), List.class);
                rulesByGroup.put(snap.getGroupName(), rules);
            } catch (Exception e) { log.warn("Failed to load group {}", snap.getGroupName()); }
        });

        // Also load from ae_rules config table (the Rules tab) to cross-check
        List<Rule> configRules = ruleRepository.findAll();
        Map<String, String> configRuleIds = new LinkedHashMap<>();
        for (Rule r : configRules) {
            configRuleIds.put(r.getRuleId(), r.getApprovalStatus().name());
        }

        state.put("activeRulesByGroup", rulesByGroup);
        state.put("activeBatchId", ruleBundleRepo.findActiveBatchId().orElse("none"));
        state.put("configRuleIds", configRuleIds);   // ruleId -> approvalStatus from ae_rules table
        state.put("configRuleCount", configRules.size());
        return state;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> buildEngineSummary(Map<String, Object> engineState) {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("activeBatchId", engineState.get("activeBatchId"));
        Map<String, Object> groups = (Map<String, Object>) engineState.getOrDefault("activeRulesByGroup", Map.of());
        summary.put("groupCount", groups.size());
        summary.put("groups", new ArrayList<>(groups.keySet()));
        long totalRules = groups.values().stream()
            .mapToLong(g -> g instanceof List ? ((List<?>)g).size() : 0).sum();
        summary.put("totalActiveRules", totalRules);
        // Include config table rule IDs so frontend can cross-check
        Map<String, String> configIds = (Map<String, String>) engineState.getOrDefault("configRuleIds", Map.of());
        summary.put("configTableRuleCount", configIds.size());
        summary.put("configTableRuleIds", new ArrayList<>(configIds.keySet()));
        summary.put("configTableStatuses", configIds);
        return summary;
    }

    private List<String> inferProviders(String description) {
        List<String> providers = new ArrayList<>();
        String lower = description.toLowerCase();
        if (lower.contains("tu") || lower.contains("vantage") || lower.contains("cv score") || lower.contains("g106s") || lower.contains("at02s")) providers.add("tu");
        if (lower.contains("ccr") || lower.contains("ccr_score")) providers.add("ccr");
        if (lower.contains("clarity") || lower.contains("fraud score")) providers.add("clarity");
        return providers;
    }

    private String inferChannel(String segment) {
        if (segment.contains("CKPQ")) return "CKPQ";
        if (segment.contains("QS")) return "QS";
        if (segment.contains("LT")) return "LT";
        if (segment.contains("ML")) return "ML";
        if (segment.contains("MO")) return "MO";
        return "DEFAULT";
    }

    // ─── DTOs ─────────────────────────────────────────────────────────────────

    @lombok.Data @lombok.Builder
    public static class ExcelRuleRow {
        private int excelRow;
        private String section;
        private String subRule;
        private String description;
        private String segment;
        private String cutoff;
        private String applyPercent;
        private String ruleId;
        private String parentRuleId;
        private Map<String, String> cellColors;

        public String getEffectiveRuleId() {
            return (ruleId != null && !ruleId.isBlank()) ? ruleId : (parentRuleId != null ? parentRuleId : "UNKNOWN");
        }

        public boolean isPrimaryRule() { return ruleId != null && ruleId.startsWith("AE_"); }

        public boolean hasColor(String colorCode) {
            return cellColors != null && cellColors.values().stream()
                .anyMatch(c -> colorCode.equalsIgnoreCase(c));
        }

        public boolean isAnyHighlighted() {
            return cellColors != null && !cellColors.isEmpty() &&
                cellColors.values().stream().noneMatch(c -> "00000000".equals(c) || "FFFFFFFF".equals(c));
        }
    }

    @lombok.Data @lombok.Builder
    public static class ChangeSuggestion {
        private ChangeType type;
        private Severity severity;
        private String ruleId;
        private String subRule;
        private String section;
        private String title;
        private String description;
        private String currentEngineValue;
        private String excelValue;
        private String excelCutoff;
        private String excelSegment;
        private Map<String, Object> suggestedPayload;
        private SuggestionSource source;
        private int excelRow;
        private boolean accepted;
        private boolean rejected;
    }

    @lombok.Data @lombok.Builder @lombok.NoArgsConstructor @lombok.AllArgsConstructor
    public static class UWIngestionResult {
        private String sourceFilename;
        private int totalRulesParsed;
        private List<ExcelRuleRow> allExtractedRules;
        private List<ExcelRuleRow> yellowHighlightedRows;
        private List<ExcelRuleRow> redHighlightedRows;
        private List<ExcelRuleRow> greyedOutRows;
        private List<ChangeSuggestion> changeSuggestions;
        private Map<String, Object> engineStateSummary;
    }

    public enum ChangeType {
        FIELD_RENAME, CUTOFF_CHANGE, OPERATOR_CHANGE,
        ADD_RULE, REMOVE_RULE, TAG_MODIFY,
        CHANNEL_EXTENSION, CONDITION_REWRITE, SEGMENT_CHANGE
    }

    public enum Severity { HIGH, MEDIUM, LOW }

    public enum SuggestionSource {
        YELLOW_HIGHLIGHT, RED_HIGHLIGHT, GREYED_OUT, VARIABLE_CROSS_REF, AI_INFERENCE
    }
}
