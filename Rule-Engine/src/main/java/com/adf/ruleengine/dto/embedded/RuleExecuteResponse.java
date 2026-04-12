package com.adf.ruleengine.dto.embedded;

import lombok.*;
import java.util.List;

@Data @NoArgsConstructor @AllArgsConstructor
public class RuleExecuteResponse {
    private Long leadId;
    private String batchId;
    private List<GroupResult> groups;
    private long executionTimeMs;

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class GroupResult {
        private String groupName;
        private List<RuleResult> rules;
    }

    @Data @NoArgsConstructor @AllArgsConstructor
    public static class RuleResult {
        private String ruleId;
        private String triState;  // TRUE, FALSE, UNKNOWN
        private String result;    // HARD, PASS, PEND, SPECIAL, null
        private String status;    // FIRED, NOT_FIRED, SKIPPED
        private List<String> tags;

        public static RuleResult skipped(String ruleId, List<String> tags) {
            return new RuleResult(ruleId, "UNKNOWN", null, "SKIPPED", tags);
        }
    }
}
