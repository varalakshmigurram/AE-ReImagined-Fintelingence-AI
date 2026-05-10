package com.adf.ruleengine.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import java.time.LocalDateTime;

@Entity
@Table(name = "ae_rules",
       uniqueConstraints = @UniqueConstraint(columnNames = {"rule_id", "environment"}, name = "uk_rule_env"))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Rule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, name = "rule_id")
    private String ruleId; // e.g. AE_INVALID_STATE

    @Column(nullable = false)
    private String ruleNumber; // e.g. 1, 2a, b1

    @Column(nullable = false, length = 2000)
    private String description;

    @Column(nullable = false)
    private String applicableSegment; // All, QS, ML, etc.

    @Column
    private String cutoffs; // e.g. "500" or "cutoff1=42000, cutoff2=540"

    @Column
    private String applyPercentage; // X% of leads

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private RulePhase phase; // BEFORE_DATA_PULL, TU_PULL, POST_TU

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private RuleStatus status; // ACTIVE, INACTIVE, DRAFT

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private Environment environment; // TEST, PROD

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private ApprovalStatus approvalStatus; // DRAFT, PENDING_REVIEW, APPROVED, REJECTED

    @Column
    private String submittedBy;

    @Column
    private String reviewedBy;

    @Column
    private String approvedBy;

    @Column
    private String rejectionReason;

    @Column
    private LocalDateTime createdAt;

    @Column
    private LocalDateTime updatedAt;

    @Column
    private LocalDateTime approvedAt;

    @Column(length = 5000)
    private String previousSnapshot; // JSON of previous version for diff

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum RulePhase {
        BEFORE_DATA_PULL, TU_PULL, CCR_PULL, POST_CREDIT_GRADE, CREDIT_GRADE, OFFER_LOGIC
    }

    public enum RuleStatus {
        ACTIVE, INACTIVE, DRAFT
    }

    public enum Environment {
        TEST, PROD
    }

    public enum ApprovalStatus {
        DRAFT, PENDING_REVIEW, APPROVED, REJECTED
    }
}
