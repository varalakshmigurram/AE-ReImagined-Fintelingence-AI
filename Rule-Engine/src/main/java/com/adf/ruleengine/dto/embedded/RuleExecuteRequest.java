package com.adf.ruleengine.dto.embedded;

import lombok.*;
import java.util.List;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RuleExecuteRequest {
    private Long leadId;
    private List<String> availableProviders;
    private Map<String, Object> facts;
}
