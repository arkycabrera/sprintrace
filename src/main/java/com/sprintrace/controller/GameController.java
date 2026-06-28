package com.sprintrace.controller;

import com.sprintrace.model.Challenge;
import com.sprintrace.service.ChallengeService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class GameController {

    private final ChallengeService challengeService;

    public GameController(ChallengeService challengeService) {
        this.challengeService = challengeService;
    }

    @GetMapping("/challenge")
    public Challenge getChallenge(@RequestParam(defaultValue = "1") int round) {
        return challengeService.getRandomChallenge(round);
    }

    @PostMapping("/answer")
    public Map<String, Object> submitAnswer(@RequestBody Map<String, String> payload) {
        int challengeId = Integer.parseInt(payload.get("challengeId"));
        String playerAnswer = payload.get("answer");

        Challenge challenge = challengeService.getAllChallenges().stream()
                .filter(c -> c.getId() == challengeId)
                .findFirst()
                .orElse(null);

        if (challenge == null) {
            return Map.of("correct", false, "message", "Challenge not found");
        }

        boolean correct = challengeService.checkAnswer(challenge, playerAnswer);
        return Map.of("correct", correct, "challengeId", challengeId);
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "SprintRace is running");
    }
}
