package com.sprintrace.service;

import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class GameStateService {

    public enum Phase { LOBBY, QUESTION, FINISHED }

    private volatile int currentRound = 0;
    private volatile Phase phase = Phase.LOBBY;
    private List<Integer> challengeQueue = new ArrayList<>();

    public synchronized Map<String, Object> startGame(List<Integer> allIds) {
        List<Integer> shuffled = new ArrayList<>(allIds);
        Collections.shuffle(shuffled);
        challengeQueue = new ArrayList<>(shuffled.subList(0, Math.min(15, shuffled.size())));
        currentRound = 1;
        phase = Phase.QUESTION;
        return getState();
    }

    public synchronized Map<String, Object> advance() {
        if (currentRound >= challengeQueue.size()) {
            phase = Phase.FINISHED;
        } else {
            currentRound++;
            phase = Phase.QUESTION;
        }
        return getState();
    }

    public synchronized Map<String, Object> reset() {
        currentRound = 0;
        phase = Phase.LOBBY;
        challengeQueue.clear();
        return getState();
    }

    public List<Integer> getChallengeQueue() { return challengeQueue; }
    public int getCurrentRound() { return currentRound; }
    public Phase getPhase() { return phase; }

    public Map<String, Object> getState() {
        return Map.of("round", currentRound, "phase", phase.name());
    }
}
