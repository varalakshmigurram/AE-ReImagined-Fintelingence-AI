package com.adf.ruleengine.service.embedded;

import com.adf.ruleengine.model.embedded.OfferConfigSnapshot;
import com.adf.ruleengine.repository.embedded.OfferConfigSnapshotRepository;
import com.adf.ruleengine.service.excel.ExcelConfigParserService;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class OfferConfigService {

    private final ExcelConfigParserService parser;
    private final OfferConfigSnapshotRepository offerConfigRepo;
    private final ObjectMapper objectMapper;

    @Transactional
    public Map<String, Object> loadFromExcel(MultipartFile file, String uploadedBy) throws Exception {
        // 1. Parse Excel
        ExcelConfigParserService.ParsedOfferConfig parsed = parser.parse(file);
        if (!parsed.valid) {
            throw new RuntimeException("Excel parsing failed: " + parsed.errorMessage);
        }

        // 2. Generate batchId
        String batchId = UUID.randomUUID().toString();

        // 3. Deactivate old snapshots
        offerConfigRepo.deactivateAll();

        // 4. Save each config section as a snapshot
        Map<String, Object> sections = new LinkedHashMap<>();
        saveSection(batchId, "EXTERNAL_BAND", parsed.externalBands, parsed, uploadedBy, sections);
        saveSection(batchId, "INTERNAL_BAND", parsed.internalBands, parsed, uploadedBy, sections);
        saveSection(batchId, "CREDIT_GRADE_LOOKUP", parsed.creditGradeLookup, parsed, uploadedBy, sections);
        saveSection(batchId, "CREDIT_GRADE_OFFER", parsed.creditGradeOffers, parsed, uploadedBy, sections);
        saveSection(batchId, "TENOR_OPTIONS", parsed.tenorOptions, parsed, uploadedBy, sections);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("batchId", batchId);
        result.put("strategyVersion", parsed.strategyVersion);
        result.put("sourceFilename", parsed.sourceFilename);
        result.put("sectionsLoaded", sections.keySet());
        result.put("success", true);
        result.put("config", parsed.toJsonMap());

        log.info("Offer config loaded — batchId={}, version={}, file={}", batchId, parsed.strategyVersion, parsed.sourceFilename);
        return result;
    }

    private void saveSection(String batchId, String configType, Object data,
                             ExcelConfigParserService.ParsedOfferConfig parsed,
                             String uploadedBy, Map<String, Object> sections) throws Exception {
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
            } catch (Exception e) {
                log.warn("Failed to deserialize config section {}", snap.getConfigType());
            }
        }
        return result;
    }

    private String sha256(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(input.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : hash) hex.append(String.format("%02x", b));
            return hex.toString();
        } catch (Exception e) { return ""; }
    }
}
