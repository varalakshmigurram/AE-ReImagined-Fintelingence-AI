package com.adf.ruleengine.dto;

import com.adf.ruleengine.model.Rule;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import java.time.LocalDateTime;

public class RuleDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Request {
        private String ruleId;
        private String ruleNumber;
        private String description;
        private String applicableSegment;
        private String cutoffs;
        private String applyPercentage;
        private Rule.RulePhase phase;
        private Rule.RuleStatus status;
        private Rule.Environment environment;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Response {
        private Long id;
        private String ruleId;
        private String ruleNumber;
        private String description;
        private String applicableSegment;
        private String cutoffs;
        private String applyPercentage;
        private Rule.RulePhase phase;
        private Rule.RuleStatus status;
        private Rule.Environment environment;
        private Rule.ApprovalStatus approvalStatus;
        private String submittedBy;
        private String reviewedBy;
        private String approvedBy;
        private String rejectionReason;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private LocalDateTime approvedAt;
        private String previousSnapshot;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReviewRequest {
        private String action; // APPROVE or REJECT
        private String comments;
        private String reviewer;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PromoteRequest {
        private String promotedBy;
    }
}
