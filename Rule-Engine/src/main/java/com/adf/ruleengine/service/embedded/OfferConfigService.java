package com.adf.ruleengine.service.embedded;

import com.adf.ruleengine.exception.OfferConfigException;
import com.adf.ruleengine.model.embedded.OfferConfigSnapshot;
import com.adf.ruleengine.repository.embedded.OfferConfigSnapshotRepository;
import com.adf.ruleengine.service.excel.ExcelConfigParserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.JsonProcessingException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class OfferConfigService {

    private final ExcelConfigParserService parser;
    private final OfferConfigSnapshotRepository offerConfigRepo;
    private final ObjectMapper objectMapper;

    @Transactional
    public Map<String, Object> loadFromExcel(MultipartFile file, String uploadedBy) throws OfferConfigException {
        // 1. Parse Excel
        ExcelConfigParserService.ParsedOfferConfig parsed;
        try {
            parsed = parser.parse(file);
        } catch (Exception e) {
            throw new OfferConfigException("Failed to parse Excel file", e);
        }
        if (!parsed.valid) {
            throw new OfferConfigException("Excel parsing failed: " + parsed.errorMessage);
        }

        // 2. Generate batchId
        String batchId = UUID.randomUUID().toString();

        // 3. Deactivate old snapshots
        offerConfigRepo.deactivateAll();

        // 4. Save each config section as a snapshot
        Map<String, Object> sections = new LinkedHashMap<>();
        saveSection(batchId, "EXTERNAL_BAND", parsed.externalBands, parsed, uploadedBy, sections);
        saveSection(batchId, "INTERNAL_BAND_V11_ADF", parsed.internalBandV11ADF, parsed, uploadedBy, sections);
        saveSection(batchId, "INTERNAL_BAND_V11_MARKET", parsed.internalBandV11Market, parsed, uploadedBy, sections);
        saveSection(batchId, "CREDIT_GRADE_LOOKUP", parsed.creditGradeLookup, parsed, uploadedBy, sections);
        saveSection(batchId, "BOUNDARY_CONDITIONS", parsed.boundaryConditions, parsed, uploadedBy, sections);
        saveSection(batchId, "TENOR_OPTIONS", parsed.tenorOptions, parsed, uploadedBy, sections);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("batchId", batchId);
        result.put("strategyVersion", parsed.strategyVersion);
        result.put("sourceFilename", parsed.sourceFilename);
        result.put("sectionsLoaded", sections.keySet());
        result.put("success", true);
        
        // Merge config and add merged internalBands
        Map<String, Object> config = parsed.toJsonMap();
        config.put("internalBands", mergeInternalBands(parsed.internalBandV11ADF, parsed.internalBandV11Market));
        result.put("config", config);

        log.info("Offer config loaded — batchId={}, version={}, file={}", batchId, parsed.strategyVersion, parsed.sourceFilename);
        return result;
    }

    private void saveSection(String batchId, String configType, Object data,
                             ExcelConfigParserService.ParsedOfferConfig parsed,
                             String uploadedBy, Map<String, Object> sections) throws OfferConfigException {
        try {
            String json = objectMapper.writeValueAsString(data);
            OfferConfigSnapshot snap = OfferConfigSnapshot.builder()
                .batchId(batchId)
                .strategyVersion(parsed.strategyVersion)
                .configType(configType)
                .rawJson(json)
                .checksum(sha256(json))
                .isActive(true)
                .uploadedBy(uploadedBy)
                .sourceFilename(parsed.sourceFilename)
                .build();
            offerConfigRepo.save(snap);
            sections.put(configType, data);
        } catch (JsonProcessingException e) {
            throw new OfferConfigException("Failed to serialize config section " + configType, e);
        }
    }

    public Map<String, Object> getActiveConfig() {
        List<OfferConfigSnapshot> active = offerConfigRepo.findByIsActiveTrueOrderByCreatedAtDesc();
        Map<String, Object> result = new LinkedHashMap<>();
        for (OfferConfigSnapshot snap : active) {
            try {
                Object data = objectMapper.readValue(snap.getRawJson(), Object.class);
                result.put(snap.getConfigType(), data);
                result.put("batchId", snap.getBatchId());
                result.put("strategyVersion", snap.getStrategyVersion());
            } catch (JsonProcessingException e) {
                log.warn("Failed to deserialize config section {}", snap.getConfigType(), e);
            }
        }
        return result;
    }

    private String sha256(String input) throws OfferConfigException {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new OfferConfigException("SHA-256 algorithm not available", e);
        }
    }

    private List<Map<String, Object>> mergeInternalBands(List<Map<String, String>> v11AdfBands, List<Map<String, String>> v11MarketBands) {
        List<Map<String, Object>> merged = new ArrayList<>();
        
        if (v11AdfBands == null || v11AdfBands.isEmpty()) {
            return merged;
        }
        
        // Create a map of market data by index for quick lookup
        Map<String, Map<String, String>> marketByIndex = new HashMap<>();
        if (v11MarketBands != null) {
            for (Map<String, String> market : v11MarketBands) {
                String index = market.get("index");
                if (index != null) {
                    marketByIndex.put(index, market);
                }
            }
        }
        
        // Merge V11 ADF with Market data
        for (Map<String, String> adfBand : v11AdfBands) {
            Map<String, Object> mergedBand = new LinkedHashMap<>(adfBand);
            String index = adfBand.get("index");
            
            if (index != null && marketByIndex.containsKey(index)) {
                Map<String, String> marketBand = marketByIndex.get(index);
                mergedBand.put("marketScoreRange", marketBand.get("marketScoreRange"));
            } else {
                mergedBand.put("marketScoreRange", "—");
            }
            
            merged.add(mergedBand);
        }
        
        return merged;
    }
}
