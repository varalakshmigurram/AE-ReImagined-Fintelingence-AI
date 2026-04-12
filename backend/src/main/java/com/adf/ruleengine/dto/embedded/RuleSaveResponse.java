package com.adf.ruleengine.dto.embedded;

import lombok.*;
import java.util.List;
import java.util.Map;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
public class RuleSaveResponse {
    private String batchId;
    private int totalRulesSaved;
    private int totalCutoffGroupsSaved;
    private boolean success;
    private List<String> validationErrors;

    public static RuleSaveResponse success(String batchId, int rules, int cutoffs) {
        return RuleSaveResponse.builder().batchId(batchId).totalRulesSaved(rules)
            .totalCutoffGroupsSaved(cutoffs).success(true).validationErrors(List.of()).build();
    }

    public static RuleSaveResponse failed(List<String> errors) {
        return RuleSaveResponse.builder().batchId(null).success(false).validationErrors(errors).build();
    }
}
