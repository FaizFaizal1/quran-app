/**
 * Quran Looping App
 * Logic for state management, API fetching, and audio playback.
 */

// --- App Logic is loaded from logic.js ---
if (typeof AppLogic === 'undefined') {
    console.error("CRITICAL: logic.js not loaded!");
}

// --- State Management ---
const state = {
    reciters: [],
    chapters: [],
    versesData: [], // [ { id: 1, text_uthmani: "...", translation: "..." } ]

    // Selection state
    selectedReciterId: null,
    selectedSurahId: null,
    startVerse: 1,
    endVerse: 1,

    // Loop Settings
    verseRepeat: 1,
    rangeRepeat: 1,

    // Memorization State { surahId: [verseNum, verseNum, ...], ... }
    memorization: {},

    // Goals State [ { id: TIMESTAMP, surahId: 1, start: 1, end: 7, deadline: "YYYY-MM-DD" } ]
    goals: [],

    // Runtime State
    isPlaying: false,
    currentVerseIndex: 0,
    currentVerseLoopCount: 0,
    currentRangeLoopCount: 0,
    playbackRate: 1.0, // Default Speed

    // Audio Object
    audio: document.getElementById('audio-player')
};

// --- DOM Elements ---
const ui = {
    reciterSelect: document.getElementById('reciter-select'),
    surahSelect: document.getElementById('surah-select'),
    startVerseInput: document.getElementById('start-verse'),
    endVerseInput: document.getElementById('end-verse'),
    verseRepeatInput: document.getElementById('verse-repeat'),
    rangeRepeatInput: document.getElementById('range-repeat'),

    // Playback Display
    npSurah: document.getElementById('np-surah'),
    npDetails: document.getElementById('np-details'),
    npReciter: document.getElementById('np-reciter'),
    statusVerse: document.getElementById('status-verse-loop'),
    statusRange: document.getElementById('status-range-loop'),

    // Verse Display
    versesContainer: document.getElementById('verses-container'),

    // Controls
    btnPrev: document.getElementById('btn-prev'),
    btnPlay: document.getElementById('btn-play'),
    btnStop: document.getElementById('btn-stop'),
    btnNext: document.getElementById('btn-next'),
    btnSpeed: document.getElementById('btn-speed'),

    // Increment/Decrement Buttons
    controlBtns: document.querySelectorAll('.control-btn.plus, .control-btn.minus'),

    // Goals UI
    goalSurahSelect: document.getElementById('goal-surah'),
    goalStartInput: document.getElementById('goal-start'),
    goalEndInput: document.getElementById('goal-end'),
    goalDeadlineInput: document.getElementById('goal-deadline'),
    btnAddGoal: document.getElementById('btn-add-goal'),
    goalsList: document.getElementById('goals-list')
};

// --- Persistence ---

function saveSettings() {
    const settings = AppLogic.createSettingsObject(state);
    localStorage.setItem('quranLoopSettings', JSON.stringify(settings));
}

function loadSettings() {
    const saved = localStorage.getItem('quranLoopSettings');
    if (saved) {
        try {
            const settings = JSON.parse(saved);
            state.selectedReciterId = settings.reciterId || state.selectedReciterId;
            state.selectedSurahId = settings.surahId || state.selectedSurahId;
            state.startVerse = settings.startVerse || 1;
            state.endVerse = settings.endVerse || 1;
            state.verseRepeat = settings.verseRepeat || 1;
            state.rangeRepeat = settings.rangeRepeat || 1;
            state.playbackRate = settings.playbackRate || 1.0;

            // Apply to UI
            ui.startVerseInput.value = state.startVerse;
            ui.endVerseInput.value = state.endVerse;
            ui.verseRepeatInput.value = state.verseRepeat;
            ui.rangeRepeatInput.value = state.rangeRepeat;
            ui.btnSpeed.textContent = `${state.playbackRate}x`;
            state.audio.playbackRate = state.playbackRate;

            return true; // Settings loaded
        } catch (e) {
            console.error("Error loading settings", e);
        }
    }
    return false;
}

function saveMemorization() {
    localStorage.setItem('quranMemorization', JSON.stringify(state.memorization));
}

