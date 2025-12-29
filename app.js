/**
 * Quran Looping App
 * Logic for state management, API fetching, and audio playback.
 */

// --- State Management ---
const state = {
    reciters: [],
    chapters: [],

    // Selection state
    selectedReciterId: null,
    selectedSurahId: null,
    startVerse: 1,
    endVerse: 1,

    // Loop Settings
    verseRepeat: 1,
    rangeRepeat: 1,

    // Runtime State
    isPlaying: false,
    currentVerseIndex: 0, // 0-based index relative to the range
    currentVerseLoopCount: 0,
    currentRangeLoopCount: 0,

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

    // Controls
    btnPrev: document.getElementById('btn-prev'),
    btnPlay: document.getElementById('btn-play'),
    btnStop: document.getElementById('btn-stop'),
    btnNext: document.getElementById('btn-next'),

    // Increment/Decrement Buttons
    controlBtns: document.querySelectorAll('.control-btn.plus, .control-btn.minus')
};

// --- Initialization ---
async function init() {
    console.log('Initializing Quran Loop App...');

    try {
        await Promise.all([
            fetchReciters(),
            fetchChapters()
        ]);

        // Setup Event Listeners after data is loaded
        setupEventListeners();

        // Select first valid options by default
        if (state.reciters.length > 0) {
            ui.reciterSelect.value = state.reciters[0].id;
            state.selectedReciterId = state.reciters[0].id;
        }
        if (state.chapters.length > 0) {
            ui.surahSelect.value = state.chapters[0].id;
            handleSurahChange(state.chapters[0].id);
        }

    } catch (error) {
        console.error("Initialization Failed:", error);
        alert("Failed to load initial data. Please check your internet connection.");
    }
}

// --- Data Fetching ---

async function fetchReciters() {
    // We will use a curated list of high-quality reciters compatible with EveryAyah format
    // This ensures reliable verse-by-verse streaming without complex segmentation parsing
    const curatedReciters = [
        { id: 'Mishary_Rashid_Alafasy_128kbps', name: 'Mishary Rashid Alafasy' },
        { id: 'Abdul_Basit_Murattal_192kbps', name: 'Abdul Basit (Murattal)' },
        { id: 'Abdul_Basit_Mujawwad_128kbps', name: 'Abdul Basit (Mujawwad)' },
        { id: 'Minshawy_Murattal_128kbps', name: 'Al-Minshawy (Murattal)' },
        { id: 'Husary_128kbps', name: 'Mahmoud Khalil Al-Husary' },
        { id: 'Ghamadi_40kbps', name: 'Saad Al-Ghamdi' },
        { id: 'Hudhaify_128kbps', name: 'Ali Al-Hudhaify' }
    ];

    state.reciters = curatedReciters;
    populateSelect(ui.reciterSelect, state.reciters, 'id', 'name');
    console.log('Reciters loaded:', state.reciters.length);
}

async function fetchChapters() {
    const response = await fetch('https://api.quran.com/api/v4/chapters');
    const data = await response.json();

    // api.quran.com returns { chapters: [...] }
    state.chapters = data.chapters.map(ch => ({
        id: ch.id,
        name: `${ch.id}. ${ch.name_simple} (${ch.translated_name.name})`,
        verses_count: ch.verses_count
    }));

    populateSelect(ui.surahSelect, state.chapters, 'id', 'name');
    console.log('Chapters loaded:', state.chapters.length);
}

// --- UI Helpers ---

function populateSelect(element, items, valueKey, textKey) {
    element.innerHTML = ''; // Clear existing
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
        console.log('Reciter changed:', state.selectedReciterId);
    });

    ui.surahSelect.addEventListener('change', (e) => {
        handleSurahChange(parseInt(e.target.value));
    });

    // Inputs
    ui.startVerseInput.addEventListener('change', validateRange);
    ui.endVerseInput.addEventListener('change', validateRange);

    // Play/Pause
    ui.btnPlay.addEventListener('click', togglePlay);
    ui.btnStop.addEventListener('click', stopPlayback);

    // Increment/Decrement handlers
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

    // Loop Inputs
    ui.verseRepeatInput.addEventListener('change', (e) => {
        state.verseRepeat = parseInt(e.target.value) || 1;
    });

    ui.rangeRepeatInput.addEventListener('change', (e) => {
        state.rangeRepeat = parseInt(e.target.value) || 1;
    });

    // Playback Monitor
    state.audio.addEventListener('ended', handleVerseEnd);
    state.audio.addEventListener('error', (e) => {
        console.error("Audio Error", e);
        // Do not alert repeatedly in loop
        stopPlayback();
    });
}

