package com.adf.ruleengine.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import java.time.LocalDateTime;

@Entity
@Table(name = "channel_constraints",
       uniqueConstraints = @UniqueConstraint(columnNames = {"channel_code", "environment"}, name = "uk_channel_env"))
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChannelConstraint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 20, name = "channel_code")
    private String channelCode; // CMPQ, CKPQ, QS, LT, ML, MO, CMACT

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
    private String suppressedState;

    @Column
    private String campaign;

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
