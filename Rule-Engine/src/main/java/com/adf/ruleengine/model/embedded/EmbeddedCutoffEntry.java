package com.adf.ruleengine.model.embedded;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Individual cutoff row stored in the database.
 * Each row = one dimension key + value combination so we can:
 *  - Query what's in production by creditGrade/channel/state
 *  - Diff before/after saves
 *  - Show a "what's in prod" table in the UI
 */
@Entity
@Table(name = "embedded_cutoff_entry",
    indexes = {
        @Index(name = "idx_cutoff_entry_group", columnList = "group_name"),
        @Index(name = "idx_cutoff_entry_active", columnList = "is_active"),
        @Index(name = "idx_cutoff_entry_batch",  columnList = "batch_id"),
        @Index(name = "idx_cutoff_entry_env",    columnList = "environment")
    })
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class EmbeddedCutoffEntry {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "batch_id", nullable = false, length = 36)
    private String batchId;

    /** e.g. cvScoreCutoff, fraudScoreCutoff */
    @Column(name = "group_name", nullable = false, length = 128)
    private String groupName;

    /** Dimension combination key e.g. "A1,CKPQ,TX" */
    @Column(name = "dimension_key", nullable = false, length = 256)
    private String dimensionKey;

    /** Credit grade part of the dimension key */
    @Column(name = "credit_grade", length = 8)
    private String creditGrade;

    /** Channel code part of the dimension key */
    @Column(name = "channel_code", length = 16)
    private String channelCode;

    /** State code part of the dimension key */
    @Column(name = "state_code", length = 8)
    private String stateCode;

    /** The actual cutoff value */
    @Column(name = "cutoff_value", nullable = false)
    private Double cutoffValue;

    /** TEST or PROD */
    @Column(name = "environment", nullable = false, length = 8)
    @Builder.Default
    private String environment = "TEST";

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "saved_by", length = 64)
    private String savedBy;

    /** Previous value for change tracking */
    @Column(name = "previous_value")
    private Double previousValue;

    /** Whether this row changed from the previous save */
    @Column(name = "is_changed")
    @Builder.Default
    private Boolean isChanged = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); updatedAt = LocalDateTime.now(); }

    @PreUpdate
    protected void onUpdate() { updatedAt = LocalDateTime.now(); }
}