function handleSurahChange(surahId) {
    state.selectedSurahId = surahId;
    const surah = state.chapters.find(c => c.id === surahId);

    if (surah) {
        // Update Verse Limits
        ui.startVerseInput.max = surah.verses_count;
        ui.endVerseInput.max = surah.verses_count;

        // Reset Inputs
        ui.startVerseInput.value = 1;
        ui.endVerseInput.value = 1; // Default to verse 1

        state.startVerse = 1;
        state.endVerse = 1;

        // Update UI Text
        ui.npSurah.textContent = surah.name;
    }
}

function validateRange() {
    let start = parseInt(ui.startVerseInput.value) || 1;
    let end = parseInt(ui.endVerseInput.value) || 1;

    const surah = state.chapters.find(c => c.id === state.selectedSurahId);
    const max = surah ? surah.verses_count : 114;

    // Clamp values
    if (start < 1) start = 1;
    if (start > max) start = max;

    if (end < 1) end = 1;
    if (end > max) end = max;

    // Ensure Start <= End
    if (start > end) {
        end = start;
    }

    ui.startVerseInput.value = start;
    ui.endVerseInput.value = end;

    state.startVerse = start;
    state.endVerse = end;
}

// --- Playback Logic ---

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

    // If we are resumed, just play
    if (state.audio.src && !state.audio.ended && state.audio.currentTime > 0) {
        state.audio.play();
    } else {
        // Start from beginning
        // If we were stopped, indices are 0
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

    // Reset loop counters
    state.currentVerseIndex = 0;
    state.currentVerseLoopCount = 0;
    state.currentRangeLoopCount = 0;

    updatePlayButton();
    updateStatusDisplay();
}

function playCurrentVerse() {
    if (!state.isPlaying) return;

    // Calculate current verse number
    const verseNum = state.startVerse + state.currentVerseIndex;

    // Check if we exceeded range
    if (verseNum > state.endVerse) {
        // End of range
        state.currentRangeLoopCount++;

        if (state.currentRangeLoopCount < state.rangeRepeat) {
            // Restart range
            state.currentVerseIndex = 0;
            state.currentVerseLoopCount = 0;
            playCurrentVerse();
        } else {
            // All Done
            stopPlayback();
            console.log("Range loop finished.");
        }
        return;
    }

    // Update UI
    ui.npDetails.textContent = `Verse ${verseNum} / ${state.endVerse}`;
    // ^ note: I used npDetails instead of creating a new npVerse element to match html

    const reciterName = state.reciters.find(r => r.id === state.selectedReciterId)?.name || 'Unknown Reciter';
    ui.npReciter.textContent = reciterName;

    updateStatusDisplay();

    // Construct URL (EveryAyah format: surah(3)verse(3).mp3)
    const surahPad = String(state.selectedSurahId).padStart(3, '0');
    const versePad = String(verseNum).padStart(3, '0');
    const url = `https://everyayah.com/data/${state.selectedReciterId}/${surahPad}${versePad}.mp3`;

    state.audio.src = url;
    state.audio.play();
}

function handleVerseEnd() {
    if (!state.isPlaying) return;

    state.currentVerseLoopCount++;

    if (state.currentVerseLoopCount < state.verseRepeat) {
        // Repeat same verse
        state.audio.currentTime = 0;
        state.audio.play();
        updateStatusDisplay();
    } else {
        // Move to next verse
        state.currentVerseLoopCount = 0;
        state.currentVerseIndex++;
        playCurrentVerse();
    }
}

function updateStatusDisplay() {
    ui.statusVerse.textContent = `${state.currentVerseLoopCount + 1} / ${state.verseRepeat}`;
    ui.statusRange.textContent = `${state.currentRangeLoopCount + 1} / ${state.rangeRepeat}`;
}

function updatePlayButton() {
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

// Start App
document.addEventListener('DOMContentLoaded', init);