function loadMemorization() {
    const saved = localStorage.getItem('quranMemorization');
    if (saved) {
        try {
            state.memorization = JSON.parse(saved);
        } catch (e) {
            console.error("Error loading memorization", e);
            state.memorization = {};
        }
    }
}

function saveGoals() {
    localStorage.setItem('quranGoals', JSON.stringify(state.goals));
}

function loadGoals() {
    const saved = localStorage.getItem('quranGoals');
    if (saved) {
        try {
            state.goals = JSON.parse(saved);
        } catch (e) {
            console.error("Error loading goals", e);
            state.goals = [];
        }
    }
}

// --- Initialization ---
async function init() {
    console.log('Initializing Quran Loop App...');

    try {
        await Promise.all([
            fetchReciters(),
            fetchChapters()
        ]);

        loadMemorization();
        loadGoals();

        setupEventListeners();

        // Populate Goal Surah Select
        populateSelect(ui.goalSurahSelect, state.chapters, 'id', 'name');
        renderGoals();

        // Load Settings OR Defaults
        if (loadSettings()) {
            // Restore Selection
            ui.reciterSelect.value = state.selectedReciterId;
            ui.surahSelect.value = state.selectedSurahId;
            handleSurahChange(state.selectedSurahId, false); // false = don't reset verses
        } else {
            // Defaults
            if (state.reciters.length > 0) {
                ui.reciterSelect.value = state.reciters[0].id;
                state.selectedReciterId = state.reciters[0].id;
            }
            if (state.chapters.length > 0) {
                ui.surahSelect.value = state.chapters[0].id;
                handleSurahChange(state.chapters[0].id);
            }
        }

    } catch (error) {
        console.error("Initialization Failed:", error);
        alert("Failed to load initial data. Please check your internet connection.");
    }
}

// --- Data Fetching ---

async function fetchReciters() {
    const curatedReciters = [
        { id: 'Alafasy_128kbps', name: 'Mishary Rashid Alafasy' },
        { id: 'Abdurrahmaan_As-Sudais_192kbps', name: 'Abdurrahmaan As-Sudais' },
        { id: 'Abdul_Basit_Murattal_192kbps', name: 'Abdul Basit (Murattal)' },
        { id: 'Abdul_Basit_Mujawwad_128kbps', name: 'Abdul Basit (Mujawwad)' },
        { id: 'Minshawy_Murattal_128kbps', name: 'Al-Minshawy (Murattal)' },
        { id: 'Husary_128kbps', name: 'Mahmoud Khalil Al-Husary' },
        { id: 'Ghamadi_40kbps', name: 'Saad Al-Ghamdi' },
        { id: 'Hudhaify_128kbps', name: 'Ali Al-Hudhaify' }
    ];

    state.reciters = curatedReciters;
    populateSelect(ui.reciterSelect, state.reciters, 'id', 'name');
}

async function fetchChapters() {
    const response = await fetch('https://api.quran.com/api/v4/chapters');
    const data = await response.json();

    state.chapters = data.chapters.map(ch => ({
        id: ch.id,
        name: `${ch.id}. ${ch.name_simple} (${ch.translated_name.name})`,
        verses_count: ch.verses_count
    }));

    populateSelect(ui.surahSelect, state.chapters, 'id', 'name');
}

async function fetchVerses(surahId) {
    ui.versesContainer.innerHTML = '<div class="verse-item placeholder"><p>Loading Verses...</p></div>';

    try {
        // Fetch Arabic (Uthmani) and Translation (Saheeh International: 131) in parallel
        const [arabicRes, transRes] = await Promise.all([
            fetch(`https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${surahId}`),
            fetch(`https://api.quran.com/api/v4/quran/translations/131?chapter_number=${surahId}`)
        ]);

        const arabicData = await arabicRes.json();
        const transData = await transRes.json();

        // Merge Data
        const arabicVerses = arabicData.verses; // [{ id: 1, verse_key: "1:1", text_uthmani: "..." }]
        const transVerses = transData.translations; // [{ resource_id: 131, text: "..." }]

        state.versesData = arabicVerses.map((v, i) => ({
            id: v.verse_key,
            number: i + 1,
            text: v.text_uthmani,
            translation: transVerses[i] ? transVerses[i].text : ""
        }));

        renderVerses();

    } catch (e) {
        console.error("Failed to fetch verses", e);
        ui.versesContainer.innerHTML = '<div class="verse-item placeholder"><p>Error loading text.</p></div>';
    }
}

