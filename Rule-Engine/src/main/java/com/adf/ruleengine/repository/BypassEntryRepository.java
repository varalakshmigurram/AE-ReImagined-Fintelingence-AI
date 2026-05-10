package com.adf.ruleengine.repository;

import com.adf.ruleengine.model.BypassEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.List;

public interface BypassEntryRepository extends JpaRepository<BypassEntry, Long> {
    Optional<BypassEntry> findBySsnHashAndIsActiveTrue(String ssnHash);
    boolean existsBySsnHash(String ssnHash);
    List<BypassEntry> findAllByOrderByAddedAtDesc();
    List<BypassEntry> findByIsActiveTrueOrderByAddedAtDesc();
}
