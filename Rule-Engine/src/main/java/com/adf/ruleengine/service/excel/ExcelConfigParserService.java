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

        // ── ExternalBand (A1:B6) ──────────────────────────────────────────────
        result.externalBands = parseExternalBands(rows);

        // ── InternalBandV11ADF (D1:E11) ────────────────────────────────────────
        result.internalBandV11ADF = parseInternalBandV11ADF(rows);

        // ── InternalBandV11Market (H2:R12) ─────────────────────────────────────
        result.internalBandV11Market = parseInternalBandV11Market(rows);

        // ── CreditGradeLookup (A15:K20) ────────────────────────────────────────
        result.creditGradeLookup = parseCreditGradeLookup(rows);

        // ── BoundaryConditions (A42:F52) ───────────────────────────────────────
        result.boundaryConditions = parseBoundaryConditions(rows);

        // ── TenorOptions (A57:C67) ─────────────────────────────────────────────
        result.tenorOptions = parseTenorOptions(rows);
    }

    private List<Map<String, String>> parseExternalBands(List<Row> rows) {
        List<Map<String, String>> externalBands = new ArrayList<>();
        // External Bands: rows 0-4, col 0 (name), col 1 (range)
        for (int i = 0; i < Math.min(5, rows.size()); i++) {
            Row row = rows.get(i);
            Cell nameCell = row.getCell(0);
            Cell rangeCell = row.getCell(1);
            
            if (nameCell != null && rangeCell != null) {
                Map<String, String> eb = new LinkedHashMap<>();
                eb.put("name", getCellValue(nameCell));
                eb.put("vantageScoreRange", getCellValue(rangeCell));
                eb.put("index", String.valueOf(i + 1));
                externalBands.add(eb);
            }
        }
        return externalBands;
    }

    private List<Map<String, String>> parseInternalBandV11ADF(List<Row> rows) {
        List<Map<String, String>> v11ADF = new ArrayList<>();
        // InternalBandV11ADF: rows 0-10, col 3-4 (D1:E11)
        for (int i = 0; i < Math.min(11, rows.size()); i++) {
            Row row = rows.get(i);
            Cell bandCell = row.getCell(3);
            Cell rangeCell = row.getCell(4);
            
            if (bandCell != null && rangeCell != null) {
                Map<String, String> entry = new LinkedHashMap<>();
                String bandName = getCellValue(bandCell);
                entry.put("index", String.valueOf(i + 1));
                entry.put("name", bandName);
                entry.put("v11AdfRange", getCellValue(rangeCell));
                v11ADF.add(entry);
            }
        }
        return v11ADF;
    }

    private List<Map<String, String>> parseInternalBandV11Market(List<Row> rows) {
        List<Map<String, String>> v11Market = new ArrayList<>();
        // InternalBandV11Market: rows 1-11, col 7-17 (H2:R12) - extract first column as market score range
        for (int i = 1; i < Math.min(12, rows.size()); i++) {
            Row row = rows.get(i);
            Map<String, String> entry = new LinkedHashMap<>();
            
            // Get market score range from first column (H)
            Cell marketCell = row.getCell(7);
            if (marketCell != null) {
                entry.put("index", String.valueOf(i));
                entry.put("marketScoreRange", getCellValue(marketCell));
                v11Market.add(entry);
            }
        }
        return v11Market;
    }

    private List<Map<String, Object>> parseCreditGradeLookup(List<Row> rows) {
        List<Map<String, Object>> lookup = new ArrayList<>();
        // CreditGradeLookup: rows 14-19 (A15:K20) - 6x11 matrix
        // Row 14 is header, rows 15-19 are data
        if (rows.size() > 19) {
            for (int i = 14; i <= 19; i++) {
                Row row = rows.get(i);
                Map<String, Object> lookupRow = new LinkedHashMap<>();
                
                Cell ebNameCell = row.getCell(0);
                lookupRow.put("externalBand", ebNameCell != null ? getCellValue(ebNameCell) : "");
                
                for (int ib = 0; ib < 10; ib++) {
                    Cell ibCell = row.getCell(ib + 1);
                    lookupRow.put("IB" + (ib + 1), ibCell != null ? getCellValue(ibCell) : "");
                }
                lookup.add(lookupRow);
            }
        }
        return lookup;
    }

    private List<Map<String, Object>> parseBoundaryConditions(List<Row> rows) {
        List<Map<String, Object>> conditions = new ArrayList<>();
        // BoundaryConditions: rows 41-51 (A42:F52) - 11x6 matrix
        // Credit grade limits (Max Loan, Tenor, APR, Monthly Payment, Org Fee)
        if (rows.size() > 51) {
            for (int i = 41; i <= 51; i++) {
                Row row = rows.get(i);
                Map<String, Object> condition = new LinkedHashMap<>();
                
                condition.put("creditGrade", getCellValue(row.getCell(0)));
                condition.put("maxLoanAmount", parseNumeric(row.getCell(1)));
                condition.put("maxTenor", parseNumeric(row.getCell(2)));
                condition.put("targetApr", parseDouble(row.getCell(3)));
                condition.put("maxMonthlyPaymentLowCF", parseDouble(row.getCell(4)));
                condition.put("maxMonthlyPaymentHighCF", parseDouble(row.getCell(5)));
                condition.put("minMonthlyPayment", 100.0);
                condition.put("orgFeePercent", parseDouble(row.getCell(5)) / 100.0);
                
                conditions.add(condition);
            }
        }
        return conditions;
    }

    private List<Map<String, Object>> parseTenorOptions(List<Row> rows) {
        List<Map<String, Object>> tenorOptions = new ArrayList<>();
        // TenorOptions: rows 56-66 (A57:C67) - 11x3 matrix
        // Loan amount ranges and available tenor options
        if (rows.size() > 66) {
            for (int i = 56; i <= 66; i++) {
                Row row = rows.get(i);
                Map<String, Object> tenor = new LinkedHashMap<>();
                
                tenor.put("minLoanAmount", parseNumeric(row.getCell(0)));
                tenor.put("maxLoanAmount", parseNumeric(row.getCell(1)));
                
                // Keep tenorOptions as comma-separated string for frontend
                String tenorStr = getCellValue(row.getCell(2));
                tenor.put("tenorOptions", tenorStr);
                
                tenorOptions.add(tenor);
            }
        }
        return tenorOptions;
    }

    private int parseNumeric(Cell cell) {
        if (cell == null) return 0;
        if (cell.getCellType() == CellType.NUMERIC) {
            return (int) cell.getNumericCellValue();
        }
        try {
            return Integer.parseInt(getCellValue(cell));
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private double parseDouble(Cell cell) {
        if (cell == null) return 0.0;
        if (cell.getCellType() == CellType.NUMERIC) {
            return cell.getNumericCellValue();
        }
        try {
            return Double.parseDouble(getCellValue(cell));
        } catch (NumberFormatException e) {
            return 0.0;
        }
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
        public List<Map<String, String>> internalBandV11ADF;
        public List<Map<String, String>> internalBandV11Market;
        public List<Map<String, Object>> creditGradeLookup;
        public List<Map<String, Object>> boundaryConditions;
        public List<Map<String, Object>> tenorOptions;

        public Map<String, Object> toJsonMap() {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("strategyVersion", strategyVersion);
            m.put("externalBands", externalBands);
            m.put("internalBandV11ADF", internalBandV11ADF);
            m.put("internalBandV11Market", internalBandV11Market);
            m.put("creditGradeLookup", creditGradeLookup);
            m.put("boundaryConditions", boundaryConditions);
            m.put("tenorOptions", tenorOptions);
            return m;
        }
    }
}