function renderVerses() {
    ui.versesContainer.innerHTML = '';

    state.versesData.forEach(verse => {
        const div = document.createElement('div');
        div.className = 'verse-item';
        div.id = `verse-${verse.number}`; // ID for scrolling

        div.innerHTML = `
            <div class="verse-header">
                <span class="verse-number">${verse.number}</span>
            </div>
            <p class="verse-arabic">${verse.text}</p>
            <p class="verse-translation">${verse.translation}</p>
            
            <div class="verse-actions" style="margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 10px;">
                <label class="memorize-control">
                    <input type="checkbox" class="memorize-checkbox" 
                           data-surah="${state.selectedSurahId}" 
                           data-verse="${verse.number}"
                           ${isMemorized(state.selectedSurahId, verse.number) ? 'checked' : ''}>
                    <span class="memorize-label">Memorized</span>
                </label>
            </div>
        `;

        // Checkbox Event Listener
        const checkbox = div.querySelector('.memorize-checkbox');
        checkbox.addEventListener('change', (e) => {
            toggleMemorize(state.selectedSurahId, verse.number, e.target.checked);
        });

        ui.versesContainer.appendChild(div);
    });

    updateProgress();
}

function isMemorized(surahId, verseNum) {
    if (!state.memorization[surahId]) return false;
    return state.memorization[surahId].includes(verseNum);
}

function toggleMemorize(surahId, verseNum, isChecked) {
    if (!state.memorization[surahId]) {
        state.memorization[surahId] = [];
    }

    if (isChecked) {
        if (!state.memorization[surahId].includes(verseNum)) {
            state.memorization[surahId].push(verseNum);
        }
    } else {
        state.memorization[surahId] = state.memorization[surahId].filter(v => v !== verseNum);
    }

    saveMemorization();
    updateProgress();

    // Update goals that might be affected
    renderGoals();
}

function updateProgress() {
    const surah = state.chapters.find(c => c.id === state.selectedSurahId);
    if (!surah) return;

    const totalVerses = surah.verses_count;
    const memorizedCount = state.memorization[state.selectedSurahId]?.length || 0;

    // Clamp just in case
    const validCount = Math.min(memorizedCount, totalVerses);

    const percentage = Math.round((validCount / totalVerses) * 100);

    const progressBar = document.getElementById('progress-bar-fill');
    const progressText = document.getElementById('progress-text');

    if (progressBar && progressText) {
        progressBar.style.width = `${percentage}%`;
        progressText.textContent = `${percentage}% (${validCount}/${totalVerses})`;
    }
}


