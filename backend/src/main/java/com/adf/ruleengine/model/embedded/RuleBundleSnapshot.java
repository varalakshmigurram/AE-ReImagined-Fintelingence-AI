package com.adf.ruleengine.model.embedded;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "rule_bundle_snapshot",
    uniqueConstraints = @UniqueConstraint(columnNames = {"batch_id", "group_name"}),
    indexes = @Index(name = "idx_rule_bundle_active", columnList = "is_active"))
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class RuleBundleSnapshot {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "batch_id", nullable = false, length = 36)
    private String batchId;

    @Column(name = "group_name", nullable = false, length = 64)
    private String groupName;

    @Column(name = "filter_by_providers", nullable = false)
    @Builder.Default
    private Boolean filterByProviders = true;

    @Column(name = "raw_json", nullable = false, columnDefinition = "LONGTEXT")
    private String rawJson;

    @Column(name = "compiled_json", nullable = false, columnDefinition = "LONGTEXT")
    private String compiledJson;

    @Column(name = "checksum", nullable = false, length = 64)
    private String checksum;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }
}
