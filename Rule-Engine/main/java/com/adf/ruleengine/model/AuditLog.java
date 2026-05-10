package com.adf.ruleengine.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import java.time.LocalDateTime;

@Entity
@Table(name = "audit_log")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String entityType; // RULE, STATE_CONSTRAINT, CHANNEL_CONSTRAINT

    @Column(nullable = false)
    private String entityId;

    @Column(nullable = false)
    private String action; // CREATED, UPDATED, SUBMITTED_FOR_REVIEW, APPROVED, REJECTED, PROMOTED

    @Column(nullable = false)
    private String performedBy;

    @Column(length = 5000)
    private String beforeSnapshot; // JSON

    @Column(length = 5000)
    private String afterSnapshot; // JSON

    @Column
    private String comments;

    @Column(nullable = false)
    private LocalDateTime timestamp;

    @PrePersist
    protected void onCreate() {
        timestamp = LocalDateTime.now();
    }
}