function highlightVerse(verseNum) {
    // Remove old highlight
    document.querySelectorAll('.verse-item.active-verse').forEach(el => el.classList.remove('active-verse'));

    // Add new highlight
    const el = document.getElementById(`verse-${verseNum}`);
    if (el) {
        el.classList.add('active-verse');
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// --- UI Helpers ---

function populateSelect(element, items, valueKey, textKey) {
    element.innerHTML = '';
    items.forEach(item => {
        const option = document.createElement('option');
        option.value = item[valueKey];
        option.textContent = item[textKey];
        element.appendChild(option);
    });
}

function setupEventListeners() {
    // Dropdowns
    ui.reciterSelect.addEventListener('change', (e) => {
        state.selectedReciterId = e.target.value;
        saveSettings();
    });

    ui.surahSelect.addEventListener('change', (e) => {
        handleSurahChange(parseInt(e.target.value));
        saveSettings();
    });

    // Inputs
    ui.startVerseInput.addEventListener('change', () => { updateRangeFromUI(); saveSettings(); });
    ui.endVerseInput.addEventListener('change', () => { updateRangeFromUI(); saveSettings(); });

    // Play/Pause
    ui.btnPlay.addEventListener('click', togglePlay);
    ui.btnStop.addEventListener('click', stopPlayback);

    // Speed Control
    ui.btnSpeed.addEventListener('click', () => { toggleSpeed(); saveSettings(); });

    // Controls +/-
    ui.controlBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const targetId = btn.getAttribute('data-target');
            const input = document.getElementById(targetId);
            const isPlus = btn.classList.contains('plus');
            let val = parseInt(input.value) || 1;

            if (isPlus) val++;
            else val = Math.max(1, val - 1);

            input.value = val;
            input.dispatchEvent(new Event('change'));
        });
    });

    // Settings inputs
    ui.verseRepeatInput.addEventListener('change', (e) => {
        state.verseRepeat = parseInt(e.target.value) || 1;
        saveSettings();
    });

    ui.rangeRepeatInput.addEventListener('change', (e) => {
        state.rangeRepeat = parseInt(e.target.value) || 1;
        saveSettings();
    });

    // Audio
    state.audio.addEventListener('ended', handleVerseEnd);
    state.audio.addEventListener('error', (e) => {
        console.error("Audio Error", e);
        stopPlayback();
    });

    // Goals Events
    ui.btnAddGoal.addEventListener('click', addGoal);

    // Delete Goal or Play Goal (Event Delegation)
    ui.goalsList.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.btn-delete-goal');
        const playBtn = e.target.closest('.btn-play-goal');

        if (deleteBtn) {
            const id = parseInt(deleteBtn.getAttribute('data-id'));
            deleteGoal(id);
        } else if (playBtn) {
            const id = parseInt(playBtn.getAttribute('data-id'));
            playGoal(id);
        }
    });

    // Update Max Verse for Goal Inputs
    ui.goalSurahSelect.addEventListener('change', (e) => {
        const surahId = parseInt(e.target.value);
        const surah = state.chapters.find(c => c.id === surahId);
        if (surah) {
            ui.goalStartInput.max = surah.verses_count;
            ui.goalEndInput.max = surah.verses_count;
            ui.goalStartInput.value = 1;
            ui.goalEndInput.value = surah.verses_count; // Default to full surah or reasonable range
        }
    });
}

async function handleSurahChange(surahId, resetVerses = true) {
    state.selectedSurahId = surahId;
    const surah = state.chapters.find(c => c.id === surahId);

    if (surah) {
        ui.startVerseInput.max = surah.verses_count;
        ui.endVerseInput.max = surah.verses_count;

        if (resetVerses) {
            // Reset to Verse 1
            ui.startVerseInput.value = 1;
            ui.endVerseInput.value = 1;
            state.startVerse = 1;
            state.endVerse = 1;
        }

        ui.npSurah.textContent = surah.name;

        // Fetch Text!
        await fetchVerses(surahId);
    }
}

function updateRangeFromUI() {
    let start = parseInt(ui.startVerseInput.value);
    let end = parseInt(ui.endVerseInput.value);

    const surah = state.chapters.find(c => c.id === state.selectedSurahId);
    const max = surah ? surah.verses_count : 114;

    const validated = AppLogic.validateRange(start, end, max);

    // Update UI and State
    ui.startVerseInput.value = validated.start;
    ui.endVerseInput.value = validated.end;

    state.startVerse = validated.start;
    state.endVerse = validated.end;
}

// --- Playback Logic ---

function toggleSpeed() {
    state.playbackRate = AppLogic.calculateNextSpeed(state.playbackRate);
    ui.btnSpeed.textContent = `${state.playbackRate}x`;

    // Apply immediately if playing
    state.audio.playbackRate = state.playbackRate;
}

function togglePlay() {
    if (state.isPlaying) {
        pausePlayback();
    } else {
        startPlayback();
    }
}

function startPlayback() {
    if (!state.selectedReciterId || !state.selectedSurahId) {
        alert("Please select a Reciter and Surah.");
        return;
    }

    state.isPlaying = true;
    updatePlayButton();

    if (state.audio.src && !state.audio.ended && state.audio.currentTime > 0) {
        state.audio.play();
        state.audio.playbackRate = state.playbackRate; // Ensure rate is applied
    } else {
        playCurrentVerse();
    }
}

