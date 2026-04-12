package com.adf.ruleengine.controller.embedded;

import com.adf.ruleengine.service.excel.UWExcelIngestionService;
import com.adf.ruleengine.service.excel.UWExcelIngestionService.*;
import com.adf.ruleengine.service.embedded.EmbeddedRuleEngineService;
import com.adf.ruleengine.dto.embedded.RuleSaveRequest;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/uw-ingestion")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
public class UWIngestionController {

    private final UWExcelIngestionService ingestionService;
    private final EmbeddedRuleEngineService ruleEngineService;
    private final ObjectMapper objectMapper;

    // In-memory session store for ingestion results (production: use Redis/DB)
    private final Map<String, UWIngestionResult> sessionStore = new LinkedHashMap<>();

    /** Upload and parse UW Excel spec — returns full analysis with change suggestions */
    @PostMapping(value = "/parse", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> parseExcel(
            @RequestParam("file") MultipartFile file) throws Exception {
        log.info("UW Excel ingestion started: {}", file.getOriginalFilename());

        UWIngestionResult result = ingestionService.ingest(file);

        // Store result for later acceptance
        String sessionId = UUID.randomUUID().toString();
        sessionStore.put(sessionId, result);

        // Build response (serialize carefully — avoid sending huge raw lists)
        Map<String, Object> response = buildResponse(sessionId, result);
        return ResponseEntity.ok(response);
    }

    /** Accept a specific change suggestion and apply it to the engine */
    @PostMapping("/{sessionId}/accept/{suggestionIndex}")
    public ResponseEntity<Map<String, Object>> acceptSuggestion(
            @PathVariable String sessionId,
            @PathVariable int suggestionIndex,
            @RequestParam(defaultValue = "1.0.0") String targetVersion,
            @RequestParam(defaultValue = "uw-analyst") String appliedBy) {

        UWIngestionResult result = sessionStore.get(sessionId);
        if (result == null) return ResponseEntity.notFound().build();

        List<ChangeSuggestion> suggestions = result.getChangeSuggestions();
        if (suggestionIndex < 0 || suggestionIndex >= suggestions.size()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid suggestion index"));
        }

        ChangeSuggestion suggestion = suggestions.get(suggestionIndex);
        Map<String, Object> applyResult = applySuggestion(suggestion, targetVersion, appliedBy);

        return ResponseEntity.ok(applyResult);
    }

    /** Accept all HIGH severity suggestions in one batch */
    @PostMapping("/{sessionId}/accept-all")
    public ResponseEntity<Map<String, Object>> acceptAll(
            @PathVariable String sessionId,
            @RequestParam(required = false) String severity,
            @RequestParam(defaultValue = "1.0.0") String targetVersion,
            @RequestParam(defaultValue = "uw-analyst") String appliedBy) {

        UWIngestionResult result = sessionStore.get(sessionId);
        if (result == null) return ResponseEntity.notFound().build();

        List<ChangeSuggestion> toApply = result.getChangeSuggestions().stream()
            .filter(s -> severity == null || s.getSeverity().name().equalsIgnoreCase(severity))
            .collect(Collectors.toList());

        List<Map<String, Object>> applied = new ArrayList<>();
        List<String> errors = new ArrayList<>();

        for (ChangeSuggestion suggestion : toApply) {
            try {
                Map<String, Object> applyResult = applySuggestion(suggestion, targetVersion, appliedBy);
                applied.add(applyResult);
            } catch (Exception e) {
                errors.add(suggestion.getRuleId() + ": " + e.getMessage());
            }
        }

        return ResponseEntity.ok(Map.of(
            "totalAccepted", applied.size(),
            "errors", errors,
            "results", applied
        ));
    }

    /** Reject a specific suggestion (mark as dismissed) */
    @PostMapping("/{sessionId}/reject/{suggestionIndex}")
    public ResponseEntity<Map<String, Object>> rejectSuggestion(
            @PathVariable String sessionId,
            @PathVariable int suggestionIndex,
            @RequestBody(required = false) Map<String, String> body) {

        UWIngestionResult result = sessionStore.get(sessionId);
        if (result == null) return ResponseEntity.notFound().build();

        List<ChangeSuggestion> suggestions = result.getChangeSuggestions();
        if (suggestionIndex >= 0 && suggestionIndex < suggestions.size()) {
            suggestions.get(suggestionIndex).setRejected(true);
        }

        return ResponseEntity.ok(Map.of("dismissed", true, "index", suggestionIndex));
    }

    /** Get current session result */
    @GetMapping("/{sessionId}")
    public ResponseEntity<Map<String, Object>> getSession(@PathVariable String sessionId) {
        UWIngestionResult result = sessionStore.get(sessionId);
        if (result == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(buildResponse(sessionId, result));
    }

    // ─── Apply a suggestion to the engine ────────────────────────────────────
    @SuppressWarnings("unchecked")
    private Map<String, Object> applySuggestion(ChangeSuggestion suggestion, String version, String by) {
        Map<String, Object> payload = suggestion.getSuggestedPayload();
        if (payload == null) {
            return Map.of("applied", false, "reason", "No payload available for this suggestion type");
        }

        String action = String.valueOf(payload.get("action"));

        return switch (action) {
            case "UPDATE_CONDITION" -> {
                // Build a minimal rule update request
                String ruleId = suggestion.getRuleId();
                String newCondition = String.valueOf(payload.get("newCondition"));
                RuleSaveRequest req = buildConditionUpdateRequest(ruleId, newCondition, version, by);
                var saveResp = ruleEngineService.saveRules(req);
                yield Map.of("applied", saveResp.isSuccess(), "batchId", String.valueOf(saveResp.getBatchId()),
                    "action", action, "ruleId", ruleId, "newCondition", newCondition);
            }
            case "DISABLE_RULE" -> {
                String ruleId = suggestion.getRuleId();
                yield Map.of("applied", true, "action", "DISABLE_RULE", "ruleId", ruleId,
                    "note", "Rule marked disabled in next save cycle — apply via Rule Builder");
            }
            case "ADD_RULE" -> {
                Map<String, Object> ruleDef = (Map<String, Object>) payload.get("ruleDefinition");
                yield Map.of("applied", true, "action", "ADD_RULE", "ruleDef", ruleDef,
                    "note", "Rule definition ready — open Rule Builder to finalize and save");
            }
            case "RENAME_VARIABLE" -> {
                yield Map.of("applied", true, "action", "RENAME_VARIABLE",
                    "from", payload.get("from"), "to", payload.get("to"),
                    "note", "Variable rename staged — update variable registry and affected conditions");
            }
            case "UPDATE_TAGS" -> {
                yield Map.of("applied", true, "action", "UPDATE_TAGS",
                    "ruleId", suggestion.getRuleId(), "newTags", payload.get("tags"));
            }
            case "ADD_CHANNEL_OVERRIDES" -> {
                yield Map.of("applied", true, "action", "ADD_CHANNEL_OVERRIDES",
                    "ruleId", suggestion.getRuleId(), "overrides", payload.get("channelOverrides"),
                    "note", "Channel overrides ready — open Rule Builder to finalize");
            }
            default -> Map.of("applied", false, "reason", "Unknown action: " + action);
        };
    }

    private RuleSaveRequest buildConditionUpdateRequest(String ruleId, String newCondition, String version, String by) {
        RuleSaveRequest.RuleDefinition def = RuleSaveRequest.RuleDefinition.builder()
            .ruleId(ruleId).condition(newCondition).result("HARD")
            .exceptionHandling("MARK_ERROR").enabled(true)
            .tags(List.of("ELIGIBLE_FOR_JGW")).build();

        return RuleSaveRequest.builder()
            .version(version).createdBy(by)
            .versionDescription("Applied UW spec change for " + ruleId)
            .rulesByGroup(Map.of("CREDIT", List.of(def)))
            .build();
    }

    private Map<String, Object> buildResponse(String sessionId, UWIngestionResult result) {
        List<Map<String, Object>> suggestionDtos = new ArrayList<>();
        int idx = 0;
        for (ChangeSuggestion s : result.getChangeSuggestions()) {
            Map<String, Object> dto = new LinkedHashMap<>();
            dto.put("index",       idx++);
            dto.put("type",        s.getType());
            dto.put("severity",    s.getSeverity());
            dto.put("ruleId",      s.getRuleId());
            dto.put("subRule",     s.getSubRule());
            dto.put("section",     s.getSection());
            dto.put("title",       s.getTitle());
            dto.put("description", s.getDescription());
            dto.put("currentEngineValue", s.getCurrentEngineValue());
            dto.put("excelValue",  s.getExcelValue());
            dto.put("excelCutoff", s.getExcelCutoff());
            dto.put("excelSegment",s.getExcelSegment());
            dto.put("excelRow",    s.getExcelRow());
            dto.put("source",      s.getSource());
            dto.put("payload",     s.getSuggestedPayload());
            dto.put("accepted",    s.isAccepted());
            dto.put("rejected",    s.isRejected());
            suggestionDtos.add(dto);
        }

        List<Map<String, Object>> yellowDtos = result.getYellowHighlightedRows().stream()
            .map(r -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("excelRow",    r.getExcelRow());
                m.put("ruleId",      r.getEffectiveRuleId());
                m.put("subRule",     r.getSubRule());
                m.put("section",     r.getSection());
                m.put("description", r.getDescription());
                m.put("segment",     r.getSegment());
                m.put("cutoff",      r.getCutoff());
                m.put("highlightedColumns", new ArrayList<>(r.getCellColors().keySet()));
                return m;
            }).collect(Collectors.toList());

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("sessionId",        sessionId);
        summary.put("sourceFilename",   result.getSourceFilename());
        summary.put("totalRulesParsed", result.getTotalRulesParsed());
        summary.put("yellowRows",       result.getYellowHighlightedRows().size());
        summary.put("greyedOutRows",    result.getGreyedOutRows().size());
        summary.put("redRows",          result.getRedHighlightedRows().size());
        summary.put("totalSuggestions", result.getChangeSuggestions().size());
        summary.put("highSeverity",     result.getChangeSuggestions().stream().filter(s -> s.getSeverity() == UWExcelIngestionService.Severity.HIGH).count());
        summary.put("mediumSeverity",   result.getChangeSuggestions().stream().filter(s -> s.getSeverity() == UWExcelIngestionService.Severity.MEDIUM).count());
        summary.put("lowSeverity",      result.getChangeSuggestions().stream().filter(s -> s.getSeverity() == UWExcelIngestionService.Severity.LOW).count());
        summary.put("engineState",      result.getEngineStateSummary());

        return Map.of(
            "summary",     summary,
            "yellowRows",  yellowDtos,
            "suggestions", suggestionDtos
        );
    }
}
