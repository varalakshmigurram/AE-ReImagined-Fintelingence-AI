package com.adf.ruleengine.controller;

import com.adf.ruleengine.model.BypassEntry;
import com.adf.ruleengine.repository.BypassEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

@RestController
@RequestMapping("/api/bypass")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
public class BypassController {

    private final BypassEntryRepository repo;

    /** GET /api/bypass — list all entries ordered by date desc */
    @GetMapping
    public List<BypassEntry> list() {
        return repo.findAllByOrderByAddedAtDesc();
    }

    /** POST /api/bypass — add a new entry */
    @PostMapping
    public ResponseEntity<?> add(@RequestBody Map<String, String> body) {
        String ssnHash   = body.get("ssnHash");
        String ssnMasked = body.get("ssnMasked");
        String addedBy   = body.getOrDefault("addedBy", "lead-analyst");
        String reason    = body.getOrDefault("reason", "Manual entry");

        if (ssnHash == null || ssnHash.isBlank()) {
            return ResponseEntity.badRequest().body("ssnHash is required");
        }
        if (repo.existsBySsnHash(ssnHash)) {
            return ResponseEntity.badRequest().body("SSN already in bypass list");
        }
        BypassEntry entry = BypassEntry.builder()
                .ssnHash(ssnHash)
                .ssnMasked(ssnMasked != null ? ssnMasked : "XXX-XX-????")
                .addedBy(addedBy)
                .addedAt(LocalDateTime.now())
                .reason(reason)
                .isActive(true)
                .build();
        return ResponseEntity.ok(repo.save(entry));
    }

    /** POST /api/bypass/bulk — bulk import list of {ssnHash, ssnMasked, reason} */
    @PostMapping("/bulk")
    public ResponseEntity<Map<String, Object>> bulkImport(@RequestBody List<Map<String, String>> entries,
                                                           @RequestParam(defaultValue = "bulk-import") String addedBy) {
        int added = 0;
        for (Map<String, String> e : entries) {
            String hash = e.get("ssnHash");
            if (hash == null || repo.existsBySsnHash(hash)) continue;
            repo.save(BypassEntry.builder()
                    .ssnHash(hash)
                    .ssnMasked(e.getOrDefault("ssnMasked", "XXX-XX-????"))
                    .addedBy(addedBy)
                    .addedAt(LocalDateTime.now())
                    .reason(e.getOrDefault("reason", "Bulk import"))
                    .isActive(true)
                    .build());
            added++;
        }
        return ResponseEntity.ok(Map.of("added", added));
    }

    /** POST /api/bypass/lookup — check if a hashed SSN is in the active bypass list */
    @PostMapping("/lookup")
    public ResponseEntity<Map<String, Object>> lookup(@RequestBody Map<String, String> body) {
        String ssnHash = body.get("ssnHash");
        Optional<BypassEntry> match = repo.findBySsnHashAndIsActiveTrue(ssnHash);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("inBypass", match.isPresent());
        result.put("entry", match.orElse(null));
        return ResponseEntity.ok(result);
    }

    /** PATCH /api/bypass/{id}/deactivate */
    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<BypassEntry> deactivate(@PathVariable Long id) {
        return repo.findById(id).map(e -> {
            e.setIsActive(false);
            return ResponseEntity.ok(repo.save(e));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** PATCH /api/bypass/{id}/reactivate */
    @PatchMapping("/{id}/reactivate")
    public ResponseEntity<BypassEntry> reactivate(@PathVariable Long id) {
        return repo.findById(id).map(e -> {
            e.setIsActive(true);
            return ResponseEntity.ok(repo.save(e));
        }).orElse(ResponseEntity.notFound().build());
    }

    /** DELETE /api/bypass/{id} */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        if (!repo.existsById(id)) return ResponseEntity.notFound().build();
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