function pausePlayback() {
    state.isPlaying = false;
    updatePlayButton();
    state.audio.pause();
}

function stopPlayback() {
    state.isPlaying = false;
    state.audio.pause();
    state.audio.currentTime = 0;
    state.audio.playbackRate = state.playbackRate; // Reset rate just in case

    state.currentVerseIndex = 0;
    state.currentVerseLoopCount = 0;
    state.currentRangeLoopCount = 0;

    updatePlayButton();
    updateStatusDisplay();

    // Remove Highlight
    document.querySelectorAll('.verse-item.active-verse').forEach(el => el.classList.remove('active-verse'));
}

function playCurrentVerse() {
    if (!state.isPlaying) return;

    // Determine current verse number
    const verseNum = state.startVerse + state.currentVerseIndex;

    // Update UI
    ui.npDetails.textContent = `Verse ${verseNum} / ${state.endVerse}`;
    const reciterName = state.reciters.find(r => r.id === state.selectedReciterId)?.name || 'Unknown';
    ui.npReciter.textContent = reciterName;
    updateStatusDisplay();

    // Highlight Text
    highlightVerse(verseNum);

    // Play
    const url = AppLogic.constructAudioUrl(state.selectedReciterId, state.selectedSurahId, verseNum);
    state.audio.src = url;
    state.audio.playbackRate = state.playbackRate; // Critical: Apply speed on new source
    state.audio.play();
}

function handleVerseEnd() {
    if (!state.isPlaying) return;

    // Use AppLogic to determine next move
    const currentState = {
        verseIndex: state.currentVerseIndex,
        verseLoopCount: state.currentVerseLoopCount,
        rangeLoopCount: state.currentRangeLoopCount
    };

    const settings = {
        startVerse: state.startVerse,
        endVerse: state.endVerse,
        verseRepeat: state.verseRepeat,
        rangeRepeat: state.rangeRepeat
    };

    const result = AppLogic.calculateNextState(currentState, settings);

    if (result.action === 'STOP') {
        // Range finished or stop requested
        stopPlayback();
        console.log("Loop finished");
    } else {
        // Apply new state
        state.currentVerseIndex = result.state.verseIndex;
        state.currentVerseLoopCount = result.state.verseLoopCount;
        state.currentRangeLoopCount = result.state.rangeLoopCount;

        // If we are repeating the EXACT same verse, just replay audio
        const prevVerseNum = settings.startVerse + currentState.verseIndex;
        const newVerseNum = settings.startVerse + state.currentVerseIndex;

        if (prevVerseNum === newVerseNum) {
            state.audio.currentTime = 0;
            state.audio.play();
            // playbackRate persists usually, but safe to re-assert if some browsers reset it
            state.audio.playbackRate = state.playbackRate;
            updateStatusDisplay();
        } else {
            playCurrentVerse();

        }
    }

}

function updateStatusDisplay() {
    if (ui.statusVerse) ui.statusVerse.textContent = `${state.currentVerseLoopCount + 1} / ${state.verseRepeat}`;
    if (ui.statusRange) ui.statusRange.textContent = `${state.currentRangeLoopCount + 1} / ${state.rangeRepeat}`;
}

function updatePlayButton() {
    if (!ui.btnPlay) return;
    const icon = ui.btnPlay.querySelector('i');
    if (state.isPlaying) {
        icon.classList.remove('fa-play');
        icon.classList.add('fa-pause');
        ui.btnPlay.parentElement.classList.add('playing');
    } else {
        icon.classList.remove('fa-pause');
        icon.classList.add('fa-play');
        ui.btnPlay.parentElement.classList.remove('playing');
    }
}

// --- Goals Logic ---

function addGoal() {
    const surahId = parseInt(ui.goalSurahSelect.value);
    const start = parseInt(ui.goalStartInput.value);
    const end = parseInt(ui.goalEndInput.value);
    const deadline = ui.goalDeadlineInput.value;

    if (!surahId || !start || !end || !deadline) {
        alert("Please fill in all fields for the goal.");
        return;
    }

    if (start > end) {
        alert("Start verse cannot be greater than end verse.");
        return;
    }

    const newGoal = {
        id: Date.now(),
        surahId,
        start,
        end,
        deadline
    };

    state.goals.push(newGoal);
    saveGoals();
    renderGoals();

    ui.goalDeadlineInput.value = '';
}

