package com.adf.ruleengine.controller.embedded;

import com.adf.ruleengine.model.embedded.ConfigVersion;
import com.adf.ruleengine.service.embedded.ConfigVersionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/config-versions")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
public class ConfigVersionController {

    private final ConfigVersionService versionService;

    /** List all versions (optionally filtered by scope) */
    @GetMapping
    public List<ConfigVersion> getAllVersions(
            @RequestParam(required = false) ConfigVersion.ConfigScope scope) {
        return scope != null
            ? versionService.getVersionHistory(scope)
            : versionService.getAllVersions();
    }

    /** List all pending-review versions */
    @GetMapping("/pending")
    public List<ConfigVersion> getPending() {
        return versionService.getPendingReviews();
    }

    /** Get current active version for a scope */
    @GetMapping("/current")
    public ResponseEntity<ConfigVersion> getCurrent(
            @RequestParam ConfigVersion.ConfigScope scope) {
        return versionService.getCurrentVersion(scope)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.noContent().build());
    }

    /** Check if a version string is available (collision detection) */
    @GetMapping("/validate")
    public Map<String, Object> validateVersion(
            @RequestParam String version,
            @RequestParam ConfigVersion.ConfigScope scope) {
        return versionService.validateVersion(version, scope);
    }

    /** Submit a draft version for review */
    @PostMapping("/{id}/submit")
    public ResponseEntity<ConfigVersion> submit(
            @PathVariable Long id,
            @RequestParam(defaultValue = "analyst") String submittedBy) {
        return ResponseEntity.ok(versionService.submitForReview(id, submittedBy));
    }

    /** Approve a pending-review version */
    @PostMapping("/{id}/approve")
    public ResponseEntity<ConfigVersion> approve(
            @PathVariable Long id,
            @RequestParam(defaultValue = "manager") String approvedBy,
            @RequestBody(required = false) Map<String, String> body) {
        String notes = body != null ? body.get("notes") : null;
        return ResponseEntity.ok(versionService.approve(id, approvedBy, notes));
    }

    /** Reject a pending-review version */
    @PostMapping("/{id}/reject")
    public ResponseEntity<ConfigVersion> reject(
            @PathVariable Long id,
            @RequestParam(defaultValue = "manager") String rejectedBy,
            @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(versionService.reject(id, rejectedBy, body.get("reason")));
    }

    /** Promote an approved TEST version to PROD */
    @PostMapping("/{id}/promote")
    public ResponseEntity<ConfigVersion> promote(
            @PathVariable Long id,
            @RequestParam(defaultValue = "manager") String promotedBy) {
        return ResponseEntity.ok(versionService.promoteToProduction(id, promotedBy));
    }

    /** Rollback PROD to a specific previous version */
    @PostMapping("/{id}/rollback")
    public ResponseEntity<ConfigVersion> rollback(
            @PathVariable Long id,
            @RequestParam(defaultValue = "manager") String rolledBackBy) {
        return ResponseEntity.ok(versionService.rollback(id, rolledBackBy));
    }

    /** Global error handler for version conflicts */
    @ExceptionHandler(ConfigVersionService.VersionException.class)
    public ResponseEntity<Map<String, String>> handleVersionError(ConfigVersionService.VersionException e) {
        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
}
