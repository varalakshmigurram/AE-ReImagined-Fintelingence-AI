package com.adf.ruleengine.repository;

import com.adf.ruleengine.model.StateConstraint;
import com.adf.ruleengine.model.Rule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface StateConstraintRepository extends JpaRepository<StateConstraint, Long> {
    List<StateConstraint> findByEnvironment(Rule.Environment environment);
    Optional<StateConstraint> findByStateCodeAndEnvironment(String stateCode, Rule.Environment environment);
    List<StateConstraint> findByApprovalStatus(Rule.ApprovalStatus approvalStatus);
}
