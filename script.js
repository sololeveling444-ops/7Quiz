
let state = {
    topic: null,
    index: 0, // 0 to 9 (10 questions total)
    score: 0,
    difficulty: 'easy',
    askedQuestions: [],
    expertCount: 0
};

let currentUser = localStorage.getItem('activeUser') || null;
let startTime = 0;


function init() {
    const grid = document.getElementById('topic-grid');
    if (!grid) return;
    
   
    Object.keys(DB).forEach(topic => {
        const btn = document.createElement('button');
        btn.className = 'btn-topic';
        btn.innerText = topic.toUpperCase();
        btn.onclick = () => startQuiz(topic);
        grid.appendChild(btn);
    });

   
    if (currentUser) {
        document.getElementById('sub-header').innerText = `Welcome back, ${currentUser}!`;
        showScreen('home-screen');
    } else {
        showScreen('auth-screen');
    }
}

function loginUser() {
    const username = document.getElementById('username-input').value.trim();
    if (!username) return alert("Please enter a username to continue.");
    
    currentUser = username;
    localStorage.setItem('activeUser', currentUser);
    document.getElementById('sub-header').innerText = `Welcome, ${currentUser}!`;
    showScreen('home-screen');
}


function startQuiz(topic) {
    state = {
        topic: topic,
        index: 0,
        score: 0,
        difficulty: 'easy',
        askedQuestions: [],
        expertCount: 0
    };
    startTime = Date.now();
    
    showScreen('quiz-screen');
    renderQuestion();
}

function renderQuestion() {
    if (!DB || !DB[state.topic]) {
        console.error(`Error: Topic "${state.topic}" not found in DB.`);
        alert("Oops! Subject data is missing.");
        location.reload();
        return;
    }
  
    if (state.index >= 8) {
        // If they are on 'hard' at the end, they are "worthy" of 'expert'
        if (state.difficulty === 'hard') {
            state.difficulty = 'expert';
        }
    } else {
        // Ensure expert is NEVER available before Question 9
        if (state.difficulty === 'expert') {
            state.difficulty = 'hard';
        }
    }

   
    let unasked = DB[state.topic].filter(q => !state.askedQuestions.includes(q.q));
    let pool = unasked.filter(q => q.d === state.difficulty);
    
    // Fallback if the specific difficulty pool is empty
    if (pool.length === 0) pool = unasked; 
    if (pool.length === 0) return showResults();

    const qData = pool[Math.floor(Math.random() * pool.length)];
    state.askedQuestions.push(qData.q);
    
    
    document.getElementById('q-current').innerText = state.index + 1;
    document.getElementById('progress-fill').style.width = `${(state.index + 1) * 10}%`;
    
    const tag = document.getElementById('difficulty-tag');
    tag.innerText = state.difficulty.toUpperCase();
    tag.className = `tag-${state.difficulty}`;
    document.getElementById('question-text').innerText = qData.q;

  
    const optGrid = document.getElementById('options-grid');
    optGrid.innerHTML = '';

    let choices = qData.a.map((text, i) => ({ text: text, isCorrect: i === qData.c }));

   
    for (let i = choices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [choices[i], choices[j]] = [choices[j], choices[i]];
    }

    choices.forEach(choice => {
        const btn = document.createElement('button');
        btn.className = 'btn-option';
        btn.innerText = choice.text;
        btn.onclick = () => handleAnswer(choice.isCorrect, qData, btn, optGrid);
        optGrid.appendChild(btn);
    });
}

function handleAnswer(isCorrect, qData, clickedBtn, optGrid) {
    const allBtns = optGrid.querySelectorAll('.btn-option');
    allBtns.forEach(b => b.disabled = true);

    if (isCorrect) {
        clickedBtn.classList.add('correct-answer');
        
        
        if (state.difficulty === 'easy') {
            state.score += 50;
            state.difficulty = 'medium';
        } else if (state.difficulty === 'medium') {
            state.score += 150;
            state.difficulty = 'hard';
        } else if (state.difficulty === 'hard') {
            state.score += 250;
            // Stay on hard until Question 9 (handled in renderQuestion)
        } else if (state.difficulty === 'expert') {
            state.score += 650;
        }

    } else {
        clickedBtn.classList.add('wrong-answer');
        const correctText = qData.a[qData.c];
        allBtns.forEach(btn => { 
            if (btn.innerText === correctText) btn.classList.add('correct-answer'); 
        });

       
        if (state.difficulty === 'expert') state.difficulty = 'hard';
        else if (state.difficulty === 'hard') state.difficulty = 'medium';
        else if (state.difficulty === 'medium') state.difficulty = 'easy';
    }

    setTimeout(() => {
        state.index++;
        state.index < 10 ? renderQuestion() : showResults();
    }, 1200);
}


