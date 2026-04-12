package com.adf.ruleengine.repository.embedded;

import com.adf.ruleengine.model.embedded.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface RuleBundleSnapshotRepository extends JpaRepository<RuleBundleSnapshot, Long> {
    List<RuleBundleSnapshot> findByIsActiveTrue();
    List<RuleBundleSnapshot> findByBatchId(String batchId);
    Optional<RuleBundleSnapshot> findByBatchIdAndGroupName(String batchId, String groupName);

    @Modifying
    @Query("UPDATE RuleBundleSnapshot r SET r.isActive = false WHERE r.isActive = true")
    void deactivateAll();

    @Query("SELECT DISTINCT r.batchId FROM RuleBundleSnapshot r WHERE r.isActive = true")
    Optional<String> findActiveBatchId();
}