async function playGoal(id) {
    const goal = state.goals.find(g => g.id === id);
    if (!goal) return;

    // Stop current playback to be safe
    stopPlayback();

    // Update Surah Selection
    ui.surahSelect.value = goal.surahId;
    // Call handleSurahChange to set state and fetch verses (await it)
    await handleSurahChange(goal.surahId, false);

    // Set Range
    state.startVerse = goal.start;
    state.endVerse = goal.end;

    // Update UI Inputs
    ui.startVerseInput.value = goal.start;
    ui.endVerseInput.value = goal.end;

    // Save Settings
    saveSettings();

    // Start Playback
    startPlayback();

    // Scroll to top to see player/verses
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteGoal(id) {
    if (confirm("Are you sure you want to delete this goal?")) {
        state.goals = state.goals.filter(g => g.id !== id);
        saveGoals();
        renderGoals();
    }
}

function renderGoals() {
    ui.goalsList.innerHTML = '';

    if (state.goals.length === 0) {
        ui.goalsList.innerHTML = `
            <div class="empty-state">
                <p>No active goals. Set a target to track your memorization!</p>
            </div>`;
        return;
    }

    state.goals.forEach(goal => {
        const surah = state.chapters.find(c => c.id === goal.surahId);
        const surahName = surah ? surah.name : `Surah ${goal.surahId}`;

        // Calculate Progress
        const total = goal.end - goal.start + 1;
        let memorizedCount = 0;
        const surahMem = state.memorization[goal.surahId] || [];

        for (let i = goal.start; i <= goal.end; i++) {
            if (surahMem.includes(i)) {
                memorizedCount++;
            }
        }

        const percent = Math.round((memorizedCount / total) * 100);

        // Deadline Status
        const now = new Date();
        const deadlineDate = new Date(goal.deadline);
        // Set deadline to end of that day
        deadlineDate.setHours(23, 59, 59, 999);

        const diffMs = deadlineDate - now;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

        let deadlineClass = '';
        let deadlineText = '';

        if (diffMs < 0) {
            deadlineClass = 'overdue';
            deadlineText = 'Overdue';
        } else if (diffDays >= 1) {
            deadlineText = `${diffDays} Day${diffDays > 1 ? 's' : ''} Left`;
            // Warning if less than 3 days
            if (diffDays <= 3) deadlineClass = 'near';
        } else {
            // Less than 24 hours
            deadlineClass = 'near';
            deadlineText = `${diffHours} Hour${diffHours !== 1 ? 's' : ''} Left`;
        }

        // Format Date for display
        const dateDisplay = new Date(goal.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

        const div = document.createElement('div');
        div.className = 'goal-item';
        div.innerHTML = `
            <div class="goal-header">
                <div class="goal-title">
                    <span>${surahName}</span>
                    <span class="goal-range">Verses ${goal.start} - ${goal.end}</span>
                </div>
                <div class="goal-actions">
                    <button class="btn-play-goal" data-id="${goal.id}" title="Play Goal">
                        <i class="fa-solid fa-play"></i>
                    </button>
                    <button class="btn-delete-goal" data-id="${goal.id}" title="Delete Goal">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
            
            <span class="goal-deadline">
                <i class="fa-regular fa-calendar"></i> 
                ${dateDisplay}
                <span class="badge-deadline ${deadlineClass}">${deadlineText}</span>
            </span>
            
            <div class="goal-stats">
                <span>Progress</span>
                <span class="goal-percent">${percent}%</span>
            </div>
            
            <div class="goal-progress">
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: ${percent}%;"></div>
                </div>
            </div>
        `;

        ui.goalsList.appendChild(div);
    });
}

document.addEventListener('DOMContentLoaded', init);
// --- PWA: Service Worker Registration ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('Service Worker Registered'))
            .catch(err => console.log('Service Worker Registration Failed:', err));
    });
}
