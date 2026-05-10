package com.adf.ruleengine.controller;

import com.adf.ruleengine.model.Rule;
import com.adf.ruleengine.model.RuleLineage;
import com.adf.ruleengine.repository.RuleLineageRepository;
import com.adf.ruleengine.repository.RuleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/lineage")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
public class LineageController {

    private final RuleLineageRepository lineageRepo;
    private final RuleRepository ruleRepo;

    /** GET /api/lineage/{ruleId} — full lineage for a rule (by DB id) */
    @GetMapping("/{ruleId}")
    public List<RuleLineage> getByRuleId(@PathVariable Long ruleId) {
        // If no lineage exists yet, auto-create a seed event
        List<RuleLineage> existing = lineageRepo.findByRuleIdOrderByChangedAtAsc(ruleId);
        if (existing.isEmpty()) {
            return ruleRepo.findById(ruleId).map(rule -> {
                RuleLineage seed = RuleLineage.builder()
                        .ruleId(rule.getId())
                        .ruleIdStr(rule.getRuleId())
                        .changeType("SEED")
                        .performedBy("system-seed")
                        .sessionId("SEED_2025_Q1")
                        .sourceFile("AE_Sample_Spec_v8.xlsx")
                        .sourceSheet("Rules")
                        .sourceRow(null)
                        .sourceCol("Initial load")
                        .valueBefore(null)
                        .valueAfter(rule.getCutoffs())
                        .description("Initial rule seeded from AE spec — " + rule.getRuleId())
                        .changedAt(rule.getCreatedAt() != null ? rule.getCreatedAt() : LocalDateTime.now())
                        .build();
                lineageRepo.save(seed);
                return List.of(seed);
            }).orElse(List.of());
        }
        return existing;
    }

    /** GET /api/lineage/str/{ruleIdStr} — lineage by rule string ID (e.g. AE_PTSMI) */
    @GetMapping("/str/{ruleIdStr}")
    public List<RuleLineage> getByRuleIdStr(@PathVariable String ruleIdStr) {
        return lineageRepo.findByRuleIdStrOrderByChangedAtAsc(ruleIdStr);
    }

    /** POST /api/lineage — record a new lineage event */
    @PostMapping
    public ResponseEntity<RuleLineage> record(@RequestBody RuleLineage entry) {
        entry.setChangedAt(LocalDateTime.now());
        return ResponseEntity.ok(lineageRepo.save(entry));
    }

    /**
     * GET /api/lineage/conflicts — lightweight conflict scan over all active rules.
     * Returns a list of detected conflict objects (no new model needed — plain Maps).
     */
    @GetMapping("/conflicts")
    public List<Map<String, Object>> scanConflicts() {
        List<Rule> allRules = ruleRepo.findAll();
        List<Map<String, Object>> conflicts = new ArrayList<>();

        // Group rules by ruleId
        Map<String, List<Rule>> byRuleId = allRules.stream()
                .filter(r -> r.getRuleId() != null)
                .collect(Collectors.groupingBy(Rule::getRuleId));

        for (Map.Entry<String, List<Rule>> entry : byRuleId.entrySet()) {
            String ruleId = entry.getKey();
            List<Rule> group = entry.getValue();
            if (group.size() < 2) continue;

            // Extract cutoff values
            Set<String> cutoffs = group.stream()
                    .map(r -> r.getCutoffs() != null ? r.getCutoffs().trim() : "null")
                    .collect(Collectors.toSet());

            if (cutoffs.size() > 1) {
                Map<String, Object> c = new LinkedHashMap<>();
                c.put("id", "CUTOFF_" + ruleId);
                c.put("type", "CUTOFF_MISMATCH");
                c.put("severity", "HIGH");
                c.put("title", "Cutoff mismatch — " + ruleId);
                c.put("description", ruleId + " has " + group.size()
                        + " definitions with different cutoff values: " + String.join(", ", cutoffs));
                c.put("rules", group.stream().map(r -> Map.of(
                        "id", r.getId(), "ruleId", r.getRuleId(),
                        "segment", r.getApplicableSegment() != null ? r.getApplicableSegment() : "ALL",
                        "cutoff", r.getCutoffs() != null ? r.getCutoffs() : "N/A",
                        "environment", r.getEnvironment().name()
                )).collect(Collectors.toList()));
                c.put("recommendation",
                        "Review if different cutoffs are intentional per segment, "
                        + "or consolidate into one rule with segment-specific overrides.");
                conflicts.add(c);
            }

            // Check ALL-segment vs channel-specific with different cutoffs
            List<Rule> allSegment = group.stream()
                    .filter(r -> "All".equalsIgnoreCase(r.getApplicableSegment())
                            || "ALL".equalsIgnoreCase(r.getApplicableSegment()))
                    .collect(Collectors.toList());
            List<Rule> channelSpecific = group.stream()
                    .filter(r -> r.getApplicableSegment() != null
                            && !r.getApplicableSegment().equalsIgnoreCase("All")
                            && !r.getApplicableSegment().equalsIgnoreCase("ALL"))
                    .collect(Collectors.toList());

            if (!allSegment.isEmpty() && !channelSpecific.isEmpty()) {
                String allCutoff = allSegment.get(0).getCutoffs() != null ? allSegment.get(0).getCutoffs().trim() : "null";
                boolean hasDiff = channelSpecific.stream()
                        .anyMatch(r -> !allCutoff.equals(r.getCutoffs() != null ? r.getCutoffs().trim() : "null"));
                if (hasDiff) {
                    Map<String, Object> c = new LinkedHashMap<>();
                    c.put("id", "SEGMENT_ALL_" + ruleId);
                    c.put("type", "SEGMENT_OVERRIDE");
                    c.put("severity", "MEDIUM");
                    c.put("title", "ALL-segment rule overridden by channel-specific variant — " + ruleId);
                    c.put("description", ruleId + " applies to ALL with cutoff " + allCutoff
                            + " but channel-specific variants exist with different cutoffs.");
                    c.put("rules", group.stream().map(r -> Map.of(
                            "id", r.getId(), "ruleId", r.getRuleId(),
                            "segment", r.getApplicableSegment() != null ? r.getApplicableSegment() : "ALL",
                            "cutoff", r.getCutoffs() != null ? r.getCutoffs() : "N/A"
                    )).collect(Collectors.toList()));
                    c.put("recommendation", "Verify execution priority between ALL and channel-specific variants.");
                    conflicts.add(c);
                }
            }
        }
        return conflicts;
    }
}
