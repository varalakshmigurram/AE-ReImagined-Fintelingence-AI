package com.adf.ruleengine.service;

import com.adf.ruleengine.model.StateConstraint;
import com.adf.ruleengine.model.ChannelConstraint;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmailServiceImpl implements EmailService {

    private final JavaMailSender mailSender;

    @Value("${rule.notification.emails:}")
    private String notificationEmails;

    @Override
    public void sendStateConstraintNotification(StateConstraint state, String action, String user) {
        try {
            String subject = String.format("State Configuration %s: %s", action, state.getStateCode());
            String body = String.format(
                "State Configuration %s\n\n" +
                "State Code: %s\n" +
                "Environment: %s\n" +
                "Min Loan: $%,.0f\n" +
                "Max Loan: $%,.0f\n" +
                "Min APR: %.2f%%\n" +
                "Max APR: %.2f%%\n" +
                "Min Term: %d months\n" +
                "Max Term: %d months\n" +
                "Status: %s\n" +
                "Action: %s\n" +
                "Modified By: %s\n" +
                "Timestamp: %s\n",
                action,
                state.getStateCode(),
                state.getEnvironment(),
                state.getMinLoanAmount(),
                state.getMaxLoanAmount(),
                state.getMinApr(),
                state.getMaxApr(),
                state.getMinTermMonths(),
                state.getMaxTermMonths(),
                state.getApprovalStatus(),
                action,
                user,
                state.getUpdatedAt()
            );

            sendEmail(subject, body);
            log.info("State constraint notification sent for {}: {}", state.getStateCode(), action);
        } catch (Exception e) {
            log.error("Failed to send state constraint notification", e);
        }
    }

    @Override
    public void sendChannelConstraintNotification(ChannelConstraint channel, String action, String user) {
        try {
            String subject = String.format("Channel Configuration %s: %s", action, channel.getChannelCode());
            String body = String.format(
                "Channel Configuration %s\n\n" +
                "Channel Code: %s\n" +
                "Environment: %s\n" +
                "Min Loan: $%,.0f\n" +
                "Max Loan: $%,.0f\n" +
                "Min APR: %.2f%%\n" +
                "Max APR: %.2f%%\n" +
                "Min Term: %d months\n" +
                "Max Term: %d months\n" +
                "Status: %s\n" +
                "Action: %s\n" +
                "Modified By: %s\n" +
                "Timestamp: %s\n",
                action,
                channel.getChannelCode(),
                channel.getEnvironment(),
                channel.getMinLoanAmount(),
                channel.getMaxLoanAmount(),
                channel.getMinApr(),
                channel.getMaxApr(),
                channel.getMinTermMonths(),
                channel.getMaxTermMonths(),
                channel.getApprovalStatus(),
                action,
                user,
                channel.getUpdatedAt()
            );

            sendEmail(subject, body);
            log.info("Channel constraint notification sent for {}: {}", channel.getChannelCode(), action);
        } catch (Exception e) {
            log.error("Failed to send channel constraint notification", e);
        }
    }

    private void sendEmail(String subject, String body) {
        try {
            if (notificationEmails == null || notificationEmails.isBlank()) {
                log.debug("No notification emails configured, skipping email");
                return;
            }

            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom("noreply@fintelligence.com");
            message.setTo(notificationEmails.split(","));
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
        } catch (Exception e) {
            log.error("Failed to send email: {}", subject, e);
        }
    }
}
