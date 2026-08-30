// ====================== STATE ======================
const state = {
    currentChapter: null,      // number (1-11)
    chapterData: null,         // parsed JSON object
    scores: {},               // { chapterNumber: { correct, total } }
    quizLocked: false,        // prevent double‑click etc.
};

// ====================== CHAPTER LIST ======================
const CHAPTERS = [
    { id: 1, title: 'Identity: Azure Active Directory' },
    { id: 2, title: 'Compliance and Cloud Governance' },
    { id: 3, title: 'Virtual Networking' },
    { id: 4, title: 'Intersite Connectivity' },
    { id: 5, title: 'Network Traffic Management' },
    { id: 6, title: 'Azure Storage' },
    { id: 7, title: 'Azure Virtual Machines' },
    { id: 8, title: 'Automation, Deployment, and Configuration of Resources' },
    { id: 9, title: 'PaaS Compute Options' },
    { id: 10, title: 'Data Protection' },
    { id: 11, title: 'Monitoring Resources' }
];

// ====================== DOM REFERENCES ======================
const viewChapters = document.getElementById('view-chapters');
const viewSplit = document.getElementById('view-split');
const chapterGrid = document.getElementById('chapter-grid');
const btnBack = document.getElementById('btn-back');

const metaChapter = document.getElementById('meta-chapter');
const metaTitle = document.getElementById('meta-title');
const metaSource = document.getElementById('meta-source');
const metaVersion = document.getElementById('meta-version');
const scoreDisplay = document.getElementById('score-display');

const knowledgeContent = document.getElementById('knowledge-content');
const quizContent = document.getElementById('quiz-content');

// ====================== VIEW SWITCHING ======================
function showView(viewName) {
    document.querySelectorAll('.view-container').forEach(el => el.classList.remove('active'));
    if (viewName === 'chapters') {
        viewChapters.classList.add('active');
    } else {
        viewSplit.classList.add('active');
    }
}

// ====================== LOAD CHAPTER DATA ======================
async function loadChapter(chapterNumber) {
    const pad = String(chapterNumber).padStart(2, '0');
    const path = `./data/chap${pad}.json`;
    try {
        const resp = await fetch(path);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();
        state.currentChapter = chapterNumber;
        state.chapterData = data;
        // Initialize score entry if missing
        if (!state.scores[chapterNumber]) {
            state.scores[chapterNumber] = { correct: 0, total: 0 };
        }
        renderSplitView();
        showView('split');
    } catch (err) {
        console.error('Failed to load chapter:', err);
        alert(`Could not load chapter ${chapterNumber}. Please ensure the file ${path} exists.`);
    }
}

// ====================== RENDER SPLIT VIEW ======================
function renderSplitView() {
    const data = state.chapterData;
    if (!data) return;

    const meta = data.chapterMetaData;
    metaChapter.textContent = meta.chapterNumber;
    metaTitle.textContent = meta.title;
    metaSource.textContent = meta.sourceBook || '—';
    metaVersion.textContent = meta.version || '—';

    // Render knowledge
    renderKnowledge(data.studySection);
    // Render quiz
    renderQuiz(data.quizSection);
    // Update score
    updateScoreDisplay();

    // Scroll to top of both columns
    document.getElementById('col-knowledge').scrollTop = 0;
    document.getElementById('col-quiz').scrollTop = 0;
}

