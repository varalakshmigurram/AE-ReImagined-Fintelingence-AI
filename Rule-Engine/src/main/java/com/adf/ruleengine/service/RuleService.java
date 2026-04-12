package com.adf.ruleengine.service;

import com.adf.ruleengine.dto.RuleDto;
import com.adf.ruleengine.model.AuditLog;
import com.adf.ruleengine.model.Rule;
import com.adf.ruleengine.repository.AuditLogRepository;
import com.adf.ruleengine.repository.RuleRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RuleService {

    private final RuleRepository ruleRepository;
    private final AuditLogRepository auditLogRepository;
    private final ObjectMapper objectMapper;
    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;

    @Value("${rule.notification.emails:}")
    private String notificationEmails;

    public List<RuleDto.Response> getAllRules(String env) {
        List<Rule> rules = env != null
                ? ruleRepository.findByEnvironment(Rule.Environment.valueOf(env.toUpperCase()))
                : ruleRepository.findAll();
        return rules.stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<RuleDto.Response> getPendingReviews() {
        return ruleRepository.findByApprovalStatus(Rule.ApprovalStatus.PENDING_REVIEW)
                .stream().map(this::toResponse).collect(Collectors.toList());
    }

    public Optional<RuleDto.Response> getRuleById(Long id) {
        return ruleRepository.findById(id).map(this::toResponse);
    }

    @Transactional
    public RuleDto.Response createRule(RuleDto.Request request, String createdBy) {
        Rule rule = Rule.builder()
                .ruleId(request.getRuleId())
                .ruleNumber(request.getRuleNumber())
                .description(request.getDescription())
                .applicableSegment(request.getApplicableSegment())
                .cutoffs(request.getCutoffs())
                .applyPercentage(request.getApplyPercentage())
                .phase(request.getPhase())
                .status(Rule.RuleStatus.DRAFT)
                .environment(request.getEnvironment() != null ? request.getEnvironment() : Rule.Environment.TEST)
                .approvalStatus(Rule.ApprovalStatus.DRAFT)
                .submittedBy(createdBy)
                .build();

        Rule saved = ruleRepository.save(rule);
        logAudit("RULE", saved.getId().toString(), "CREATED", createdBy, null, toJson(saved), null);
        return toResponse(saved);
    }

    @Transactional
    public RuleDto.Response updateRule(Long id, RuleDto.Request request, String updatedBy) {
        Rule existing = ruleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Rule not found: " + id));

        String beforeSnapshot = toJson(existing);
        existing.setPreviousSnapshot(beforeSnapshot);
        existing.setDescription(request.getDescription());
        existing.setApplicableSegment(request.getApplicableSegment());
        existing.setCutoffs(request.getCutoffs());
        existing.setApplyPercentage(request.getApplyPercentage());
        existing.setPhase(request.getPhase());
        if (request.getStatus() != null) existing.setStatus(request.getStatus());
        existing.setApprovalStatus(Rule.ApprovalStatus.DRAFT);

        Rule saved = ruleRepository.save(existing);
        logAudit("RULE", saved.getId().toString(), "UPDATED", updatedBy, beforeSnapshot, toJson(saved), null);
        sendUpdateEmail(saved, updatedBy);
        return toResponse(saved);
    }

    @Transactional
    public RuleDto.Response submitForReview(Long id, String submittedBy) {
        Rule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Rule not found: " + id));

        rule.setApprovalStatus(Rule.ApprovalStatus.PENDING_REVIEW);
        rule.setSubmittedBy(submittedBy);

        Rule saved = ruleRepository.save(rule);
        logAudit("RULE", saved.getId().toString(), "SUBMITTED_FOR_REVIEW", submittedBy, null, null, null);
        return toResponse(saved);
    }

    @Transactional
    public RuleDto.Response reviewRule(Long id, RuleDto.ReviewRequest reviewRequest) {
        Rule rule = ruleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Rule not found: " + id));

        String action = reviewRequest.getAction().toUpperCase();
        if ("APPROVE".equals(action)) {
            rule.setApprovalStatus(Rule.ApprovalStatus.APPROVED);
            rule.setApprovedBy(reviewRequest.getReviewer());
            rule.setApprovedAt(LocalDateTime.now());
            rule.setStatus(Rule.RuleStatus.ACTIVE);
        } else if ("REJECT".equals(action)) {
            rule.setApprovalStatus(Rule.ApprovalStatus.REJECTED);
            rule.setReviewedBy(reviewRequest.getReviewer());
            rule.setRejectionReason(reviewRequest.getComments());
        }

        Rule saved = ruleRepository.save(rule);
        logAudit("RULE", saved.getId().toString(), action, reviewRequest.getReviewer(), null, null, reviewRequest.getComments());
        return toResponse(saved);
    }

    @Transactional
    public RuleDto.Response promoteToProduction(Long id, String promotedBy) {
        Rule testRule = ruleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Rule not found: " + id));

        if (testRule.getApprovalStatus() != Rule.ApprovalStatus.APPROVED) {
            throw new RuntimeException("Only approved rules can be promoted to production");
        }

        // Check if production version exists
        Optional<Rule> existingProd = ruleRepository.findByRuleIdAndEnvironment(
                testRule.getRuleId(), Rule.Environment.PROD);

        Rule prodRule;
        if (existingProd.isPresent()) {
            prodRule = existingProd.get();
            String before = toJson(prodRule);
            prodRule.setDescription(testRule.getDescription());
            prodRule.setApplicableSegment(testRule.getApplicableSegment());
            prodRule.setCutoffs(testRule.getCutoffs());
            prodRule.setApplyPercentage(testRule.getApplyPercentage());
            prodRule.setPhase(testRule.getPhase());
            prodRule.setStatus(Rule.RuleStatus.ACTIVE);
            prodRule.setApprovalStatus(Rule.ApprovalStatus.APPROVED);
            prodRule.setApprovedBy(promotedBy);
            prodRule.setPreviousSnapshot(before);
            prodRule = ruleRepository.save(prodRule);
        } else {
            prodRule = Rule.builder()
                    .ruleId(testRule.getRuleId())
                    .ruleNumber(testRule.getRuleNumber())
                    .description(testRule.getDescription())
                    .applicableSegment(testRule.getApplicableSegment())
                    .cutoffs(testRule.getCutoffs())
                    .applyPercentage(testRule.getApplyPercentage())
                    .phase(testRule.getPhase())
                    .status(Rule.RuleStatus.ACTIVE)
                    .environment(Rule.Environment.PROD)
                    .approvalStatus(Rule.ApprovalStatus.APPROVED)
                    .submittedBy(testRule.getSubmittedBy())
                    .approvedBy(promotedBy)
                    .approvedAt(LocalDateTime.now())
                    .build();
            prodRule = ruleRepository.save(prodRule);
        }

        logAudit("RULE", prodRule.getId().toString(), "PROMOTED_TO_PROD", promotedBy, null, toJson(prodRule), null);
        return toResponse(prodRule);
    }

    public List<AuditLog> getAuditHistory(Long ruleId) {
        return auditLogRepository.findByEntityTypeAndEntityIdOrderByTimestampDesc("RULE", ruleId.toString());
    }

    private void logAudit(String entityType, String entityId, String action,
                          String performedBy, String before, String after, String comments) {
        AuditLog log = AuditLog.builder()
                .entityType(entityType)
                .entityId(entityId)
                .action(action)
                .performedBy(performedBy)
                .beforeSnapshot(before)
                .afterSnapshot(after)
                .comments(comments)
                .build();
        auditLogRepository.save(log);
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }

    public RuleDto.Response toResponse(Rule rule) {
        return RuleDto.Response.builder()
                .id(rule.getId())
                .ruleId(rule.getRuleId())
                .ruleNumber(rule.getRuleNumber())
                .description(rule.getDescription())
                .applicableSegment(rule.getApplicableSegment())
                .cutoffs(rule.getCutoffs())
                .applyPercentage(rule.getApplyPercentage())
                .phase(rule.getPhase())
                .status(rule.getStatus())
                .environment(rule.getEnvironment())
                .approvalStatus(rule.getApprovalStatus())
                .submittedBy(rule.getSubmittedBy())
                .reviewedBy(rule.getReviewedBy())
                .approvedBy(rule.getApprovedBy())
                .rejectionReason(rule.getRejectionReason())
                .createdAt(rule.getCreatedAt())
                .updatedAt(rule.getUpdatedAt())
                .approvedAt(rule.getApprovedAt())
                .previousSnapshot(rule.getPreviousSnapshot())
                .build();
    }

    private void sendUpdateEmail(Rule rule, String updatedBy) {
        try {
            if (notificationEmails == null || notificationEmails.isBlank()) {
                log.debug("No notification emails configured, skipping email");
                return;
            }

            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(notificationEmails.split(","));
            helper.setSubject("Rule Updated: " + rule.getRuleId());

            String htmlContent = buildHtmlEmailBody(rule, updatedBy);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("Email notification sent for rule update: {}", rule.getRuleId());
        } catch (MessagingException e) {
            log.error("Email notification failed for rule {}", rule.getRuleId(), e);
        } catch (Exception e) {
            log.error("Unexpected error sending email for rule {}", rule.getRuleId(), e);
        }
    }

    private String buildHtmlEmailBody(Rule rule, String updatedBy) {
        Context context = new Context();
        context.setVariable("rule", rule);
        context.setVariable("updatedBy", updatedBy);
        return templateEngine.process("rule-update-email", context);
    }
}
