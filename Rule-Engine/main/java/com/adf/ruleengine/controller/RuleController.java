package com.adf.ruleengine.controller;

import com.adf.ruleengine.dto.RuleDto;
import com.adf.ruleengine.model.AuditLog;
import com.adf.ruleengine.service.RuleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/rules")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
public class RuleController {

    private final RuleService ruleService;

    @GetMapping
    public List<RuleDto.Response> getAllRules(@RequestParam(required = false) String env) {
        return ruleService.getAllRules(env);
    }

    @GetMapping("/pending")
    public List<RuleDto.Response> getPendingReviews() {
        return ruleService.getPendingReviews();
    }

    @GetMapping("/{id}")
    public ResponseEntity<RuleDto.Response> getRule(@PathVariable Long id) {
        return ruleService.getRuleById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<RuleDto.Response> createRule(
            @RequestBody RuleDto.Request request,
            @RequestParam(defaultValue = "system") String user) {
        return ResponseEntity.ok(ruleService.createRule(request, user));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RuleDto.Response> updateRule(
            @PathVariable Long id,
            @RequestBody RuleDto.Request request,
            @RequestParam(defaultValue = "system") String user) {
        return ResponseEntity.ok(ruleService.updateRule(id, request, user));
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<RuleDto.Response> submitForReview(
            @PathVariable Long id,
            @RequestParam(defaultValue = "system") String user) {
        return ResponseEntity.ok(ruleService.submitForReview(id, user));
    }

    @PostMapping("/{id}/review")
    public ResponseEntity<RuleDto.Response> review(
            @PathVariable Long id,
            @RequestBody RuleDto.ReviewRequest reviewRequest) {
        return ResponseEntity.ok(ruleService.reviewRule(id, reviewRequest));
    }

    @PostMapping("/{id}/promote")
    public ResponseEntity<RuleDto.Response> promote(
            @PathVariable Long id,
            @RequestParam(defaultValue = "system") String promotedBy) {
        return ResponseEntity.ok(ruleService.promoteToProduction(id, promotedBy));
    }

    @GetMapping("/{id}/audit")
    public List<AuditLog> getAuditHistory(@PathVariable Long id) {
        return ruleService.getAuditHistory(id);
    }
}
