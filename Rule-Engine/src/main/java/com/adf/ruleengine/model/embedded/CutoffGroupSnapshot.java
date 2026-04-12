package com.adf.ruleengine.model.embedded;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "cutoff_group_snapshot",
    indexes = {
        @Index(name = "idx_cutoff_group_active", columnList = "is_active"),
        @Index(name = "idx_cutoff_group_batch", columnList = "batch_id")
    })
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class CutoffGroupSnapshot {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "batch_id", nullable = false, length = 36)
    private String batchId;

    @Column(name = "raw_json", nullable = false, columnDefinition = "LONGTEXT")
    private String rawJson;

    @Column(name = "change_details", columnDefinition = "LONGTEXT")
    private String changeDetails;

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
