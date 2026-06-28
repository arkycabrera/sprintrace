package com.sprintrace.controller;

import com.sprintrace.model.Challenge;
import com.sprintrace.service.ChallengeService;
import com.sprintrace.service.GameStateService;
import com.sprintrace.service.VoteService;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class GameController {

    private final ChallengeService challengeService;
    private final VoteService voteService;
    private final GameStateService gameStateService;

    public GameController(ChallengeService challengeService, VoteService voteService, GameStateService gameStateService) {
        this.challengeService = challengeService;
        this.voteService = voteService;
        this.gameStateService = gameStateService;
    }

    @GetMapping("/challenges")
    public List<Challenge> getAllChallenges() {
        return challengeService.getAllChallenges();
    }

    // Returns ordered list of challenges for the current game session
    @GetMapping("/game/challenges")
    public List<Challenge> getGameChallenges() {
        List<Integer> queue = gameStateService.getChallengeQueue();
        if (queue.isEmpty()) return Collections.emptyList();
        Map<Integer, Challenge> byId = challengeService.getAllChallenges().stream()
                .collect(Collectors.toMap(Challenge::getId, c -> c));
        return queue.stream().map(byId::get).filter(Objects::nonNull).collect(Collectors.toList());
    }

    @GetMapping("/game/state")
    public Map<String, Object> getGameState() {
        return gameStateService.getState();
    }

    @PostMapping("/game/start")
    public Map<String, Object> startGame() {
        List<Integer> allIds = challengeService.getAllChallenges().stream()
                .map(Challenge::getId).collect(Collectors.toList());
        voteService.reset();
        return gameStateService.startGame(allIds);
    }

    @PostMapping("/game/advance")
    public Map<String, Object> advanceGame() {
        return gameStateService.advance();
    }

    @PostMapping("/game/reset")
    public Map<String, Object> resetGame() {
        voteService.reset();
        return gameStateService.reset();
    }

    // Current votes for the GM live dashboard (current round's challenge)
    @GetMapping("/game/current-votes")
    public Map<String, Object> getCurrentVotes() {
        int round = gameStateService.getCurrentRound();
        List<Integer> queue = gameStateService.getChallengeQueue();
        if (round <= 0 || round > queue.size()) {
            return Map.of("votes", Map.of(), "totalVotes", 0, "majority", "", "isTie", false);
        }
        int challengeId = queue.get(round - 1);
        Map<String, Integer> votes = voteService.getVotes(challengeId);
        int totalVotes = voteService.getTotalVotes(challengeId);
        String majority = voteService.getMajority(challengeId);
        boolean tie = voteService.isTie(challengeId);
        return Map.of(
                "votes", votes,
                "totalVotes", totalVotes,
                "majority", majority != null ? majority : "",
                "isTie", tie
        );
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
