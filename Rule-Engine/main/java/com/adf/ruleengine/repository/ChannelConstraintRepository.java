package com.adf.ruleengine.repository;

import com.adf.ruleengine.model.ChannelConstraint;
import com.adf.ruleengine.model.Rule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface ChannelConstraintRepository extends JpaRepository<ChannelConstraint, Long> {
    List<ChannelConstraint> findByEnvironment(Rule.Environment environment);
    Optional<ChannelConstraint> findByChannelCodeAndEnvironment(String channelCode, Rule.Environment environment);
    List<ChannelConstraint> findByApprovalStatus(Rule.ApprovalStatus approvalStatus);
}
