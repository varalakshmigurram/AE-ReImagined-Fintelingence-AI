package com.adf.ruleengine.dto.embedded;

import lombok.*;
import java.util.List;
import java.util.Map;

/**
 * Root request object for the Embedded Rule Engine save/validate APIs.
 * Contains rule groups (keyed by group name) and multi-dimensional cutoffs.
 *
 * version is REQUIRED for save — follows semantic versioning x.y.z.
 * Duplicate versions within the same scope are rejected (Flyway-style collision detection).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RuleSaveRequest {

    /** Semantic version string — REQUIRED for save (e.g. "1.2.3") */
    private String version;

    /** Who is making this change */
    private String createdBy;

    /** Human-readable description of what this version changes */
    private String versionDescription;

    private Map<String, List<RuleDefinition>> rulesByGroup;
    private Map<String, Map<String, Object>> cutoffs;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class RuleDefinition {
        private String ruleId;
        /** Natural language description — auto-translated to expression if condition is absent */
        private String description;
        private String precondition;
        /** Expression condition. Auto-populated from description if blank. */
        private String condition;
        /** HARD | PASS | PEND | SPECIAL */
        private String result;
        /** MARK_ERROR | MARK_TRUE | MARK_FALSE | MARK_SKIP */
        private String exceptionHandling;
        private List<String> tags;
        private Boolean enabled;
        /** Third-party data sources required (tu, ccr, clarity). Rules skipped if provider unavailable. */
        private List<String> thirdPartySources;
        private List<ChannelOverride> channelOverrides;
        /** Set to true when condition was auto-generated from natural language builder */
        private boolean spelTranslated;
        private String translationNote;
        /** Structured natural language expression parts (from the 3-popup builder) */
        private NaturalLanguageExpression naturalLanguageExpression;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ChannelOverride {
        private String channel;
        private String condition;
        private String precondition;
    }

    /**
     * Structured representation of a rule built using the natural language popup builder.
     * Stored alongside the compiled condition for auditability and re-editing.
     */
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class NaturalLanguageExpression {
        /** The selected variable (e.g. {source:"tu", name:"vantageScore", dataType:"INTEGER"}) */
        private String variableSource;
        private String variableName;
        private String variableDataType;
        private String variableDisplayName;

        /** The selected operator (e.g. "LESS_THAN", "GREATER_THAN", "EQUALS", "IN_LIST") */
        private String operator;
        private String operatorLabel;

        /** The value(s) to compare against */
        private String value;
        private String valueType; // LITERAL, CUTOFF_REF, VARIABLE_REF

        /** Logical connector for chaining (AND/OR) */
        private String connector;

        /** The human-readable sentence this builds */
        private String humanReadable;
    }
}
