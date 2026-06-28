// ===== STATE =====
const MAX_ROUNDS = 5;
const state = {
    playerName: '',
    round: 1,
    score: 0,
    currentChallenge: null,
    challengeQueue: [],
    timer: null,
    lobbyTimer: null,
    timeRemaining: 0,
    timerTotal: 0,
    selectedOption: null,
    sequenceSelection: []
};

// ===== SCREEN MANAGEMENT =====
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
    const initial = state.playerName.charAt(0).toUpperCase();
    document.getElementById('lobby-avatar').textContent = initial;
    document.getElementById('lobby-welcome').textContent = `Welcome, ${state.playerName}!`;

    let count = 30;
    const el = document.getElementById('lobby-countdown');
    el.textContent = count;

    loadChallenges();

    state.lobbyTimer = setInterval(() => {
        count--;
        if (count <= 0) {
            clearInterval(state.lobbyTimer);
            startChallenge();
        } else {
            el.textContent = count;
        }
    }, 1000);
}

async function letsGo() {
    clearInterval(state.lobbyTimer);
    await loadChallenges();
    startChallenge();
}

async function loadChallenges() {
    try {
        const res = await fetch('/api/challenges');
        const all = await res.json();
        // Separate by difficulty, shuffle each group, interleave: 3 easy then 2 hard
        const easy = all.filter(c => c.difficulty === 1).sort(() => Math.random() - 0.5);
        const hard = all.filter(c => c.difficulty === 2).sort(() => Math.random() - 0.5);
        state.challengeQueue = [...easy.slice(0, 3), ...hard.slice(0, 2)];
    } catch (err) {
        console.error('Failed to load challenges', err);
    }
}

// ===== CHALLENGE =====
function startChallenge() {
    showScreen('challenge');
    document.getElementById('round-badge').textContent = `Round ${state.round}`;
    document.getElementById('score-display').textContent = state.score;
    state.selectedOption = null;
    state.sequenceSelection = [];

    const challenge = state.challengeQueue[state.round - 1];
    if (!challenge) {
        document.getElementById('challenge-question').textContent =
            'Could not load challenge. Make sure the server is running on port 8080.';
        return;
    }
    state.currentChallenge = challenge;
    renderChallenge(challenge);
}

function renderChallenge(c) {
    document.getElementById('challenge-question').textContent = c.question;

    const box = document.getElementById('options-container');
    box.innerHTML = '';
    c.options.forEach(opt => {
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

    startTimer(c.timeLimit);
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
            showResult(false, true);
        }
    }, 1000);
}

function pauseTimer() { clearInterval(state.timer); }

function resumeTimer() { startTimer(state.timeRemaining); }

// ===== SUBMIT =====
async function submitAnswer() {
    if (document.getElementById('btn-submit').disabled) return;
    if (!state.selectedOption) { shake('options-container'); return; }

    pauseTimer();
    document.getElementById('btn-submit').disabled = true;

    try {
        const res = await fetch('/api/answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ challengeId: String(state.currentChallenge.id), answer: state.selectedOption })
        });
        const data = await res.json();
        showResult(data.correct, false);
    } catch (err) {
        document.getElementById('btn-submit').disabled = false;
        resumeTimer();
    }
}

function shake(id) {
    const el = document.getElementById(id);
    el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), 400);
}

// ===== RESULT =====
function showResult(correct, timedOut) {
    clearInterval(state.timer);
    showScreen('result');

    const c = state.currentChallenge;

    document.getElementById('result-icon').textContent  = correct ? '✅' : timedOut ? '⏰' : '❌';
    const title = document.getElementById('result-title');
    title.textContent = correct ? 'Correct!' : timedOut ? "Time's Up!" : 'Not Quite!';
    title.className   = correct ? 'ok' : 'bad';

    document.getElementById('result-message').textContent = correct
        ? 'Great job! You got it right.'
        : timedOut ? 'You ran out of time on this one.' : 'Better luck next round!';

    const box = document.getElementById('correct-answer-box');
    if (!correct) {
        box.classList.add('show');
        const ans = c.answer;
        document.getElementById('correct-answer-text').textContent =
            Array.isArray(ans) ? ans.join(' → ') : String(ans);
    } else {
        box.classList.remove('show');
        state.score++;
    }

    document.getElementById('stat-round').textContent = state.round;
    document.getElementById('stat-score').textContent = state.score;
    document.getElementById('next-btn-text').textContent =
        state.round >= MAX_ROUNDS ? 'See Final Score' : 'Next Round →';
}

function nextRound() {
    if (state.round >= MAX_ROUNDS) {
        showGameOver();
        return;
    }
    state.round++;
    document.getElementById('btn-submit').disabled = false;
    startChallenge();
}

// ===== GAME OVER =====
const MESSAGES = [
    "Don't give up — every expert was once a beginner!",
    "You got started — that's what matters!",
    "Solid effort. You're getting the hang of it!",
    "Nice work! You've got real potential.",
    "Impressive! You're almost at the top!",
    "Perfect score! You're the SprintRace champion! 🎉"
];

function showGameOver() {
    showScreen('gameover');
    document.getElementById('gameover-name').textContent = state.playerName;
    document.getElementById('final-score').textContent = state.score;
    document.getElementById('gameover-message').textContent = MESSAGES[state.score] || 'Great game!';
    document.getElementById('trophy-icon').textContent = state.score === MAX_ROUNDS ? '🏆' : state.score >= 3 ? '🥈' : '🎮';
}

function restartGame() {
    clearInterval(state.lobbyTimer);
    clearInterval(state.timer);
    state.round = 1;
    state.score = 0;
    state.currentChallenge = null;
    document.getElementById('player-name').value = '';
    document.getElementById('btn-submit').disabled = false;
    showScreen('join');
}
