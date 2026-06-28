// ===== STATE =====
const MAX_ROUNDS = 15;
const LEADERBOARD_AT = [5, 10, 15];

const state = {
    playerName: '',
    round: 1,
    score: 0,
    challengeQueue: [],
    currentChallenge: null,
    selectedOption: null,
    timer: null,
    lobbyTimer: null,
    timeRemaining: 0,
    timerTotal: 0,
    leaderboardIsFinal: false
};

// ===== SCREENS =====
function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById('screen-' + id).classList.add('active');
}

// ===== JOIN =====
function joinGame() {
    const input = document.getElementById('player-name');
    const name = input.value.trim();
    if (!name) {
        input.classList.add('shake');
        input.focus();
        setTimeout(() => input.classList.remove('shake'), 400);
        return;
    }
    state.playerName = name;
    state.round = 1;
    state.score = 0;
    showLobby();
}

document.getElementById('player-name').addEventListener('keypress', e => {
    if (e.key === 'Enter') joinGame();
});

// ===== LOBBY =====
function showLobby() {
    showScreen('lobby');
    document.getElementById('lobby-avatar').textContent = state.playerName.charAt(0).toUpperCase();
    document.getElementById('lobby-welcome').textContent = `Welcome, ${state.playerName}!`;

    let count = 30;
    const el = document.getElementById('lobby-countdown');
    el.textContent = count;

    loadChallenges();

    state.lobbyTimer = setInterval(() => {
        count--;
        if (count <= 0) { clearInterval(state.lobbyTimer); startChallenge(); }
        else el.textContent = count;
    }, 1000);
}

async function letsGo() {
    clearInterval(state.lobbyTimer);
    if (state.challengeQueue.length === 0) await loadChallenges();
    startChallenge();
}

async function loadChallenges() {
    try {
        const res = await fetch('/api/challenges');
        const all = await res.json();
        state.challengeQueue = all.sort(() => Math.random() - 0.5).slice(0, MAX_ROUNDS);
    } catch (err) {
        console.error('Failed to load challenges', err);
    }
}

// ===== CHALLENGE =====
function startChallenge() {
    showScreen('challenge');
    document.getElementById('round-badge').textContent = `Round ${state.round} of ${MAX_ROUNDS}`;
    document.getElementById('score-display').textContent = state.score;
    document.getElementById('btn-submit').disabled = false;
    state.selectedOption = null;

    const challenge = state.challengeQueue[state.round - 1];
    if (!challenge) {
        document.getElementById('challenge-question').textContent = 'Could not load question. Please check the server.';
        return;
    }
    state.currentChallenge = challenge;

    document.getElementById('challenge-question').textContent = challenge.question;

    const box = document.getElementById('options-container');
    box.innerHTML = '';
    challenge.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = opt;
        btn.onclick = () => {
            document.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            state.selectedOption = opt;
        };
        box.appendChild(btn);
    });

    startTimer(challenge.timeLimit);
}

// ===== TIMER =====
function startTimer(seconds) {
    clearInterval(state.timer);
    state.timeRemaining = seconds;
    state.timerTotal = seconds;

    const bar = document.getElementById('timer-bar');
    const txt = document.getElementById('timer-text');
    bar.style.width = '100%';
    bar.classList.remove('warn');
    txt.textContent = `${seconds}s`;

    state.timer = setInterval(() => {
        state.timeRemaining--;
        const pct = (state.timeRemaining / state.timerTotal) * 100;
        bar.style.width = pct + '%';
        txt.textContent = `${state.timeRemaining}s`;
        if (pct <= 30) bar.classList.add('warn');
        if (state.timeRemaining <= 0) {
            clearInterval(state.timer);
            handleTimeout();
        }
    }, 1000);
}

function pauseTimer() { clearInterval(state.timer); }

// ===== SUBMIT =====
async function submitAnswer() {
    if (document.getElementById('btn-submit').disabled) return;
    if (!state.selectedOption) {
        const box = document.getElementById('options-container');
        box.classList.add('shake');
        setTimeout(() => box.classList.remove('shake'), 400);
        return;
    }

    pauseTimer();
    document.getElementById('btn-submit').disabled = true;

    try {
        const res = await fetch('/api/answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ challengeId: String(state.currentChallenge.id), answer: state.selectedOption })
        });
        const data = await res.json();
        showResult(data, false);
    } catch (err) {
        document.getElementById('btn-submit').disabled = false;
        startTimer(state.timeRemaining);
    }
}

async function handleTimeout() {
    document.getElementById('btn-submit').disabled = true;
    if (state.selectedOption) {
        try {
            const res = await fetch('/api/answer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ challengeId: String(state.currentChallenge.id), answer: state.selectedOption })
            });
            const data = await res.json();
            showResult(data, false);
            return;
        } catch (err) { /* fall through to timeout screen */ }
    }
    showResult(null, true);
}

