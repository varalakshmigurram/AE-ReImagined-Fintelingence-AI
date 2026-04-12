package com.adf.ruleengine.repository.embedded;

import com.adf.ruleengine.model.embedded.ConfigVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ConfigVersionRepository extends JpaRepository<ConfigVersion, Long> {

    boolean existsByVersionAndConfigScope(String version, ConfigVersion.ConfigScope scope);

    Optional<ConfigVersion> findByVersionAndConfigScope(String version, ConfigVersion.ConfigScope scope);

    List<ConfigVersion> findByConfigScopeOrderByCreatedAtDesc(ConfigVersion.ConfigScope scope);

    List<ConfigVersion> findByStatusAndConfigScopeOrderByCreatedAtDesc(
            ConfigVersion.VersionStatus status, ConfigVersion.ConfigScope scope);

    Optional<ConfigVersion> findByConfigScopeAndIsCurrentTrue(ConfigVersion.ConfigScope scope);

    List<ConfigVersion> findByEnvironmentOrderByCreatedAtDesc(ConfigVersion.VersionEnvironment env);

    @Modifying
    @Query("UPDATE ConfigVersion v SET v.isCurrent = false WHERE v.configScope = :scope AND v.isCurrent = true")
    void clearCurrentForScope(ConfigVersion.ConfigScope scope);

    @Query("SELECT v FROM ConfigVersion v WHERE v.status = 'PENDING_REVIEW' ORDER BY v.createdAt DESC")
    List<ConfigVersion> findAllPendingReview();

    @Query("SELECT COUNT(v) FROM ConfigVersion v WHERE v.version = :version")
    long countByVersion(String version);
}
