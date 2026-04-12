package com.adf.ruleengine.repository.embedded;

import com.adf.ruleengine.model.embedded.EmbeddedVariableRegistry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface EmbeddedVariableRegistryRepository extends JpaRepository<EmbeddedVariableRegistry, Long> {
    Optional<EmbeddedVariableRegistry> findByVariableName(String variableName);
    List<EmbeddedVariableRegistry> findBySource(String source);
}
