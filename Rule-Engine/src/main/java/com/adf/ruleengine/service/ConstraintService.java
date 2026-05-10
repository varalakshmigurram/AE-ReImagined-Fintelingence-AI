package com.adf.ruleengine.service;

import com.adf.ruleengine.dto.ConstraintDto;
import com.adf.ruleengine.model.AuditLog;
import com.adf.ruleengine.model.ChannelConstraint;
import com.adf.ruleengine.model.Rule;
import com.adf.ruleengine.model.StateConstraint;
import com.adf.ruleengine.repository.AuditLogRepository;
import com.adf.ruleengine.repository.ChannelConstraintRepository;
import com.adf.ruleengine.repository.StateConstraintRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ConstraintService {

    private final StateConstraintRepository stateRepo;
    private final ChannelConstraintRepository channelRepo;
    private final AuditLogRepository auditLogRepo;
    private final ObjectMapper objectMapper;
    private final EmailService emailService;

    // ─── State Constraints ───────────────────────────────────────────────

    public List<ConstraintDto.StateResponse> getStateConstraints(String env) {
        List<StateConstraint> list = env != null
                ? stateRepo.findByEnvironment(Rule.Environment.valueOf(env.toUpperCase()))
                : stateRepo.findAll();
        return list.stream().map(this::toStateResponse).collect(Collectors.toList());
    }

    public List<ConstraintDto.StateResponse> getPendingStateConstraints() {
        return stateRepo.findByApprovalStatus(Rule.ApprovalStatus.PENDING_REVIEW)
                .stream().map(this::toStateResponse).collect(Collectors.toList());
    }

    @Transactional
    public ConstraintDto.StateResponse createOrUpdateStateConstraint(ConstraintDto.StateRequest req, String user) {
        Rule.Environment env = req.getEnvironment() != null ? req.getEnvironment() : Rule.Environment.TEST;

        StateConstraint sc = stateRepo.findByStateCodeAndEnvironment(req.getStateCode(), env)
                .orElse(new StateConstraint());

        String before = sc.getId() != null ? toJson(sc) : null;

        sc.setStateCode(req.getStateCode());
        sc.setMinLoanAmount(req.getMinLoanAmount());
        sc.setMaxLoanAmount(req.getMaxLoanAmount());
        sc.setMinApr(req.getMinApr());
        sc.setMaxApr(req.getMaxApr());
        sc.setMinTermMonths(req.getMinTermMonths());
        sc.setMaxTermMonths(req.getMaxTermMonths());
        sc.setMaxOriginationFee(req.getMaxOriginationFee());
        sc.setMaxOriginationFeePercentage(req.getMaxOriginationFeePercentage());
        sc.setStateOnOff(req.getStateOnOff());
        sc.setOriginationFeeLogic(req.getOriginationFeeLogic());
        sc.setEnvironment(env);
        sc.setApprovalStatus(Rule.ApprovalStatus.DRAFT);
        sc.setSubmittedBy(user);
        if (before != null) sc.setPreviousSnapshot(before);

        StateConstraint saved = stateRepo.save(sc);
        String action = before == null ? "CREATED" : "UPDATED";
        logAudit("STATE_CONSTRAINT", saved.getId().toString(), action, user, before, toJson(saved), null);
        
        // Send email notification asynchronously
        sendStateConstraintEmailAsync(saved, action, user);
        
        return toStateResponse(saved);
    }

    @Transactional
    public ConstraintDto.StateResponse submitStateForReview(Long id, String user) {
        StateConstraint sc = stateRepo.findById(id).orElseThrow();
        sc.setApprovalStatus(Rule.ApprovalStatus.PENDING_REVIEW);
        StateConstraint saved = stateRepo.save(sc);
        logAudit("STATE_CONSTRAINT", id.toString(), "SUBMITTED_FOR_REVIEW", user, null, null, null);
        return toStateResponse(saved);
    }

    @Transactional
    public ConstraintDto.StateResponse reviewStateConstraint(Long id, ConstraintDto.ReviewRequest req) {
        StateConstraint sc = stateRepo.findById(id).orElseThrow();
        if ("APPROVE".equalsIgnoreCase(req.getAction())) {
            sc.setApprovalStatus(Rule.ApprovalStatus.APPROVED);
            sc.setApprovedBy(req.getReviewer());
        } else {
            sc.setApprovalStatus(Rule.ApprovalStatus.REJECTED);
        }
        StateConstraint saved = stateRepo.save(sc);
        logAudit("STATE_CONSTRAINT", id.toString(), req.getAction().toUpperCase(), req.getReviewer(), null, null, req.getComments());
        return toStateResponse(saved);
    }

    @Transactional
    public ConstraintDto.StateResponse promoteStateToProduction(Long id, String user) {
        StateConstraint test = stateRepo.findById(id).orElseThrow();
        if (test.getApprovalStatus() != Rule.ApprovalStatus.APPROVED) {
            throw new RuntimeException("Only approved constraints can be promoted");
        }

        StateConstraint prod = stateRepo.findByStateCodeAndEnvironment(test.getStateCode(), Rule.Environment.PROD)
                .orElse(new StateConstraint());

        String before = prod.getId() != null ? toJson(prod) : null;
        prod.setStateCode(test.getStateCode());
        prod.setMinLoanAmount(test.getMinLoanAmount());
        prod.setMaxLoanAmount(test.getMaxLoanAmount());
        prod.setMinApr(test.getMinApr());
        prod.setMaxApr(test.getMaxApr());
        prod.setMinTermMonths(test.getMinTermMonths());
        prod.setMaxTermMonths(test.getMaxTermMonths());
        prod.setMaxOriginationFee(test.getMaxOriginationFee());
        prod.setMaxOriginationFeePercentage(test.getMaxOriginationFeePercentage());
        prod.setStateOnOff(test.getStateOnOff());
        prod.setOriginationFeeLogic(test.getOriginationFeeLogic());
        prod.setEnvironment(Rule.Environment.PROD);
        prod.setApprovalStatus(Rule.ApprovalStatus.APPROVED);
        prod.setApprovedBy(user);
        if (before != null) prod.setPreviousSnapshot(before);

        StateConstraint saved = stateRepo.save(prod);
        logAudit("STATE_CONSTRAINT", saved.getId().toString(), "PROMOTED_TO_PROD", user, before, toJson(saved), null);
        return toStateResponse(saved);
    }

    // ─── Channel Constraints ─────────────────────────────────────────────

    public List<ConstraintDto.ChannelResponse> getChannelConstraints(String env) {
        List<ChannelConstraint> list = env != null
                ? channelRepo.findByEnvironment(Rule.Environment.valueOf(env.toUpperCase()))
                : channelRepo.findAll();
        return list.stream().map(this::toChannelResponse).collect(Collectors.toList());
    }

    public List<ConstraintDto.ChannelResponse> getPendingChannelConstraints() {
        return channelRepo.findByApprovalStatus(Rule.ApprovalStatus.PENDING_REVIEW)
                .stream().map(this::toChannelResponse).collect(Collectors.toList());
    }

    @Transactional
    public ConstraintDto.ChannelResponse createOrUpdateChannelConstraint(ConstraintDto.ChannelRequest req, String user) {
        Rule.Environment env = req.getEnvironment() != null ? req.getEnvironment() : Rule.Environment.TEST;

        ChannelConstraint cc = channelRepo.findByChannelCodeAndEnvironment(req.getChannelCode(), env)
                .orElse(new ChannelConstraint());

        String before = cc.getId() != null ? toJson(cc) : null;
        cc.setChannelCode(req.getChannelCode());
        cc.setMinLoanAmount(req.getMinLoanAmount());
        cc.setMaxLoanAmount(req.getMaxLoanAmount());
        cc.setMinApr(req.getMinApr());
        cc.setMaxApr(req.getMaxApr());
        cc.setMinTermMonths(req.getMinTermMonths());
        cc.setMaxTermMonths(req.getMaxTermMonths());
        cc.setMaxOriginationFee(req.getMaxOriginationFee());
        cc.setMaxOriginationFeePercentage(req.getMaxOriginationFeePercentage());
        cc.setSuppressedState(req.getSuppressedState());
        cc.setCampaign(req.getCampaign());
        cc.setEnvironment(env);
        cc.setApprovalStatus(Rule.ApprovalStatus.DRAFT);
        cc.setSubmittedBy(user);
        if (before != null) cc.setPreviousSnapshot(before);

        ChannelConstraint saved = channelRepo.save(cc);
        String action = before == null ? "CREATED" : "UPDATED";
        logAudit("CHANNEL_CONSTRAINT", saved.getId().toString(), action, user, before, toJson(saved), null);
        
        // Send email notification asynchronously
        sendChannelConstraintEmailAsync(saved, action, user);
        
        return toChannelResponse(saved);
    }

    @Transactional
    public ConstraintDto.ChannelResponse submitChannelForReview(Long id, String user) {
        ChannelConstraint cc = channelRepo.findById(id).orElseThrow();
        cc.setApprovalStatus(Rule.ApprovalStatus.PENDING_REVIEW);
        ChannelConstraint saved = channelRepo.save(cc);
        logAudit("CHANNEL_CONSTRAINT", id.toString(), "SUBMITTED_FOR_REVIEW", user, null, null, null);
        return toChannelResponse(saved);
    }

    @Transactional
    public ConstraintDto.ChannelResponse reviewChannelConstraint(Long id, ConstraintDto.ReviewRequest req) {
        ChannelConstraint cc = channelRepo.findById(id).orElseThrow();
        if ("APPROVE".equalsIgnoreCase(req.getAction())) {
            cc.setApprovalStatus(Rule.ApprovalStatus.APPROVED);
            cc.setApprovedBy(req.getReviewer());
        } else {
            cc.setApprovalStatus(Rule.ApprovalStatus.REJECTED);
        }
        ChannelConstraint saved = channelRepo.save(cc);
        logAudit("CHANNEL_CONSTRAINT", id.toString(), req.getAction().toUpperCase(), req.getReviewer(), null, null, req.getComments());
        return toChannelResponse(saved);
    }

    @Transactional
    public ConstraintDto.ChannelResponse promoteChannelToProduction(Long id, String user) {
        ChannelConstraint test = channelRepo.findById(id).orElseThrow();
        if (test.getApprovalStatus() != Rule.ApprovalStatus.APPROVED) {
            throw new RuntimeException("Only approved constraints can be promoted");
        }

        ChannelConstraint prod = channelRepo.findByChannelCodeAndEnvironment(test.getChannelCode(), Rule.Environment.PROD)
                .orElse(new ChannelConstraint());

        String before = prod.getId() != null ? toJson(prod) : null;
        prod.setChannelCode(test.getChannelCode());
        prod.setMinLoanAmount(test.getMinLoanAmount());
        prod.setMaxLoanAmount(test.getMaxLoanAmount());
        prod.setMinApr(test.getMinApr());
        prod.setMaxApr(test.getMaxApr());
        prod.setMinTermMonths(test.getMinTermMonths());
        prod.setMaxTermMonths(test.getMaxTermMonths());
        prod.setMaxOriginationFee(test.getMaxOriginationFee());
        prod.setMaxOriginationFeePercentage(test.getMaxOriginationFeePercentage());
        prod.setSuppressedState(test.getSuppressedState());
        prod.setCampaign(test.getCampaign());
        prod.setEnvironment(Rule.Environment.PROD);
        prod.setApprovalStatus(Rule.ApprovalStatus.APPROVED);
        prod.setApprovedBy(user);
        if (before != null) prod.setPreviousSnapshot(before);

        ChannelConstraint saved = channelRepo.save(prod);
        logAudit("CHANNEL_CONSTRAINT", saved.getId().toString(), "PROMOTED_TO_PROD", user, before, toJson(saved), null);
        return toChannelResponse(saved);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────

    private void logAudit(String entityType, String entityId, String action,
                          String user, String before, String after, String comments) {
        auditLogRepo.save(AuditLog.builder()
                .entityType(entityType).entityId(entityId)
                .action(action).performedBy(user)
                .beforeSnapshot(before).afterSnapshot(after)
                .comments(comments).build());
    }

    private String toJson(Object o) {
        try { return objectMapper.writeValueAsString(o); } catch (Exception e) { return "{}"; }
    }

    public ConstraintDto.StateResponse toStateResponse(StateConstraint sc) {
        return ConstraintDto.StateResponse.builder()
                .id(sc.getId()).stateCode(sc.getStateCode())
                .minLoanAmount(sc.getMinLoanAmount()).maxLoanAmount(sc.getMaxLoanAmount())
                .minApr(sc.getMinApr()).maxApr(sc.getMaxApr())
                .minTermMonths(sc.getMinTermMonths()).maxTermMonths(sc.getMaxTermMonths())
                .maxOriginationFee(sc.getMaxOriginationFee())
                .maxOriginationFeePercentage(sc.getMaxOriginationFeePercentage())
                .stateOnOff(sc.getStateOnOff()).originationFeeLogic(sc.getOriginationFeeLogic())
                .approvalStatus(sc.getApprovalStatus()).environment(sc.getEnvironment())
                .submittedBy(sc.getSubmittedBy()).approvedBy(sc.getApprovedBy())
                .previousSnapshot(sc.getPreviousSnapshot())
                .createdAt(sc.getCreatedAt()).updatedAt(sc.getUpdatedAt())
                .build();
    }

    public ConstraintDto.ChannelResponse toChannelResponse(ChannelConstraint cc) {
        return ConstraintDto.ChannelResponse.builder()
                .id(cc.getId()).channelCode(cc.getChannelCode())
                .minLoanAmount(cc.getMinLoanAmount()).maxLoanAmount(cc.getMaxLoanAmount())
                .minApr(cc.getMinApr()).maxApr(cc.getMaxApr())
                .minTermMonths(cc.getMinTermMonths()).maxTermMonths(cc.getMaxTermMonths())
                .maxOriginationFee(cc.getMaxOriginationFee())
                .maxOriginationFeePercentage(cc.getMaxOriginationFeePercentage())
                .suppressedState(cc.getSuppressedState()).campaign(cc.getCampaign())
                .approvalStatus(cc.getApprovalStatus()).environment(cc.getEnvironment())
                .submittedBy(cc.getSubmittedBy()).approvedBy(cc.getApprovedBy())
                .previousSnapshot(cc.getPreviousSnapshot())
                .createdAt(cc.getCreatedAt()).updatedAt(cc.getUpdatedAt())
                .build();
    }

    @Async
    private void sendStateConstraintEmailAsync(StateConstraint sc, String action, String user) {
        try {
            emailService.sendStateConstraintNotification(sc, action, user);
        } catch (Exception e) {
            log.warn("Failed to send email notification for state constraint: {}", sc.getStateCode(), e);
        }
    }

    @Async
    private void sendChannelConstraintEmailAsync(ChannelConstraint cc, String action, String user) {
        try {
            emailService.sendChannelConstraintNotification(cc, action, user);
        } catch (Exception e) {
            log.warn("Failed to send email notification for channel constraint: {}", cc.getChannelCode(), e);
        }
    }
}
