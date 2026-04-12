package com.adf.ruleengine.repository;

import com.adf.ruleengine.model.Rule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface RuleRepository extends JpaRepository<Rule, Long> {
    List<Rule> findByEnvironment(Rule.Environment environment);
    List<Rule> findByApprovalStatus(Rule.ApprovalStatus approvalStatus);
    List<Rule> findByEnvironmentAndApprovalStatus(Rule.Environment env, Rule.ApprovalStatus status);
    Optional<Rule> findByRuleIdAndEnvironment(String ruleId, Rule.Environment environment);
    List<Rule> findByPhase(Rule.RulePhase phase);
}
