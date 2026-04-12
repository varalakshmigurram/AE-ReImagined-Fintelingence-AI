package com.adf.ruleengine.repository.embedded;

import com.adf.ruleengine.model.embedded.OfferConfigSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface OfferConfigSnapshotRepository extends JpaRepository<OfferConfigSnapshot, Long> {
    List<OfferConfigSnapshot> findByIsActiveTrueOrderByCreatedAtDesc();
    List<OfferConfigSnapshot> findByBatchIdAndIsActiveTrue(String batchId);

    @Modifying
    @Query("UPDATE OfferConfigSnapshot o SET o.isActive = false WHERE o.isActive = true")
    void deactivateAll();

    @Query("SELECT DISTINCT o.batchId FROM OfferConfigSnapshot o WHERE o.isActive = true")
    List<String> findActiveBatchIds();
}
