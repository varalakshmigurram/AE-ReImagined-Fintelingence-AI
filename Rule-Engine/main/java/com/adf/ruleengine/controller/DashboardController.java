package com.adf.ruleengine.controller;

import com.adf.ruleengine.model.AuditLog;
import com.adf.ruleengine.model.Rule;
import com.adf.ruleengine.repository.*;
import com.adf.ruleengine.repository.embedded.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/dashboard")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
public class DashboardController {

    private final RuleRepository              ruleRepository;
    private final StateConstraintRepository   stateRepo;
    private final ChannelConstraintRepository channelRepo;
    private final AuditLogRepository          auditLogRepo;
    private final RuleBundleSnapshotRepository ruleBundleRepo;
    private final CutoffGroupSnapshotRepository cutoffRepo;
    private final OfferConfigSnapshotRepository offerConfigRepo;
    private final EmbeddedVariableRegistryRepository variableRepo;
    private final ObjectMapper objectMapper;

    @GetMapping("/stats")
    public Map<String, Object> getStats() {
        Map<String, Object> s = new LinkedHashMap<>();

        // ── Config Management ─────────────────────────────────────────────
        s.put("totalRules",    ruleRepository.count());
        s.put("activeRules",   ruleRepository.findByEnvironmentAndApprovalStatus(
                Rule.Environment.TEST, Rule.ApprovalStatus.APPROVED).size());
        s.put("pendingReviews",
                ruleRepository.findByApprovalStatus(Rule.ApprovalStatus.PENDING_REVIEW).size()
              + stateRepo.findByApprovalStatus(Rule.ApprovalStatus.PENDING_REVIEW).size()
              + channelRepo.findByApprovalStatus(Rule.ApprovalStatus.PENDING_REVIEW).size());
        s.put("totalStates",  stateRepo.findByEnvironment(Rule.Environment.TEST).size());
        s.put("offStates",    stateRepo.findByEnvironment(Rule.Environment.TEST)
                .stream().filter(st -> "OFF".equals(st.getStateOnOff())).count());
        s.put("totalChannels", channelRepo.findByEnvironment(Rule.Environment.TEST).size());
        s.put("prodRules",    ruleRepository.findByEnvironment(Rule.Environment.PROD).size());

        // ── Embedded Rule Engine ──────────────────────────────────────────
        long embeddedCount = ruleBundleRepo.findByIsActiveTrue().stream()
            .mapToLong(snap -> {
                try { return ((List<?>) objectMapper.readValue(snap.getRawJson(), List.class)).size(); }
                catch (Exception e) { return 0L; }
            }).sum();
        s.put("embeddedRulesActive", embeddedCount);
        s.put("activeBatchId",       ruleBundleRepo.findActiveBatchId().orElse(null));
        s.put("activeCutoffGroups",  cutoffRepo.findByIsActiveTrue().size());
        s.put("offerConfigLoaded",   !offerConfigRepo.findByIsActiveTrueOrderByCreatedAtDesc().isEmpty());
        s.put("variableCount",       variableRepo.count());

        return s;
    }

    @GetMapping("/activity")
    public List<AuditLog> getRecentActivity() {
        return auditLogRepo.findTop50ByOrderByTimestampDesc();
    }
}
