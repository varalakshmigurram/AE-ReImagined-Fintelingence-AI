package com.adf.ruleengine.repository;

import com.adf.ruleengine.model.RuleLineage;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RuleLineageRepository extends JpaRepository<RuleLineage, Long> {
    List<RuleLineage> findByRuleIdOrderByChangedAtAsc(Long ruleId);
    List<RuleLineage> findByRuleIdStrOrderByChangedAtAsc(String ruleIdStr);
    List<RuleLineage> findBySessionIdOrderByChangedAtAsc(String sessionId);
}
