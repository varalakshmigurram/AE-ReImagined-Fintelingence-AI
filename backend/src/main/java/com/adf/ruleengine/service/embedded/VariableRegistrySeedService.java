package com.adf.ruleengine.service.embedded;

import com.adf.ruleengine.model.embedded.EmbeddedVariableRegistry;
import com.adf.ruleengine.repository.embedded.EmbeddedVariableRegistryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@Order(2)
@RequiredArgsConstructor
@Slf4j
public class VariableRegistrySeedService implements CommandLineRunner {

    private final EmbeddedVariableRegistryRepository repo;

    @Override
    public void run(String... args) {
        if (repo.count() > 0) return;

        List<EmbeddedVariableRegistry> vars = List.of(
            v("vantageScore",        "INTEGER", "tu",      "TransUnion Vantage 3.0 credit score"),
            v("cvScore",             "INTEGER", "tu",      "TransUnion CV score"),
            v("g106s",               "INTEGER", "tu",      "Number of open trades (thin file check)"),
            v("at02s",               "INTEGER", "tu",      "Number of open installment trades"),
            v("at20s",               "INTEGER", "tu",      "Months since oldest trade opened"),
            v("sg68s",               "INTEGER", "tu",      "Total student loan balance"),
            v("sg34s",               "STRING",  "tu",      "Student loan deferred flag (Y/N)"),
            v("co02s",               "INTEGER", "tu",      "Charge-off trades in last 12 months"),
            v("noHit",               "BOOLEAN", "tu",      "No record found in TU database"),
            v("st01s",               "INTEGER", "tu",      "Number of student loan trades"),
            v("stage6TuFreeze",      "BOOLEAN", "tu",      "Credit freeze flag from TU Stage 6"),
            v("creditGrade",         "STRING",  "de",      "Derived credit grade (A1,A2,B1...F)"),
            v("income",              "DOUBLE",  "de",      "Derived annual income"),
            v("statedAnnualIncome",  "DOUBLE",  "de",      "Customer stated annual income"),
            v("statedMonthlyIncome", "DOUBLE",  "de",      "Customer stated monthly income"),
            v("requestedLoanAmount", "DOUBLE",  "de",      "Loan amount requested by customer"),
            v("repaymentAmount",     "DOUBLE",  "de",      "Computed monthly repayment amount"),
            v("assignedCreditScore", "INTEGER", "de",      "FICO score assigned to lead"),
            v("creditRating",        "INTEGER", "de",      "Credit rating numeric value"),
            v("fraudScore",          "INTEGER", "clarity", "Clarity fraud score"),
            v("stage10ClarityFreeze","BOOLEAN", "clarity", "Credit freeze from Clarity Stage 10"),
            v("state",               "STRING",  "contact", "Customer state code (AK, CA, etc.)"),
            v("address",             "STRING",  "contact", "Customer mailing address"),
            v("age",                 "INTEGER", "contact", "Customer age"),
            v("email",               "STRING",  "contact", "Customer email address"),
            v("phone",               "STRING",  "contact", "Customer phone number"),
            v("minorFlag",           "BOOLEAN", "contact", "Customer is a minor"),
            v("channel",             "STRING",  "app",     "Acquisition channel (QS, LT, ML, etc.)"),
            v("productType",         "STRING",  "app",     "Loan product type"),
            v("tuDobFound",          "BOOLEAN", "appLevelFraudDbCheck", "DOB found in TU fraud check"),
            v("ssn",                 "STRING",  "app",     "Customer SSN for dedup/negative file")
        );

        repo.saveAll(vars);
        log.info("Variable registry seeded with {} variables", vars.size());
    }

    private EmbeddedVariableRegistry v(String name, String type, String source, String desc) {
        return EmbeddedVariableRegistry.builder()
            .variableName(name).dataType(type).source(source).description(desc).build();
    }
}
