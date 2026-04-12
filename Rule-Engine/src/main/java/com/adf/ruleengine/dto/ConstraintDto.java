package com.adf.ruleengine.dto;

import com.adf.ruleengine.model.Rule;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;
import java.time.LocalDateTime;

public class ConstraintDto {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StateRequest {
        private String stateCode;
        private Double minLoanAmount;
        private Double maxLoanAmount;
        private Double minApr;
        private Double maxApr;
        private Integer minTermMonths;
        private Integer maxTermMonths;
        private Double maxOriginationFee;
        private Double maxOriginationFeePercentage;
        private String stateOnOff;
        private String originationFeeLogic;
        private Rule.Environment environment;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class StateResponse {
        private Long id;
        private String stateCode;
        private Double minLoanAmount;
        private Double maxLoanAmount;
        private Double minApr;
        private Double maxApr;
        private Integer minTermMonths;
        private Integer maxTermMonths;
        private Double maxOriginationFee;
        private Double maxOriginationFeePercentage;
        private String stateOnOff;
        private String originationFeeLogic;
        private Rule.ApprovalStatus approvalStatus;
        private Rule.Environment environment;
        private String submittedBy;
        private String approvedBy;
        private String previousSnapshot;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ChannelRequest {
        private String channelCode;
        private Double minLoanAmount;
        private Double maxLoanAmount;
        private Double minApr;
        private Double maxApr;
        private Integer minTermMonths;
        private Integer maxTermMonths;
        private Double maxOriginationFee;
        private Double maxOriginationFeePercentage;
        private String suppressedState;
        private String campaign;
        private Rule.Environment environment;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ChannelResponse {
        private Long id;
        private String channelCode;
        private Double minLoanAmount;
        private Double maxLoanAmount;
        private Double minApr;
        private Double maxApr;
        private Integer minTermMonths;
        private Integer maxTermMonths;
        private Double maxOriginationFee;
        private Double maxOriginationFeePercentage;
        private String suppressedState;
        private String campaign;
        private Rule.ApprovalStatus approvalStatus;
        private Rule.Environment environment;
        private String submittedBy;
        private String approvedBy;
        private String previousSnapshot;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReviewRequest {
        private String action;
        private String comments;
        private String reviewer;
    }
}
