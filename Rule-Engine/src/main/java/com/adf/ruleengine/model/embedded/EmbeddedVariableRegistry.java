package com.adf.ruleengine.model.embedded;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "embedded_variable_registry")
@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class EmbeddedVariableRegistry {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "variable_name", nullable = false, length = 128)
    private String variableName;

    @Column(name = "data_type", nullable = false, length = 20)
    private String dataType; // INTEGER, BOOLEAN, STRING, DOUBLE

    @Column(name = "source", nullable = false, length = 64)
    private String source; // tu, ccr, de, contact, app

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() { createdAt = LocalDateTime.now(); }
}
