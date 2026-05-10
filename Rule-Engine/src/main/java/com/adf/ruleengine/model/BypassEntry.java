package com.adf.ruleengine.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "bypass_entries")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class BypassEntry {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** SHA-256 hash of the SSN — raw SSN is never stored */
    @Column(nullable = false, unique = true, name = "ssn_hash", length = 64)
    private String ssnHash;

    /** Last 4 digits only for display: "XXX-XX-1234" */
    @Column(nullable = false, name = "ssn_masked", length = 20)
    private String ssnMasked;

    @Column(nullable = false, name = "added_by")
    private String addedBy;

    @Column(nullable = false, name = "added_at")
    private LocalDateTime addedAt;

    @Column(length = 500)
    private String reason;

    @Column(nullable = false, name = "is_active")
    private Boolean isActive;

    @PrePersist
    protected void onCreate() {
        if (addedAt == null) addedAt = LocalDateTime.now();
        if (isActive == null) isActive = true;
    }
}
