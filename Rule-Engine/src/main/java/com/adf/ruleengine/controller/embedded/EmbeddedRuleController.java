package com.adf.ruleengine.controller.embedded;

import com.adf.ruleengine.dto.RuleDto;
import com.adf.ruleengine.dto.embedded.*;
import com.adf.ruleengine.model.Rule;
import com.adf.ruleengine.model.embedded.RuleBundleSnapshot;
import com.adf.ruleengine.repository.RuleRepository;
import com.adf.ruleengine.repository.embedded.RuleBundleSnapshotRepository;
import com.adf.ruleengine.service.RuleService;
import com.adf.ruleengine.service.embedded.EmbeddedRuleEngineService;
import com.adf.ruleengine.service.embedded.OfferConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/embedded")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
public class EmbeddedRuleController {

    private final EmbeddedRuleEngineService ruleEngine;
    private final OfferConfigService        offerConfigService;
    private final RuleBundleSnapshotRepository ruleBundleRepo;
    private final RuleRepository            ruleRepository;
    private final RuleService               ruleService;

    /**
     * Save embedded rules.
     * Also mirrors each ruleId into the ae_rules (Rules Config tab) table so
     * the config management UI shows them, and UW ingestion cross-check works.
     * 
     * Frontend optimization: Returns structured response with success flag and detailed errors
     */
    @PostMapping("/rules/save")
    public ResponseEntity<RuleSaveResponse> saveRules(@RequestBody RuleSaveRequest request) {
        try {
            RuleSaveResponse response = ruleEngine.saveRules(request);

            // Mirror rule IDs to ae_rules config table so they appear in the Rules tab
            if (response.isSuccess() && request.getRulesByGroup() != null) {
                request.getRulesByGroup().forEach((groupName, rules) -> {
                    if (rules == null) return;
                    for (RuleSaveRequest.RuleDefinition def : rules) {
                        if (def.getRuleId() == null || def.getRuleId().isBlank()) continue;
                        try {
                            // Only create if not already present; otherwise update description
                            Optional<Rule> existing = ruleRepository.findByRuleIdAndEnvironment(def.getRuleId(), Rule.Environment.TEST);
                            if (existing.isEmpty()) {
                                RuleDto.Request ruleReq = RuleDto.Request.builder()
                                    .ruleId(def.getRuleId())
                                    .ruleNumber(groupName)
                                    .description(def.getDescription() != null ? def.getDescription() : def.getCondition())
                                    .applicableSegment("All")
                                    .cutoffs(extractCutoffHint(def.getCondition()))
                                    .phase(Rule.RulePhase.TU_PULL)
                                    .status(Rule.RuleStatus.ACTIVE)
                                    .environment(Rule.Environment.TEST)
                                    .build();
                                ruleService.createRule(ruleReq, request.getCreatedBy() != null ? request.getCreatedBy() : "rule-builder");
                                log.info("Mirrored embedded rule {} → ae_rules table", def.getRuleId());
                            } else {
                                // Update description if changed
                                Rule r = existing.get();
                                if (def.getDescription() != null && !def.getDescription().equals(r.getDescription())) {
                                    RuleDto.Request upd = RuleDto.Request.builder()
                                        .ruleId(r.getRuleId()).ruleNumber(r.getRuleNumber())
                                        .description(def.getDescription())
                                        .applicableSegment(r.getApplicableSegment())
                                        .cutoffs(extractCutoffHint(def.getCondition()))
                                        .phase(r.getPhase()).status(r.getStatus())
                                        .environment(r.getEnvironment()).build();
                                    ruleService.updateRule(r.getId(), upd, "rule-builder");
                                }
                            }
                        } catch (Exception e) {
                            log.warn("Could not mirror rule {} to ae_rules: {}", def.getRuleId(), e.getMessage());
                        }
                    }
                });
            }

            // Return appropriate HTTP status based on success
            return response.isSuccess() 
                ? ResponseEntity.ok(response)
                : ResponseEntity.badRequest().body(response);
                
        } catch (Exception e) {
            log.error("Unexpected error in saveRules", e);
            return ResponseEntity.internalServerError()
                .body(RuleSaveResponse.failed(List.of("Server error: " + e.getMessage())));
        }
    }

    @PostMapping("/rules/execute")
    public ResponseEntity<RuleExecuteResponse> execute(@RequestBody RuleExecuteRequest request) {
        return ResponseEntity.ok(ruleEngine.execute(request));
    }

    @PostMapping("/rules/validate")
    public ResponseEntity<RuleSaveResponse> validate(@RequestBody RuleSaveRequest request) {
        return ResponseEntity.ok(ruleEngine.validateOnly(request));
    }

    @GetMapping("/rules/variables")
    public ResponseEntity<Map<String, Object>> getVariables() {
        return ResponseEntity.ok(ruleEngine.getVariables());
    }

    @GetMapping("/rules/translate")
    public ResponseEntity<Map<String, Object>> translateDescription(
            @RequestParam String ruleId, @RequestParam String description) {
        return ResponseEntity.ok(ruleEngine.translateDescription(ruleId, description));
    }

    /** Batch history — grouped by batchId */
    @GetMapping("/rules/batches")
    public ResponseEntity<List<Map<String, Object>>> getBatchHistory() {
        Map<String, List<RuleBundleSnapshot>> byBatch = ruleBundleRepo.findAll().stream()
            .collect(Collectors.groupingBy(RuleBundleSnapshot::getBatchId));
        List<Map<String, Object>> result = byBatch.entrySet().stream().map(e -> {
            List<RuleBundleSnapshot> snaps = e.getValue();
            Map<String, Object> b = new LinkedHashMap<>();
            b.put("batchId",    e.getKey());
            b.put("isActive",   snaps.stream().anyMatch(s -> Boolean.TRUE.equals(s.getIsActive())));
            b.put("groups",     snaps.stream().map(RuleBundleSnapshot::getGroupName).collect(Collectors.toList()));
            b.put("totalRules", snaps.size());
            b.put("createdAt",  snaps.get(0).getCreatedAt());
            return b;
        }).sorted((a, b) -> {
            Object ca = a.get("createdAt"), cb = b.get("createdAt");
            return (ca == null || cb == null) ? 0 : cb.toString().compareTo(ca.toString());
        }).collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PostMapping(value = "/offer-config/load", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> loadOfferConfig(
            @RequestParam("file") MultipartFile file,
            @RequestParam(defaultValue = "system") String uploadedBy) throws Exception {
        return ResponseEntity.ok(offerConfigService.loadFromExcel(file, uploadedBy));
    }

    @GetMapping("/offer-config/active")
    public ResponseEntity<Map<String, Object>> getActiveOfferConfig() {
        return ResponseEntity.ok(offerConfigService.getActiveConfig());
    }

    /** Extract a cutoff hint from a condition string for display in the Rules tab */
    private String extractCutoffHint(String condition) {
        if (condition == null) return null;
        String[] tokens = condition.split("\\s+");
        for (String t : tokens) {
            if (t.matches("\\d+\\.?\\d*")) return t;
        }
        return null;
    }
}
