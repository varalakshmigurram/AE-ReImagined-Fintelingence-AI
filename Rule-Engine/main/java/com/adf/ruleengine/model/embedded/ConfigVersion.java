package com.adf.ruleengine.model.embedded;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Flyway-style versioned master config registry.
 *
 * Each config change must declare a unique semantic version (x.y.z).
 * The system rejects uploads with duplicate versions, preventing collision
 * when multiple analysts work in parallel — similar to Flyway's V1__desc.sql pattern.
 *
 * Version semantics:
 *   x — Major: requires code change (new model mapping, new adjuster type)
 *   y — Minor: can go to prod directly (value updates, structural changes)
 *   z — Patch: QA/testing only, not for production promotion
 */
@Entity
@Table(name = "config_version_registry",
    uniqueConstraints = @UniqueConstraint(
        name = "uq_config_version", columnNames = {"version", "config_scope"}))
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class ConfigVersion {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Semantic version string e.g. "1.2.3" */
    @Column(nullable = false, length = 32)
    private String version;

    /**
     * Scope of this versioned config.
     * RULES = rule bundle snapshot scope
     * OFFER_CONFIG = Excel offer config scope
     * CUTOFFS = cutoff group scope
     * MASTER = full combined snapshot
     */
    @Column(name = "config_scope", nullable = false, length = 32)
    @Enumerated(EnumType.STRING)
    private ConfigScope configScope;

    /** The batchId this version maps to */
    @Column(name = "batch_id", nullable = false, length = 36)
    private String batchId;

    /** Human-readable description of what changed in this version */
    @Column(name = "description", nullable = false, length = 500)
    private String description;

    /** State of this version in the promotion lifecycle */
    @Column(name = "status", nullable = false, length = 20)
    @Enumerated(EnumType.STRING)
    private VersionStatus status;

    /** Environment this version is active in */
    @Column(name = "environment", nullable = false, length = 10)
    @Enumerated(EnumType.STRING)
    private VersionEnvironment environment;

    @Column(name = "created_by", length = 64)
    private String createdBy;

    @Column(name = "approved_by", length = 64)
    private String approvedBy;

    @Column(name = "promoted_by", length = 64)
    private String promotedBy;

    @Column(name = "checksum", length = 64)
    private String checksum;

    /** JSON snapshot of the full config at this version for rollback */
    @Column(name = "config_snapshot", columnDefinition = "LONGTEXT")
    private String configSnapshot;

    @Column(name = "change_notes", columnDefinition = "TEXT")
    private String changeNotes;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "promoted_at")
    private LocalDateTime promotedAt;

    @Column(name = "is_current")
    @Builder.Default
    private Boolean isCurrent = false;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }

    public enum ConfigScope {
        RULES, OFFER_CONFIG, CUTOFFS, MASTER
    }

    public enum VersionStatus {
        DRAFT,           // Created, not yet submitted
        PENDING_REVIEW,  // Submitted for review
        APPROVED,        // Approved, ready to promote
        PROMOTED,        // Live in target environment
        REJECTED,        // Rejected — must create new version
        ROLLED_BACK      // Superseded by rollback
    }

    public enum VersionEnvironment {
        TEST, PROD
    }
}
