package com.sprintrace.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sprintrace.model.Challenge;
import jakarta.annotation.PostConstruct;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.stream.Collectors;

@Service
public class ChallengeService {

    private final List<Challenge> challenges = new ArrayList<>();
    private final Random random = new Random();

    @PostConstruct
    public void loadChallenges() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        ClassPathResource resource = new ClassPathResource("challenges.json");
        Map<?, ?> root = mapper.readValue(resource.getInputStream(), Map.class);
        List<?> array = (List<?>) root.get("challenges");

        for (Object item : array) {
            Challenge c = mapper.convertValue(item, Challenge.class);
            if (c.isEnabled()) {
                challenges.add(c);
            }
        }
    }

    public Challenge getRandomChallenge(int round) {
        int difficulty = round <= 3 ? 1 : 2;
        List<Challenge> pool = challenges.stream()
                .filter(c -> c.getDifficulty() == difficulty)
                .collect(Collectors.toList());
        return pool.get(random.nextInt(pool.size()));
    }

    public boolean checkAnswer(Challenge challenge, String playerAnswer) {
        if (challenge.getAnswer() == null) return false;

        if ("estimation".equals(challenge.getType())) {
            try {
                int correct = Integer.parseInt(challenge.getAnswer().toString());
                int given = Integer.parseInt(playerAnswer.trim());
                int tolerance = challenge.getTolerance() != null ? challenge.getTolerance() : 0;
                return Math.abs(correct - given) <= tolerance;
            } catch (NumberFormatException e) {
                return false;
            }
        }

        if ("sequence".equals(challenge.getType())) {
            String[] given = playerAnswer.split(",");
            Object answer = challenge.getAnswer();
            if (answer instanceof List<?> correct) {
                if (given.length != correct.size()) return false;
                for (int i = 0; i < given.length; i++) {
                    if (!given[i].trim().equalsIgnoreCase(correct.get(i).toString().trim())) return false;
                }
                return true;
            }
            return false;
        }

        return challenge.getAnswer().toString().trim()
                .equalsIgnoreCase(playerAnswer.trim());
    }

    public List<Challenge> getAllChallenges() {
        return challenges;
    }
}
