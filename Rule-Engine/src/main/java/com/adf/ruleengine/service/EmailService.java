package com.adf.ruleengine.service;

import com.adf.ruleengine.model.StateConstraint;
import com.adf.ruleengine.model.ChannelConstraint;

public interface EmailService {
    void sendStateConstraintNotification(StateConstraint state, String action, String user);
    void sendChannelConstraintNotification(ChannelConstraint channel, String action, String user);
}
