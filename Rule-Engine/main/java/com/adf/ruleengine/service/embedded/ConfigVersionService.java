package com.adf.ruleengine.service.embedded;

import com.adf.ruleengine.model.embedded.ConfigVersion;
import com.adf.ruleengine.repository.embedded.ConfigVersionRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Pattern;

/**
 * Flyway-style versioned config management.
 *
 * Rules:
 * - Every save must declare a unique semantic version per scope
 * - Collision detection: rejects saves if version already exists in same scope
 * - Parallel-safe: multiple analysts can work on different versions simultaneously
 * - Promotion: TEST → PROD requires APPROVED status and no version conflict in PROD
 * - Rollback: promotes a previous PROMOTED version back to current
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ConfigVersionService {

    private static final Pattern SEMVER = Pattern.compile("^\\d+\\.\\d+\\.\\d+$");

    private final ConfigVersionRepository versionRepo;
    private final ObjectMapper objectMapper;

    // ── Register a new version (called by save pipeline) ─────────────────────
    @Transactional
    public ConfigVersion registerVersion(String version,
                                         ConfigVersion.ConfigScope scope,
                                         String batchId,
                                         String description,
                                         String createdBy,
                                         Object configSnapshot) {
        // 1. Validate semantic version format
        if (!SEMVER.matcher(version).matches()) {
            throw new VersionException("Invalid version format '" + version
                + "'. Must follow semantic versioning x.y.z (e.g. 1.2.3)");
        }

        // 2. Collision detection — reject if version already exists in this scope
        if (versionRepo.existsByVersionAndConfigScope(version, scope)) {
            ConfigVersion existing = versionRepo
                .findByVersionAndConfigScope(version, scope).orElseThrow();
            throw new VersionException(
                "Version " + version + " already exists in scope " + scope
                + " (created by " + existing.getCreatedBy()
                + " on " + existing.getCreatedAt()
                + ", status: " + existing.getStatus() + "). "
                + "Increment the version number to proceed."
            );
        }

        // 3. Build checksum
        String snapshotJson = toJson(configSnapshot);
        String checksum = sha256(snapshotJson);

        // 4. Create version record
        ConfigVersion cv = ConfigVersion.builder()
            .version(version)
            .configScope(scope)
            .batchId(batchId)
            .description(description)
            .status(ConfigVersion.VersionStatus.DRAFT)
            .environment(ConfigVersion.VersionEnvironment.TEST)
            .createdBy(createdBy)
            .checksum(checksum)
            .configSnapshot(snapshotJson)
            .isCurrent(false)
            .build();

        ConfigVersion saved = versionRepo.save(cv);
        log.info("Registered config version {} (scope={}, batchId={}, by={})",
            version, scope, batchId, createdBy);
        return saved;
    }

    // ── Submit for review ─────────────────────────────────────────────────────
    @Transactional
    public ConfigVersion submitForReview(Long versionId, String submittedBy) {
        ConfigVersion cv = getById(versionId);
        if (cv.getStatus() != ConfigVersion.VersionStatus.DRAFT
                && cv.getStatus() != ConfigVersion.VersionStatus.REJECTED) {
            throw new VersionException("Only DRAFT or REJECTED versions can be submitted for review");
        }
        cv.setStatus(ConfigVersion.VersionStatus.PENDING_REVIEW);
        cv.setChangeNotes("Submitted by " + submittedBy + " at " + LocalDateTime.now());
        return versionRepo.save(cv);
    }

    // ── Approve ───────────────────────────────────────────────────────────────
    @Transactional
    public ConfigVersion approve(Long versionId, String approvedBy, String notes) {
        ConfigVersion cv = getById(versionId);
        if (cv.getStatus() != ConfigVersion.VersionStatus.PENDING_REVIEW) {
            throw new VersionException("Only PENDING_REVIEW versions can be approved");
        }
        cv.setStatus(ConfigVersion.VersionStatus.APPROVED);
        cv.setApprovedBy(approvedBy);
        cv.setApprovedAt(LocalDateTime.now());
        if (notes != null) cv.setChangeNotes(notes);
        return versionRepo.save(cv);
    }

    // ── Reject ────────────────────────────────────────────────────────────────
    @Transactional
    public ConfigVersion reject(Long versionId, String rejectedBy, String reason) {
        ConfigVersion cv = getById(versionId);
        cv.setStatus(ConfigVersion.VersionStatus.REJECTED);
        cv.setChangeNotes("Rejected by " + rejectedBy + ": " + reason);
        return versionRepo.save(cv);
    }

    // ── Promote to PROD ───────────────────────────────────────────────────────
    @Transactional
    public ConfigVersion promoteToProduction(Long versionId, String promotedBy) {
        ConfigVersion cv = getById(versionId);

        if (cv.getStatus() != ConfigVersion.VersionStatus.APPROVED) {
            throw new VersionException("Only APPROVED versions can be promoted to production");
        }

        // Check no same version already in PROD
        boolean prodConflict = versionRepo
            .findByConfigScopeOrderByCreatedAtDesc(cv.getConfigScope())
            .stream()
            .anyMatch(v -> v.getVersion().equals(cv.getVersion())
                && v.getEnvironment() == ConfigVersion.VersionEnvironment.PROD
                && v.getStatus() == ConfigVersion.VersionStatus.PROMOTED);
        if (prodConflict) {
            throw new VersionException("Version " + cv.getVersion()
                + " is already PROMOTED in PROD for scope " + cv.getConfigScope());
        }

        // Mark previous PROD current as no longer current
        versionRepo.clearCurrentForScope(cv.getConfigScope());

        // Create PROD copy
        ConfigVersion prodVersion = ConfigVersion.builder()
            .version(cv.getVersion())
            .configScope(cv.getConfigScope())
            .batchId(cv.getBatchId())
            .description(cv.getDescription())
            .status(ConfigVersion.VersionStatus.PROMOTED)
            .environment(ConfigVersion.VersionEnvironment.PROD)
            .createdBy(cv.getCreatedBy())
            .approvedBy(cv.getApprovedBy())
            .promotedBy(promotedBy)
            .promotedAt(LocalDateTime.now())
            .checksum(cv.getChecksum())
            .configSnapshot(cv.getConfigSnapshot())
            .isCurrent(true)
            .build();

        ConfigVersion saved = versionRepo.save(prodVersion);

        // Mark original TEST version as promoted
        cv.setStatus(ConfigVersion.VersionStatus.PROMOTED);
        cv.setPromotedBy(promotedBy);
        cv.setPromotedAt(LocalDateTime.now());
        versionRepo.save(cv);

        log.info("Version {} (scope={}) promoted to PROD by {}", cv.getVersion(), cv.getConfigScope(), promotedBy);
        return saved;
    }

    // ── Rollback ──────────────────────────────────────────────────────────────
    @Transactional
    public ConfigVersion rollback(Long targetVersionId, String rolledBackBy) {
        ConfigVersion target = getById(targetVersionId);
        if (target.getStatus() != ConfigVersion.VersionStatus.PROMOTED
                || target.getEnvironment() != ConfigVersion.VersionEnvironment.PROD) {
            throw new VersionException("Rollback target must be a previously PROMOTED PROD version");
        }

        // Clear current
        versionRepo.clearCurrentForScope(target.getConfigScope());

        // Mark target as current again
        target.setIsCurrent(true);
        target.setChangeNotes("Rolled back by " + rolledBackBy + " at " + LocalDateTime.now());
        return versionRepo.save(target);
    }

    // ── Queries ───────────────────────────────────────────────────────────────
    public List<ConfigVersion> getVersionHistory(ConfigVersion.ConfigScope scope) {
        return versionRepo.findByConfigScopeOrderByCreatedAtDesc(scope);
    }

    public List<ConfigVersion> getAllVersions() {
        return versionRepo.findAll(org.springframework.data.domain.Sort.by("createdAt").descending());
    }

    public List<ConfigVersion> getPendingReviews() {
        return versionRepo.findAllPendingReview();
    }

    public Optional<ConfigVersion> getCurrentVersion(ConfigVersion.ConfigScope scope) {
        return versionRepo.findByConfigScopeAndIsCurrentTrue(scope);
    }

    public Map<String, Object> validateVersion(String version, ConfigVersion.ConfigScope scope) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("version", version);
        result.put("scope", scope);

        if (!SEMVER.matcher(version).matches()) {
            result.put("valid", false);
            result.put("error", "Must follow x.y.z semantic versioning");
            return result;
        }

        boolean exists = versionRepo.existsByVersionAndConfigScope(version, scope);
        result.put("valid", !exists);
        if (exists) {
            ConfigVersion cv = versionRepo.findByVersionAndConfigScope(version, scope).orElseThrow();
            result.put("error", "Version " + version + " already used by " + cv.getCreatedBy()
                + " (status: " + cv.getStatus() + ")");
            result.put("existing", Map.of(
                "createdBy", cv.getCreatedBy(),
                "status", cv.getStatus(),
                "createdAt", cv.getCreatedAt()
            ));
            // Suggest next version
            result.put("suggestedNext", suggestNext(version));
        }
        return result;
    }

    private String suggestNext(String version) {
        String[] parts = version.split("\\.");
        int patch = Integer.parseInt(parts[2]) + 1;
        return parts[0] + "." + parts[1] + "." + patch;
    }

    private ConfigVersion getById(Long id) {
        return versionRepo.findById(id)
            .orElseThrow(() -> new VersionException("Version not found: " + id));
    }

    private String toJson(Object o) {
        try { return objectMapper.writeValueAsString(o); } catch (Exception e) { return "{}"; }
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

    public static class VersionException extends RuntimeException {
        public VersionException(String msg) { super(msg); }
    }
}
