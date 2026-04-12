package com.adf.ruleengine.repository.embedded;

import com.adf.ruleengine.model.embedded.CutoffGroupSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CutoffGroupSnapshotRepository extends JpaRepository<CutoffGroupSnapshot, Long> {
    List<CutoffGroupSnapshot> findByIsActiveTrue();

    @Modifying
    @Query("UPDATE CutoffGroupSnapshot c SET c.isActive = false WHERE c.isActive = true")
    void deactivateAll();
}