function showResults() {
    const timeTaken = ((Date.now() - startTime) / 1000).toFixed(1);
    showScreen('result-screen');
    
    document.getElementById('final-score').innerText = state.score;
    document.getElementById('time-taken-text').innerText = `Cleared in: ${timeTaken}s`;

    let road = state.score >= 2500 ? "Legendary! You are the MVP." : 
               state.score >= 1500 ? "Expert level performance." : "Keep practicing!";
    document.getElementById('roadmap-text').innerText = road;

    const actionArea = document.querySelector('#result-screen .options-grid');
    actionArea.innerHTML = `
        <button class="btn-secondary" style="background:#ef4444; border:none;" onclick="location.reload()">Discard Run</button>
        <button class="btn-primary" style="background:var(--turquoise); color:#000;" 
                onclick="confirmAndSave(${state.score}, ${timeTaken})">Save Record</button>
    `;
}

function confirmAndSave(score, time) {
    let db = JSON.parse(localStorage.getItem('quizLeaderboardDB')) || {};
    if (!db[state.topic]) db[state.topic] = [];
    
    db[state.topic].push({ user: currentUser, score: score, time: parseFloat(time) });
    localStorage.setItem('quizLeaderboardDB', JSON.stringify(db));
    openDashboard();
}


function openDashboard() {
    showScreen('dashboard-screen');
    const tabs = document.getElementById('dashboard-tabs');
    tabs.innerHTML = '';
    
    const topics = Object.keys(DB);
    topics.forEach((topic, i) => {
        const btn = document.createElement('button');
        btn.className = `tab-btn ${i === 0 ? 'active' : ''}`;
        btn.innerText = topic.toUpperCase();
        btn.onclick = (e) => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            renderLeaderboard(topic);
        };
        tabs.appendChild(btn);
    });
    if (topics.length > 0) renderLeaderboard(topics[0]);
}

function renderLeaderboard(topic) {
    const container = document.getElementById('leaderboard-content');
    container.innerHTML = '';
    let db = JSON.parse(localStorage.getItem('quizLeaderboardDB')) || {};
    let records = db[topic] || [];

    
    records.sort((a, b) => b.score !== a.score ? b.score - a.score : a.time - b.time);

    if (records.length === 0) {
        container.innerHTML = '<p style="color:gray; text-align:center; margin-top:20px;">No records found for this subject.</p>';
        return;
    }

    records.forEach((record, index) => {
        const isOwner = record.user === currentUser;
        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`;
        const mvp = index === 0 ? '<span class="mvp-tag">MVP</span>' : '';
        const rankClass = index === 0 ? 'rank-1' : index === 1 ? 'rank-2' : index === 2 ? 'rank-3' : '';

        container.innerHTML += `
            <div class="leaderboard-row ${rankClass}">
                <div class="player-info">
                    <span style="font-size:1.2rem;">${medal}</span>
                    <span>${record.user}</span> ${mvp}
                </div>
                <div style="display:flex; align-items:center; gap:12px;">
                    <div class="stats-info"><span>${record.score}</span> pts | ${record.time}s</div>
                    ${isOwner ? `<button onclick="deleteRecord('${topic}', ${index})" 
                                 style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:1.1rem;">🗑️</button>` : ''}
                </div>
            </div>
        `;
    });
}

function deleteRecord(topic, index) {
    if (!confirm("Delete this record permanently?")) return;
    let db = JSON.parse(localStorage.getItem('quizLeaderboardDB'));
    // Re-sort to ensure we splice the correct visual index
    db[topic].sort((a, b) => b.score !== a.score ? b.score - a.score : a.time - b.time);
    db[topic].splice(index, 1);
    localStorage.setItem('quizLeaderboardDB', JSON.stringify(db));
    renderLeaderboard(topic);
}


function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

window.onload = init;