// ====================== RENDER KNOWLEDGE ======================
function renderKnowledge(section) {
    let html = '';

    // --- Knowledge Key Points ---
    const kps = section.knowledgeKeyPoints || [];
    if (kps.length) {
        html += `<h6 class="mt-3 mb-2 text-secondary"><i class="fas fa-list-ul me-2"></i>Key Points</h6>`;
        kps.forEach(kp => {
            html += `
                <div class="knowledge-card" data-kp-id="${kp.id}">
                    <div class="card-header">${kp.title}</div>
                    <div class="card-body">
                        <p>${kp.summary}</p>
                        <button class="btn btn-sm btn-outline-primary practice-link" data-kp-id="${kp.id}">
                            <i class="fas fa-question-circle me-1"></i>Practice Questions
                        </button>
                    </div>
                </div>
            `;
        });
    }

    // --- High-Yield Notes ---
    const notes = section.highYieldNotes || [];
    if (notes.length) {
        html += `<h6 class="mt-4 mb-2 text-secondary"><i class="fas fa-star me-2"></i>High-Yield Exam Notes</h6>`;
        notes.forEach(note => {
            const aws = note.awsComparison || [];
            let awsHtml = '';
            if (aws.length) {
                awsHtml = `
                    <div class="mt-2">
                        <table class="table table-bordered table-sm aws-table">
                            <thead><tr><th>Azure Concept</th><th>AWS Equivalent</th><th>Key Differences</th></tr></thead>
                            <tbody>
                                ${aws.map(item => `
                                    <tr>
                                        <td>${item.azureConcept}</td>
                                        <td>${item.awsEquivalent}</td>
                                        <td>${item.keyDifferences}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            }

            html += `
                <div class="high-yield-card" data-kp-id="${note.keyPointId}">
                    <div class="why-matters"><i class="fas fa-exclamation-triangle me-2"></i>Why It Matters</div>
                    <p>${note.whyItMatters}</p>
                    <div><strong>Core Patterns:</strong></div>
                    <ul>
                        ${(note.coreKnowledgePatterns || []).map(p => `<li>${p}</li>`).join('')}
                    </ul>
                    <div><strong>Question Keywords:</strong></div>
                    <div>
                        ${(note.questionKeywords || []).map(kw => `<span class="badge-keyword">${kw}</span>`).join(' ')}
                    </div>
                    ${(note.examTraps || []).length ? `
                        <div class="trap-box mt-2">
                            <strong><i class="fas fa-exclamation-circle me-1"></i>Exam Trap:</strong>
                            <ul class="mb-0 ps-3">
                                ${note.examTraps.map(t => `<li>${t}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    ${awsHtml}
                </div>
            `;
        });
    }

    knowledgeContent.innerHTML = html;

    // Attach event listeners to "Practice Questions" buttons
    document.querySelectorAll('.practice-link').forEach(btn => {
        btn.addEventListener('click', function(e) {
            const kpId = this.dataset.kpId;
            // Find the first question with this relatedKeyPointId and scroll to it
            const quizItems = document.querySelectorAll('.quiz-question');
            for (let q of quizItems) {
                if (q.dataset.kpId === kpId) {
                    q.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Highlight the question briefly
                    q.style.transition = 'background 0.3s';
                    q.style.background = '#F0D8A1';
                    setTimeout(() => { q.style.background = ''; }, 1500);
                    break;
                }
            }
        });
    });
}

// ====================== RENDER QUIZ ======================
function renderQuiz(quizSection) {
    const quizzes = quizSection.quizzes || [];
    if (!quizzes.length) {
        quizContent.innerHTML = `<p class="text-muted">No quiz questions for this chapter.</p>`;
        return;
    }

    // Update total questions in score
    const chapterNum = state.currentChapter;
    if (state.scores[chapterNum]) {
        state.scores[chapterNum].total = quizzes.length;
    }

    let html = '';
    quizzes.forEach((q, index) => {
        const qNum = index + 1;
        const optionLetters = ['A', 'B', 'C', 'D', 'E', 'F'];
        html += `
            <div class="quiz-question" data-kp-id="${q.relatedKeyPointId || ''}" data-qid="${q.id}">
                <div class="q-number">Question ${qNum}</div>
                <p class="mt-1">${q.questionText}</p>
                <div class="options-container">
                    ${q.options.map((opt, idx) => `
                        <button class="quiz-option" data-value="${opt.id}" data-correct="${q.correctAnswers.includes(opt.id)}">
                            <span class="icon">${optionLetters[idx]}.</span> ${opt.text}
                        </button>
                    `).join('')}
                </div>
                <div class="explanation-box">
                    <p class="mb-1"><strong>Explanation:</strong> ${q.explanation}</p>
                    <button class="btn-review btn-sm" data-kp-id="${q.relatedKeyPointId}">
                        <i class="fas fa-undo me-1"></i>Review Key Point
                    </button>
                </div>
            </div>
        `;
    });

    quizContent.innerHTML = html;

    // Attach option click handlers
    document.querySelectorAll('.quiz-question').forEach(questionEl => {
        const options = questionEl.querySelectorAll('.quiz-option');
        const explanation = questionEl.querySelector('.explanation-box');
        let answered = false;

        options.forEach(opt => {
            opt.addEventListener('click', function() {
                if (answered) return;
                answered = true;

                const isCorrect = this.dataset.correct === 'true';
                const isIncorrect = !isCorrect;

                // Disable all options
                options.forEach(o => o.classList.add('disabled'));

                // Mark selected
                if (isCorrect) {
                    this.classList.add('correct');
                    // Show success icon
                    this.innerHTML = `<span class="icon"><i class="fas fa-check-circle text-success"></i></span> ${this.textContent.replace(/^[A-Z]\.\s*/, '')}`;
                } else {
                    this.classList.add('incorrect');
                    // Show wrong icon
                    this.innerHTML = `<span class="icon"><i class="fas fa-times-circle text-danger"></i></span> ${this.textContent.replace(/^[A-Z]\.\s*/, '')}`;
                    // Reveal correct answer
                    options.forEach(o => {
                        if (o.dataset.correct === 'true') {
                            o.classList.add('correct');
                            o.innerHTML = `<span class="icon"><i class="fas fa-check-circle text-success"></i></span> ${o.textContent.replace(/^[A-Z]\.\s*/, '')}`;
                        }
                    });
                }

                // Update score
                const chapter = state.currentChapter;
                const score = state.scores[chapter];
                if (score) {
                    if (isCorrect) score.correct += 1;
                    // total is already set
                    updateScoreDisplay();
                }

                // Show explanation
                explanation.classList.add('visible');

                // Scroll to explanation if needed
                setTimeout(() => {
                    explanation.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 100);
            });
        });

        // Attach review button inside explanation
        const reviewBtn = questionEl.querySelector('.btn-review');
        if (reviewBtn) {
            reviewBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                const kpId = this.dataset.kpId;
                // Find knowledge card with that id
                const targetCard = document.querySelector(`.knowledge-card[data-kp-id="${kpId}"]`);
                if (targetCard) {
                    // Scroll left column to that card
                    const col = document.getElementById('col-knowledge');
                    const cardTop = targetCard.offsetTop - 20;
                    col.scrollTo({ top: cardTop, behavior: 'smooth' });
                    // Highlight it
                    targetCard.classList.add('highlight');
                    setTimeout(() => targetCard.classList.remove('highlight'), 2000);
                } else {
                    // Fallback: try high-yield card
                    const hyCard = document.querySelector(`.high-yield-card[data-kp-id="${kpId}"]`);
                    if (hyCard) {
                        const col = document.getElementById('col-knowledge');
                        const top = hyCard.offsetTop - 20;
                        col.scrollTo({ top, behavior: 'smooth' });
                        hyCard.style.background = '#F0D8A1';
                        setTimeout(() => hyCard.style.background = '', 2000);
                    }
                }
            });
        }
    });

    // Reset score for this chapter (correct count starts fresh)
    // Actually we should not reset on re-render; we keep accumulated.
    // But we only call render on load, so it's fine.
}

// ====================== UPDATE SCORE DISPLAY ======================
function updateScoreDisplay() {
    const chapter = state.currentChapter;
    if (!chapter || !state.scores[chapter]) {
        scoreDisplay.textContent = '0 / 0';
        return;
    }
    const s = state.scores[chapter];
    scoreDisplay.textContent = `${s.correct} / ${s.total}`;
}

// ====================== BACK TO CHAPTERS ======================
btnBack.addEventListener('click', function() {
    showView('chapters');
    // Optionally reset state? No, keep data but we can clear split view to free memory
    // We'll just hide it.
});

// ====================== BUILD CHAPTER GRID ======================
function buildChapterGrid() {
    chapterGrid.innerHTML = '';
    CHAPTERS.forEach(ch => {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4';
        col.innerHTML = `
            <div class="card chapter-card h-100" data-chapter="${ch.id}">
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title">Chapter ${ch.id}</h5>
                    <p class="card-text flex-grow-1">${ch.title}</p>
                    <span class="badge bg-primary-accent align-self-start">Study</span>
                </div>
            </div>
        `;
        col.querySelector('.chapter-card').addEventListener('click', function() {
            const chap = parseInt(this.dataset.chapter);
            loadChapter(chap);
        });
        chapterGrid.appendChild(col);
    });
}

// ====================== INIT ======================
buildChapterGrid();
// Show chapters by default
showView('chapters');