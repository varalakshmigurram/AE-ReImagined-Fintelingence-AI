package com.adf.ruleengine.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import java.time.LocalDateTime;

@Entity
@Table(name = "state_constraints",
       uniqueConstraints = @UniqueConstraint(columnNames = {"state_code", "environment"}, name = "uk_state_env"))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StateConstraint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 10, name = "state_code")
    private String stateCode; // AK, FL, TX...

    @Column(nullable = false)
    private Double minLoanAmount;

    @Column(nullable = false)
    private Double maxLoanAmount;

    @Column(nullable = false)
    private Double minApr;

    @Column(nullable = false)
    private Double maxApr;

    @Column(nullable = false)
    private Integer minTermMonths;

    @Column(nullable = false)
    private Integer maxTermMonths;

    @Column
    private Double maxOriginationFee;

    @Column
    private Double maxOriginationFeePercentage;

    @Column
    private String stateOnOff; // ON/OFF/null

    @Column(length = 500)
    private String originationFeeLogic;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private Rule.ApprovalStatus approvalStatus;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private Rule.Environment environment;

    @Column
    private String submittedBy;

    @Column
    private String approvedBy;

    @Column(length = 4000)
    private String previousSnapshot;

    @Column
    private LocalDateTime createdAt;

    @Column
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