// ===== RESULT =====
function showResult(data, timedOut) {
    showScreen('result');

    if (timedOut || !data) {
        document.getElementById('result-icon').textContent = '⏰';
        document.getElementById('result-title').textContent = "Time's Up!";
        document.getElementById('result-title').className = 'bad';
        document.getElementById('result-message').textContent = "You didn't answer in time. No point this round.";
        document.getElementById('vote-bars').innerHTML = '';
        document.getElementById('stat-voters').textContent = '—';
    } else {
        const { pointAwarded, isTie, majority, votes, totalVotes } = data;

        if (isTie) {
            document.getElementById('result-icon').textContent = '🤝';
            document.getElementById('result-title').textContent = "It's a Tie!";
            document.getElementById('result-title').className = 'neutral';
            document.getElementById('result-message').textContent = "The vote split evenly. No one gets a point this round.";
        } else if (pointAwarded) {
            document.getElementById('result-icon').textContent = '✨';
            document.getElementById('result-title').textContent = "You matched the majority!";
            document.getElementById('result-title').className = 'ok';
            document.getElementById('result-message').textContent = `The crowd agrees: "${majority}"`;
            state.score++;
        } else {
            document.getElementById('result-icon').textContent = '🤔';
            document.getElementById('result-title').textContent = "You went against the crowd";
            document.getElementById('result-title').className = 'bad';
            document.getElementById('result-message').textContent = `The majority chose: "${majority}"`;
        }

        renderVoteBars(votes, totalVotes, state.selectedOption, majority, isTie);
        document.getElementById('stat-voters').textContent = totalVotes;
    }

    document.getElementById('stat-round').textContent = state.round;
    document.getElementById('stat-score').textContent = state.score;

    const isLastRound = state.round >= MAX_ROUNDS;
    const isLeaderboardRound = LEADERBOARD_AT.includes(state.round);
    document.getElementById('next-btn-text').textContent =
        isLastRound ? 'See Final Score' :
        isLeaderboardRound ? 'See Leaderboard' :
        `Round ${state.round + 1} →`;
}

function renderVoteBars(votes, total, playerChoice, majority, isTie) {
    const container = document.getElementById('vote-bars');
    container.innerHTML = '';

    if (!votes || total === 0) return;

    Object.entries(votes)
        .sort((a, b) => b[1] - a[1])
        .forEach(([option, count]) => {
            const pct = Math.round((count / total) * 100);
            const isPlayer = option === playerChoice;
            const isMajority = !isTie && option === majority;

            const item = document.createElement('div');
            item.className = 'vote-bar-item';
            item.innerHTML = `
                <div class="vote-bar-label">
                    <span>${option} ${isPlayer ? '<span class="your-tag">you</span>' : ''}</span>
                    <span class="vote-pct">${pct}%</span>
                </div>
                <div class="vote-bar-track">
                    <div class="vote-bar-fill ${isMajority ? 'majority' : isPlayer ? 'player' : 'other'}"
                         style="width: 0%" data-width="${pct}%"></div>
                </div>`;
            container.appendChild(item);
        });

    requestAnimationFrame(() => {
        container.querySelectorAll('.vote-bar-fill').forEach(bar => {
            bar.style.width = bar.dataset.width;
        });
    });
}

// ===== NEXT ROUND =====
function nextRound() {
    const completed = state.round;
    if (LEADERBOARD_AT.includes(completed)) {
        const isFinal = completed === MAX_ROUNDS;
        state.leaderboardIsFinal = isFinal;
        if (!isFinal) state.round++;
        showLeaderboard(completed, isFinal);
    } else {
        state.round++;
        startChallenge();
    }
}

// ===== LEADERBOARD =====
function showLeaderboard(completedRound, isFinal) {
    showScreen('leaderboard');

    document.getElementById('leaderboard-title').textContent = isFinal ? 'Final Results' : 'Leaderboard';
    document.getElementById('leaderboard-subtitle').textContent = `After Round ${completedRound}`;

    const list = document.getElementById('leaderboard-list');
    list.innerHTML = `
        <div class="leaderboard-row solo">
            <span class="lb-rank">1</span>
            <span class="lb-avatar">${state.playerName.charAt(0).toUpperCase()}</span>
            <span class="lb-name">${state.playerName}</span>
            <span class="lb-score">${state.score} <span class="lb-score-label">pts</span></span>
        </div>
        <p class="lb-solo-note">Multiplayer coming soon — invite friends to compete!</p>`;

    const btnText = isFinal ? 'See Final Score' : `Continue to Round ${state.round}`;
    document.getElementById('leaderboard-btn-text').textContent = btnText;
}

function continueAfterLeaderboard() {
    if (state.leaderboardIsFinal) {
        showGameOver();
    } else {
        startChallenge();
    }
}

// ===== GAME OVER =====
const MESSAGES = [
    "Don't give up — great thinkers start somewhere!",
    "A brave start. Keep questioning everything.",
    "You're thinking independently. That's rare.",
    "Solid instincts. You read the room well.",
    "You understand how people think. Impressive.",
    "You're tuned in to the collective mind!",
    "Outstanding! You think like the crowd thinks.",
    "Remarkable — you're deeply in sync with others.",
    "Exceptional crowd-reading ability!",
    "You're practically psychic!",
    "Top-tier performance. The crowd is yours.",
    "Extraordinary! Near-perfect crowd alignment.",
    "Incredible run. You're a natural!",
    "Almost perfect. The crowd loves you.",
    "Perfect score! You are the SprintRace champion! 🎉"
];

function showGameOver() {
    showScreen('gameover');
    document.getElementById('gameover-name').textContent = state.playerName;
    document.getElementById('final-score').textContent = state.score;
    document.getElementById('gameover-message').textContent = MESSAGES[state.score] || 'Great game!';
    document.getElementById('trophy-icon').textContent =
        state.score >= 13 ? '🏆' : state.score >= 9 ? '🥈' : state.score >= 5 ? '🥉' : '🎮';
}

function restartGame() {
    clearInterval(state.lobbyTimer);
    clearInterval(state.timer);
    state.round = 1;
    state.score = 0;
    state.currentChallenge = null;
    state.challengeQueue = [];
    document.getElementById('player-name').value = '';
    document.getElementById('btn-submit').disabled = false;
    showScreen('join');
}

// ===== SHAKE =====
function shake(id) {
    const el = document.getElementById(id);
    el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), 400);
}
