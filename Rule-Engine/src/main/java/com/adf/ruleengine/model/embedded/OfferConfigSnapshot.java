package com.adf.ruleengine.model.embedded;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "offer_config_snapshot")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class OfferConfigSnapshot {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "batch_id", nullable = false, length = 36)
    private String batchId;

    @Column(name = "strategy_version", nullable = false, length = 32)
    private String strategyVersion;

    @Column(name = "config_type", nullable = false, length = 64)
    // EXTERNAL_BAND, INTERNAL_BAND, IB_LOOKUP, CREDIT_GRADE_OFFER, TENOR_OPTIONS
    private String configType;

    @Column(name = "raw_json", nullable = false, columnDefinition = "LONGTEXT")
    private String rawJson;

    @Column(name = "checksum", length = 64)
    private String checksum;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private Boolean isActive = true;

    @Column(name = "uploaded_by", length = 64)
    private String uploadedBy;

    @Column(name = "source_filename", length = 256)
    private String sourceFilename;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }
}
