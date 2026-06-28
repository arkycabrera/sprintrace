package com.sprintrace.service;

import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class VoteService {

    private final Map<Integer, Map<String, Integer>> votes = new HashMap<>();

    public void recordVote(int challengeId, String option) {
        votes.computeIfAbsent(challengeId, k -> new LinkedHashMap<>())
             .merge(option, 1, Integer::sum);
    }

    public Map<String, Integer> getVotes(int challengeId) {
        return votes.getOrDefault(challengeId, new LinkedHashMap<>());
    }

    public int getTotalVotes(int challengeId) {
        return getVotes(challengeId).values().stream().mapToInt(Integer::intValue).sum();
    }

    public String getMajority(int challengeId) {
        Map<String, Integer> v = getVotes(challengeId);
        if (v.isEmpty()) return null;
        int max = Collections.max(v.values());
        List<String> top = v.entrySet().stream()
                .filter(e -> e.getValue() == max)
                .map(Map.Entry::getKey)
                .toList();
        return top.size() == 1 ? top.get(0) : null;
    }

    public boolean isTie(int challengeId) {
        Map<String, Integer> v = getVotes(challengeId);
        if (v.isEmpty()) return false;
        int max = Collections.max(v.values());
        return v.values().stream().filter(val -> val == max).count() > 1;
    }
}
