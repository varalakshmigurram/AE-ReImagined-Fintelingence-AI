package com.adf.ruleengine.service;

import com.adf.ruleengine.model.ChannelConstraint;
import com.adf.ruleengine.model.Rule;
import com.adf.ruleengine.model.StateConstraint;
import com.adf.ruleengine.repository.ChannelConstraintRepository;
import com.adf.ruleengine.repository.RuleRepository;
import com.adf.ruleengine.repository.StateConstraintRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class DataSeedService implements CommandLineRunner {

    private final RuleRepository ruleRepository;
    private final StateConstraintRepository stateRepo;
    private final ChannelConstraintRepository channelRepo;

    @Override
    public void run(String... args) {
        seedRules();
        seedStateConstraints();
        seedChannelConstraints();
        log.info("✅ AE Rule Engine data seeded successfully.");
    }

    private void seedRules() {
        if (ruleRepository.count() > 0) return;

        List<Rule> rules = Arrays.asList(
            rule("AE_INVALID_STATE", "1", "Check if customer is from FEB states (List available in UW sheet)",
                 "All", null, "1", Rule.RulePhase.BEFORE_DATA_PULL),
            rule("AE_INVALID_ADDRESS", "1a", "If address is PO BOX, then reject the lead",
                 "All", null, "1", Rule.RulePhase.BEFORE_DATA_PULL),
            rule("AE_INVALID_REQUSET_AMOUNT", "2a", "If requested loan amount > Cutoff, then reject the lead. Segments: CMPQ/CMACT=$15,000 | QS/ML=$10,000 | CKPQ=$2,000 | MO=$1,000 | LT=$8,000",
                 "CMPQ, CMACT, QS, ML, CKPQ, MO, LT", "CMPQ/CMACT=15000, QS/ML=10000, CKPQ=2000, MO=1000, LT=8000", "1", Rule.RulePhase.BEFORE_DATA_PULL),
            rule("AE_PTSMI", "3", "PTSMI rule: IF (repayment amount / customer stated monthly income) > Cutoff then reject. APR=59.5%, Term=36m, State min loan amount",
                 "Segment_flag = Others", "0.115", "1", Rule.RulePhase.BEFORE_DATA_PULL),
            rule("AE_LTI", "4", "LTI rule: Assuming state min loan amount, If (loan amount / customer stated annual income) > Cutoff then reject the lead",
                 "Segment_flag = Others", "0.3", "1", Rule.RulePhase.BEFORE_DATA_PULL),
            rule("AE_DEDUPE_DAYS", "5", "Dedup: A customer already seen in last 30 days and not offered in any affiliate channel - reject the lead",
                 "All channels except QS", null, "1", Rule.RulePhase.BEFORE_DATA_PULL),
            rule("AE_NEGATIVE_FILE", "6", "Check in negative file: If customer is in negative file, reject the lead",
                 "All", null, "1", Rule.RulePhase.BEFORE_DATA_PULL),
            rule("AE_QS_Low_AnnualIncome_CreditRating", "8", "If (Stated annualIncome <= $42,000 & Credit Rating <= 540), reject. Apply for 90% of leads",
                 "QS", "cutoff1=42000, cutoff2=540", "0.9", Rule.RulePhase.BEFORE_DATA_PULL),
            rule("AE_ASSIGNED_CREDIT_SCORE", "9", "If FICO Score <= Cutoff, reject the lead. Apply to 100% of LT leads",
                 "LT", "550", "1", Rule.RulePhase.BEFORE_DATA_PULL),
            rule("AE_LOW_INCOME", "10a", "If customer stated income <= Cutoff, reject. MO/ML/CKPQ=$25,000 | LT=$24,000 | QS=$42,000",
                 "MO, ML, CKPQ, LT, QS", "MO/ML/CKPQ=25000, LT=24000, QS=42000", "1", Rule.RulePhase.BEFORE_DATA_PULL),
            rule("AE_TUSOFT_NO_HIT", "7a", "If TU no hit, reject the customer",
                 "All", null, "1", Rule.RulePhase.TU_PULL),
            rule("AE_TUSOFT_VANTAGE_SCORE", "7b1", "If Vantage score < Cutoff, reject. All=500, CKPQ/Others=580, MO/Others=531",
                 "All", "All=500, CKPQ/Others=580, MO/Others=531", "1", Rule.RulePhase.TU_PULL),
            rule("AE_TUSOFT_CV_SCORE", "7c1", "If CV score < Cutoff, reject. All=500, MO/Others=585, ML/E1E2=0=576, E1_E2=570",
                 "All", "All=500, MO/Others=585, ML/E1E2_flag=0=576, E1_E2=570", "1", Rule.RulePhase.TU_PULL),
            rule("AE_TUSOFT_SUSPECT_SCORE_CV", "7d1", "Suspicious Credit Scores: If CV score > Cutoff, reject. Others=720, E1_E2=700",
                 "All", "Others=720, E1_E2=700", "1", Rule.RulePhase.TU_PULL),
            rule("AE_TUSOFT_SUSPECT_SCORE_VANTAGE", "7e1", "Suspicious Credit Scores: If Vantage Score > Cutoff, reject. Others=750, CKPQ/Others=650, MO/Others=600, E1_E2=700",
                 "All", "Others=750, CKPQ/Others=650, MO/Others=600, E1_E2=700", "1", Rule.RulePhase.TU_PULL),
            rule("AE_TUSOFT_STUDENT_LOAN", "7f", "Student Loan rule: If (SG68S > 0 AND SG34S='Y'), reject the lead",
                 "All", null, "1", Rule.RulePhase.TU_PULL),
            rule("AE_THIN_FILE_RULE", "7g", "Thin File: CKPQ/Others - if G106S <= 45, reject",
                 "CKPQ and Segment_flag = Others", "Cutoff1=45", "1", Rule.RulePhase.TU_PULL),
            rule("AE_RISK_RULE", "7i2", "Thin File Risk: Non-Student Trades = AT01S - ST01S. If (Non-Student Trades <= 6 or AT20S <= 50), reject",
                 "CKPQ, LT, ML, MO, QS and Segment_flag = Others", "Cutoff1=6, Cutoff2=50", null, Rule.RulePhase.TU_PULL),
            rule("AE_HighChargeOffTrades", "7j1", "If CO02S (charged-off trades in past 12m) > 6, reject",
                 "Segment_flag = E1_E2", "Cutoff=6", "1", Rule.RulePhase.TU_PULL),
            rule("AE_CREDIT_GRADE_REQUEST_AMOUNT", "a", "If requested loan amount > Cutoff, reject the lead",
                 "AE_Credit_Grade in E1_E2", "Cutoff=6000", "100%", Rule.RulePhase.POST_CREDIT_GRADE),
            rule("AE_CREDIT_GRADE_CHARGE_OFF_TRADES", "b", "If CO025 (Number of charged-off trades in past 12 months) > Cutoff then Reject the Lead",
                 "AE_Credit_Grade in E1_E2", "Cutoff: 6", "100%", Rule.RulePhase.POST_CREDIT_GRADE),
            rule("AE_CREDIT_GRADE_UNSECURED_INSTALLMENT", "c", "If US015 (Number of unsecured installment trades) < Cutoff or -ve or empty then Reject the lead",
                 "AE_Credit_Grade in E1_E2", "Cutoff: 2", "100%", Rule.RulePhase.POST_CREDIT_GRADE),
            rule("AE_CREDIT_GRADE_DELINQUENT_TRADES", "d", "If SQ515 (Percentage of trades ever delinquent) > Cutoff or -ve or empty then Reject the lead",
                 "AE_Credit_Grade in E1_E2", "Cutoff: 50", "100%", Rule.RulePhase.POST_CREDIT_GRADE),
            rule("AE_CREDIT_GRADE_CV_SCORE", "e", "If CV score < Cutoff, reject the lead",
                 "AE_Credit_Grade in E1_E2", "Cutoff: 550", "100%", Rule.RulePhase.POST_CREDIT_GRADE),
            rule("AE_CREDIT_GRADE_SUSPECT_CV_SCORE", "f", "Suspicious Credit Scores: If (CV score > Cutoff1 [1 (1) ], reject the lead",
                 "AE_Credit_Grade in E1_E2", "Cutoff: 700", "100%", Rule.RulePhase.POST_CREDIT_GRADE),
            rule("AE_CREDIT_GRADE_SUSPECT_VANTAGE_SCORE", "g", "Suspicious Credit Scores: If (Vantage Score > Cutoff), reject the lead",
                 "AE_Credit_Grade in E1_E2", "Cutoff: 700", "100%", Rule.RulePhase.POST_CREDIT_GRADE),
            rule("AE_RECENT_BANKRUPTCY", "h", "If SQ075 (Months since recent public record bankruptcy) (excludes medical public records)) => Cutoff1 and <= Cutoff2 then Reject the Lead",
                 "AE_Credit_Grade in E1_E2", "Cutoff 1: 0, Cutoff 2: 6", "100%", Rule.RulePhase.POST_CREDIT_GRADE),
            rule("AE_THIN_FILE_RISK_CUSTOMER", "i", "Thin File Risk Customer: If ST015 (Number of student loan trades) is null or negative, ST015 =0 \nNon-Student Trades= AT015 (Number of trades) - ST015 \nIf (Non-Student Trades <= Cutoff1 or AT205 <= Cutoff2) then select the lead",
                 "AE_Credit_Grade in E1_E2", "Cutoff 1: 6, Cutoff 2: 45", "100%", Rule.RulePhase.POST_CREDIT_GRADE),
            rule("AE_GRADE_F", "CG1", "If Customer's credit grade is 'F', reject the customer",
                 "All", null, "1", Rule.RulePhase.CREDIT_GRADE)
        );

        ruleRepository.saveAll(rules);
    }

    private Rule rule(String ruleId, String num, String desc, String segment,
                      String cutoffs, String applyPct, Rule.RulePhase phase) {
        return Rule.builder()
                .ruleId(ruleId).ruleNumber(num).description(desc)
                .applicableSegment(segment).cutoffs(cutoffs).applyPercentage(applyPct)
                .phase(phase).status(Rule.RuleStatus.ACTIVE)
                .environment(Rule.Environment.TEST)
                .approvalStatus(Rule.ApprovalStatus.APPROVED)
                .submittedBy("system").approvedBy("system")
                .build();
    }

    private void seedStateConstraints() {
        if (stateRepo.count() > 0) return;

        String[][] states = {
            {"AK"}, {"AR"}, {"AZ"}, {"CO", "OFF"}, {"DE"}, {"FL"}, {"HI"},
            {"IN"}, {"KS"}, {"KY"}, {"MN"}, {"MS"}, {"MT"}, {"MI"},
            {"NC", "OFF"}, {"NE", "OFF"}, {"NV", "OFF"}, {"OH"}, {"OK"},
            {"PA", "OFF"}, {"RI"}, {"SD", "OFF"}, {"TN"}, {"TX"},
            {"WA", "OFF"}, {"LA"}, {"CA", "OFF"}, {"SC"}, {"NM", "OFF"},
            {"UT"}, {"VA"}, {"AL"}, {"ID"}, {"MO"}
        };

        for (String[] s : states) {
            String state = s[0];
            String onOff = s.length > 1 ? s[1] : null;
            double minLoan = "HI".equals(state) ? 1600 : 1000;

            StateConstraint sc = StateConstraint.builder()
                    .stateCode(state).minLoanAmount(minLoan).maxLoanAmount(10000.0)
                    .minApr(36.0).maxApr(179.9).minTermMonths(12).maxTermMonths(36)
                    .stateOnOff(onOff)
                    .originationFeeLogic("X % of disbursal amount (refer to OF table in Offer logic tab)")
                    .environment(Rule.Environment.TEST)
                    .approvalStatus(Rule.ApprovalStatus.APPROVED)
                    .submittedBy("system").approvedBy("system")
                    .build();
            stateRepo.save(sc);
        }

        // WI has special origination fee
        StateConstraint wi = StateConstraint.builder()
                .stateCode("WI").minLoanAmount(1000.0).maxLoanAmount(10000.0)
                .minApr(36.0).maxApr(179.5).minTermMonths(12).maxTermMonths(36)
                .maxOriginationFee(175.0).maxOriginationFeePercentage(0.05)
                .originationFeeLogic("minimum($175, 5% of disbursal amount)")
                .environment(Rule.Environment.TEST)
                .approvalStatus(Rule.ApprovalStatus.APPROVED)
                .submittedBy("system").approvedBy("system")
                .build();
        stateRepo.save(wi);
    }

    private void seedChannelConstraints() {
        if (channelRepo.count() > 0) return;

        String[] channels = {"CMPQ", "CKPQ", "CMACT", "QS", "LT", "ML", "MO"};
        for (String ch : channels) {
            ChannelConstraint cc = ChannelConstraint.builder()
                    .channelCode(ch).minLoanAmount(1000.0).maxLoanAmount(10000.0)
                    .minApr(36.0).maxApr(179.9).minTermMonths(12).maxTermMonths(36)
                    .environment(Rule.Environment.TEST)
                    .approvalStatus(Rule.ApprovalStatus.APPROVED)
                    .submittedBy("system").approvedBy("system")
                    .build();
            channelRepo.save(cc);
        }
    }
}
