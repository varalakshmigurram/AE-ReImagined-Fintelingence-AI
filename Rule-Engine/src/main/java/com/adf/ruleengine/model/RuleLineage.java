package com.adf.ruleengine.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

/**
 * Tracks the provenance of every rule change back to its source Excel document,
 * ingestion session, and analyst decision. Powers the Lineage Tracer feature.
 */
@Entity
@Table(name = "rule_lineage",
       indexes = @Index(columnList = "rule_id"))
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class RuleLineage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** FK to ae_rules.id */
    @Column(nullable = false, name = "rule_id")
    private Long ruleId;

    /** The ruleId string (e.g. AE_PTSMI) for easy filtering */
    @Column(nullable = false, name = "rule_id_str")
    private String ruleIdStr;

    /** SEED | CUTOFF_CHANGE | OPERATOR_CHANGE | SEGMENT_CHANGE | PROMOTED | APPROVED */
    @Column(nullable = false, name = "change_type")
    private String changeType;

    @Column(nullable = false, name = "performed_by")
    private String performedBy;

    @Column(name = "session_id")
    private String sessionId;

    /** Source Excel filename, e.g. "AE_Sample_Spec_10_.xlsx" */
    @Column(name = "source_file")
    private String sourceFile;

    @Column(name = "source_sheet")
    private String sourceSheet;

    @Column(name = "source_row")
    private Integer sourceRow;

    /** Column name in the spec (e.g. "Cutoffs", "yellow-highlighted cell") */
    @Column(name = "source_col")
    private String sourceCol;

    @Column(name = "value_before", length = 1000)
    private String valueBefore;

    @Column(name = "value_after", length = 1000)
    private String valueAfter;

    @Column(length = 2000)
    private String description;

    @Column(nullable = false, name = "changed_at")
    private LocalDateTime changedAt;

    @PrePersist
    protected void onCreate() {
        if (changedAt == null) changedAt = LocalDateTime.now();
    }
}
