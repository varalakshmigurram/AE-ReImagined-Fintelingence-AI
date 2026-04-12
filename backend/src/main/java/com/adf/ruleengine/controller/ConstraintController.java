package com.adf.ruleengine.controller;

import com.adf.ruleengine.dto.ConstraintDto;
import com.adf.ruleengine.service.ConstraintService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/constraints")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
public class ConstraintController {

    private final ConstraintService constraintService;

    // ─── State ───────────────────────────────────────────────────────────

    @GetMapping("/states")
    public List<ConstraintDto.StateResponse> getStates(@RequestParam(required = false) String env) {
        return constraintService.getStateConstraints(env);
    }

    @GetMapping("/states/pending")
    public List<ConstraintDto.StateResponse> getPendingStates() {
        return constraintService.getPendingStateConstraints();
    }

    @PostMapping("/states")
    public ResponseEntity<ConstraintDto.StateResponse> upsertState(
            @RequestBody ConstraintDto.StateRequest request,
            @RequestParam(defaultValue = "system") String user) {
        return ResponseEntity.ok(constraintService.createOrUpdateStateConstraint(request, user));
    }

    @PostMapping("/states/{id}/submit")
    public ResponseEntity<ConstraintDto.StateResponse> submitState(
            @PathVariable Long id,
            @RequestParam(defaultValue = "system") String user) {
        return ResponseEntity.ok(constraintService.submitStateForReview(id, user));
    }

    @PostMapping("/states/{id}/review")
    public ResponseEntity<ConstraintDto.StateResponse> reviewState(
            @PathVariable Long id,
            @RequestBody ConstraintDto.ReviewRequest req) {
        return ResponseEntity.ok(constraintService.reviewStateConstraint(id, req));
    }

    @PostMapping("/states/{id}/promote")
    public ResponseEntity<ConstraintDto.StateResponse> promoteState(
            @PathVariable Long id,
            @RequestParam(defaultValue = "system") String user) {
        return ResponseEntity.ok(constraintService.promoteStateToProduction(id, user));
    }

    // ─── Channel ─────────────────────────────────────────────────────────

    @GetMapping("/channels")
    public List<ConstraintDto.ChannelResponse> getChannels(@RequestParam(required = false) String env) {
        return constraintService.getChannelConstraints(env);
    }

    @GetMapping("/channels/pending")
    public List<ConstraintDto.ChannelResponse> getPendingChannels() {
        return constraintService.getPendingChannelConstraints();
    }

    @PostMapping("/channels")
    public ResponseEntity<ConstraintDto.ChannelResponse> upsertChannel(
            @RequestBody ConstraintDto.ChannelRequest request,
            @RequestParam(defaultValue = "system") String user) {
        return ResponseEntity.ok(constraintService.createOrUpdateChannelConstraint(request, user));
    }

    @PostMapping("/channels/{id}/submit")
    public ResponseEntity<ConstraintDto.ChannelResponse> submitChannel(
            @PathVariable Long id,
            @RequestParam(defaultValue = "system") String user) {
        return ResponseEntity.ok(constraintService.submitChannelForReview(id, user));
    }

    @PostMapping("/channels/{id}/review")
    public ResponseEntity<ConstraintDto.ChannelResponse> reviewChannel(
            @PathVariable Long id,
            @RequestBody ConstraintDto.ReviewRequest req) {
        return ResponseEntity.ok(constraintService.reviewChannelConstraint(id, req));
    }

    @PostMapping("/channels/{id}/promote")
    public ResponseEntity<ConstraintDto.ChannelResponse> promoteChannel(
            @PathVariable Long id,
            @RequestParam(defaultValue = "system") String user) {
        return ResponseEntity.ok(constraintService.promoteChannelToProduction(id, user));
    }
}
