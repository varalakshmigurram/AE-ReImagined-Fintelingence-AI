package com.adf.ruleengine.repository.embedded;

import com.adf.ruleengine.model.embedded.EmbeddedCutoffEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmbeddedCutoffEntryRepository extends JpaRepository<EmbeddedCutoffEntry, Long> {

    List<EmbeddedCutoffEntry> findByIsActiveTrueOrderByGroupNameAscDimensionKeyAsc();

    List<EmbeddedCutoffEntry> findByGroupNameAndIsActiveTrueOrderByDimensionKeyAsc(String groupName);

    List<EmbeddedCutoffEntry> findByEnvironmentAndIsActiveTrueOrderByGroupNameAscDimensionKeyAsc(String environment);

    List<EmbeddedCutoffEntry> findByBatchId(String batchId);

    @Modifying
    @Query("UPDATE EmbeddedCutoffEntry e SET e.isActive = false WHERE e.environment = :env AND e.isActive = true")
    void deactivateByEnvironment(String env);

    @Modifying
    @Query("UPDATE EmbeddedCutoffEntry e SET e.isActive = false WHERE e.isActive = true")
    void deactivateAll();

    List<EmbeddedCutoffEntry> findByIsChangedTrueAndIsActiveTrue();

    long countByIsActiveTrue();
}
