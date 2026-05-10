package com.adf.ruleengine.exception;

public class OfferConfigException extends RuntimeException {
    public OfferConfigException(String message) {
        super(message);
    }

    public OfferConfigException(String message, Throwable cause) {
        super(message, cause);
    }
}
