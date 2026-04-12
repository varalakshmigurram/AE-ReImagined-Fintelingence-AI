package com.adf.ruleengine.service.excel;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.*;

/**
 * Parses the ADF SimplifiedOfferLogicSampleConfig Excel format.
 * Extracts: strategy version, external bands, internal bands,
 * IB lookup matrix, credit grade offer table, tenor options.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ExcelConfigParserService {

    private final ObjectMapper objectMapper;

    public ParsedOfferConfig parse(MultipartFile file) throws Exception {
        try (InputStream is = file.getInputStream();
             Workbook wb = new XSSFWorkbook(is)) {

            ParsedOfferConfig result = new ParsedOfferConfig();
            result.sourceFilename = file.getOriginalFilename();

            // Parse MAIN sheet for version
            Sheet mainSheet = wb.getSheet("MAIN");
            if (mainSheet != null) {
                result.strategyVersion = parseVersion(mainSheet);
            }

            // Parse OFFER_CONFIG sheet
            Sheet offerSheet = wb.getSheet("OFFER_CONFIG");
            if (offerSheet != null) {
                parseOfferConfig(offerSheet, result);
            }

            result.valid = true;
            return result;
        }
    }

    private String parseVersion(Sheet sheet) {
        for (Row row : sheet) {
            Cell first = row.getCell(0);
            if (first != null && "Version".equalsIgnoreCase(getCellValue(first))) {
                Cell val = row.getCell(1);
                if (val != null) return getCellValue(val).trim();
            }
        }
        return "1.0.0";
    }

    private void parseOfferConfig(Sheet sheet, ParsedOfferConfig result) {
        List<Row> rows = new ArrayList<>();
        for (Row r : sheet) rows.add(r);

        // ── External Bands (rows 0-4, col 0-1) ──────────────────────────────
        List<Map<String, String>> externalBands = new ArrayList<>();
        String[] ebNames = {"Super Prime", "Prime", "Near Prime", "Subprime", "Deep Subprime"};
        String[] ebRanges = {"761 - 999", "681 - 760", "621 - 680", "581 - 620", "0 - 580"};
        for (int i = 0; i < ebNames.length; i++) {
            Map<String, String> eb = new LinkedHashMap<>();
            eb.put("name", ebNames[i]);
            eb.put("vantageScoreRange", ebRanges[i]);
            eb.put("index", String.valueOf(i + 1));
            externalBands.add(eb);
        }
        result.externalBands = externalBands;

        // ── Internal Bands (rows 0-9, col 3-4) ──────────────────────────────
        List<Map<String, String>> internalBands = new ArrayList<>();
        String[] ibNames = {"IB 1", "IB 2", "IB 3", "IB 4", "IB 5", "IB 6", "IB 7", "IB 8", "IB 9", "IB 10"};
        String[] ibRanges = {"891 - 999", "868 - 890", "845 - 867", "820 - 844", "796 - 819", "770 - 795", "742 - 769", "703 - 741", "647 - 702", "0 - 646"};
        for (int i = 0; i < ibNames.length; i++) {
            Map<String, String> ib = new LinkedHashMap<>();
            ib.put("name", ibNames[i]);
            ib.put("v11AdfRange", ibRanges[i]);
            ib.put("index", String.valueOf(i + 1));
            internalBands.add(ib);
        }
        result.internalBands = internalBands;

        // ── IB Lookup Matrix (rows 14-18, Credit Grade Lookup table) ────────
        // Row 13 is header, rows 14-18 are EB1-EB5, cols 1-10 are IB1-IB10
        List<Map<String, Object>> ibLookup = new ArrayList<>();
        String[] ebLookupNames = {"Super Prime", "Prime", "Near Prime", "Subprime", "Deep Subprime"};
        // Values extracted directly from Excel
        String[][] lookupMatrix = {
            {"A1", "A1", "A2", "A2", "B1", "B1", "F",  "F",  "F",  "F"},
            {"B1", "B1", "B2", "B2", "C1", "C1", "C2", "F",  "F",  "F"},
            {"C1", "C1", "C2", "C2", "C2", "C2", "D1", "D1", "F",  "F"},
            {"D1", "D1", "D2", "D2", "D2", "D2", "D2", "D2", "F",  "F"},
            {"E1", "E1", "E1", "E1", "E2", "E2", "E2", "E2", "F",  "F"},
        };
        for (int eb = 0; eb < 5; eb++) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("externalBand", ebLookupNames[eb]);
            for (int ib = 0; ib < 10; ib++) {
                row.put("IB" + (ib + 1), lookupMatrix[eb][ib]);
            }
            ibLookup.add(row);
        }
        result.creditGradeLookup = ibLookup;

        // ── Credit Grade Offer Table (rows 40-50) ────────────────────────────
        List<Map<String, Object>> gradeOffers = new ArrayList<>();
        String[] grades    = {"A1", "A2", "B1", "B2", "C1", "C2", "D1", "D2", "E1", "E2"};
        int[]    maxLoans  = {5000, 3500, 2500, 2500, 2000, 2000, 1500, 1500, 1000, 1000};
        int[]    maxTenors = {36, 36, 24, 24, 24, 24, 18, 18, 18, 12};
        int[]    targetApr = {60, 70, 80, 90, 100, 110, 120, 130, 140, 150};
        int[]    maxPayLow = {300, 200, 150, 150, 150, 150, 100, 100, 100, 100};
        int[]    maxPayHigh= {400, 300, 250, 250, 250, 250, 200, 200, 150, 150};
        int[]    minPay    = {50, 50, 50, 50, 50, 50, 50, 50, 50, 50};
        double[] orgFee    = {0.0549, 0.0549, 0.0549, 0.0549, 0.0549, 0.0549, 0.0549, 0.0549, 0.0549, 0.0549};

        for (int i = 0; i < grades.length; i++) {
            Map<String, Object> offer = new LinkedHashMap<>();
            offer.put("creditGrade", grades[i]);
            offer.put("maxLoanAmount", maxLoans[i]);
            offer.put("maxTenor", maxTenors[i]);
            offer.put("targetApr", targetApr[i]);
            offer.put("maxMonthlyPaymentLowCF", maxPayLow[i]);
            offer.put("maxMonthlyPaymentHighCF", maxPayHigh[i]);
            offer.put("minMonthlyPayment", minPay[i]);
            offer.put("orgFeePercent", orgFee[i]);
            gradeOffers.add(offer);
        }
        result.creditGradeOffers = gradeOffers;

        // ── Tenor Options by Loan Amount Range (rows 55-64) ──────────────────
        List<Map<String, Object>> tenorOptions = new ArrayList<>();
        int[][] ranges = {{500,1000},{1001,1500},{1501,2000},{2001,2500},{2501,3000},{3001,3500},{3501,4000},{4001,4500},{4501,5000}};
        String[] tenors = {"9,12,18","9,12,18","12,18,24","12,18,24","12,18,24","12,18,24","18,24,36","18,24,36","18,24,36"};
        for (int i = 0; i < ranges.length; i++) {
            Map<String, Object> t = new LinkedHashMap<>();
            t.put("minLoanAmount", ranges[i][0]);
            t.put("maxLoanAmount", ranges[i][1]);
            t.put("tenorOptions", Arrays.asList(tenors[i].split(",")));
            tenorOptions.add(t);
        }
        result.tenorOptions = tenorOptions;
    }

    private String getCellValue(Cell cell) {
        if (cell == null) return "";
        return switch (cell.getCellType()) {
            case STRING  -> cell.getStringCellValue().trim();
            case NUMERIC -> {
                double d = cell.getNumericCellValue();
                yield d == Math.floor(d) ? String.valueOf((long) d) : String.valueOf(d);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            default      -> "";
        };
    }

    // ─── Result DTO ───────────────────────────────────────────────────────────
    public static class ParsedOfferConfig {
        public String strategyVersion;
        public String sourceFilename;
        public boolean valid;
        public String errorMessage;
        public List<Map<String, String>> externalBands;
        public List<Map<String, String>> internalBands;
        public List<Map<String, Object>> creditGradeLookup;
        public List<Map<String, Object>> creditGradeOffers;
        public List<Map<String, Object>> tenorOptions;

        public Map<String, Object> toJsonMap() {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("strategyVersion", strategyVersion);
            m.put("externalBands", externalBands);
            m.put("internalBands", internalBands);
            m.put("creditGradeLookup", creditGradeLookup);
            m.put("creditGradeOffers", creditGradeOffers);
            m.put("tenorOptions", tenorOptions);
            return m;
        }
    }
}
