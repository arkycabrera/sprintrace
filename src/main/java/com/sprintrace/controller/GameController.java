package com.sprintrace.controller;

import com.sprintrace.model.Challenge;
import com.sprintrace.service.ChallengeService;
import com.sprintrace.service.VoteService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class GameController {

    private final ChallengeService challengeService;
    private final VoteService voteService;

    public GameController(ChallengeService challengeService, VoteService voteService) {
        this.challengeService = challengeService;
        this.voteService = voteService;
    }

    @GetMapping("/challenges")
    public List<Challenge> getAllChallenges() {
        return challengeService.getAllChallenges();
    }

    @PostMapping("/answer")
    public Map<String, Object> submitAnswer(@RequestBody Map<String, String> payload) {
        int challengeId = Integer.parseInt(payload.get("challengeId"));
        String playerAnswer = payload.get("answer");

        voteService.recordVote(challengeId, playerAnswer);

        Map<String, Integer> votes = voteService.getVotes(challengeId);
        int totalVotes = voteService.getTotalVotes(challengeId);
        String majority = voteService.getMajority(challengeId);
        boolean tie = voteService.isTie(challengeId);
        boolean pointAwarded = !tie && playerAnswer.equals(majority);

        return Map.of(
                "playerChoice", playerAnswer,
                "majority", majority != null ? majority : "",
                "isTie", tie,
                "pointAwarded", pointAwarded,
                "votes", votes,
                "totalVotes", totalVotes
        );
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "SprintRace is running");
    }
}
