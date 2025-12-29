/**
 * Quran Looping App
 * Logic for state management, API fetching, and audio playback.
 */

// --- Business Logic (Testable) ---
const AppLogic = {
    /**
     * Clamps verse range values within valid bounds.
     * @param {number} start - Requested start verse
     * @param {number} end - Requested end verse
     * @param {number} max - Maximum verses in the surah
     * @returns {Object} { start, end } - Validated values
     */
    validateRange: (start, end, max) => {
        let s = start || 1;
        let e = end || 1;

        if (s < 1) s = 1;
        if (s > max) s = max;

        if (e < 1) e = 1;
        if (e > max) e = max;

        // Ensure Start <= End
        if (s > e) e = s;

        return { start: s, end: e };
    },

    /**
     * Constructs the EveryAyah audio URL.
     * @param {string} reciterId - The reciter's folder name
     * @param {number|string} surahId - Surah number (1-114)
     * @param {number|string} verseId - Verse number
     * @returns {string} The full audio URL
     */
    constructAudioUrl: (reciterId, surahId, verseId) => {
        const surahPad = String(surahId).padStart(3, '0');
        const versePad = String(verseId).padStart(3, '0');
        return `https://everyayah.com/data/${reciterId}/${surahPad}${versePad}.mp3`;
    },

    /**
     * Determines the next playback state based on loop settings.
     * @param {Object} current - { verseIndex, verseLoopCount, rangeLoopCount }
     * @param {Object} settings - { startVerse, endVerse, verseRepeat, rangeRepeat }
     * @returns {Object} { action: 'PLAY'|'STOP', state: { ...newCurrent } }
     */
    calculateNextState: (current, settings) => {
        let { verseIndex, verseLoopCount, rangeLoopCount } = current;
        const { startVerse, endVerse, verseRepeat, rangeRepeat } = settings;

        // 1. Check Verse Loop
        if (verseLoopCount + 1 < verseRepeat) {
            return {
                action: 'PLAY',
                state: { ...current, verseLoopCount: verseLoopCount + 1 }
            };
        }

        // Verse Loop Done, Move to Next Verse
        const nextVerseIndex = verseIndex + 1;
        const nextVerseNum = startVerse + nextVerseIndex;

        // 2. Check Range Bounds
        if (nextVerseNum > endVerse) {
            // Range Finished
            if (rangeLoopCount + 1 < rangeRepeat) {
                // Restart Range
                return {
                    action: 'PLAY',
                    state: {
                        verseIndex: 0,
                        verseLoopCount: 0,
                        rangeLoopCount: rangeLoopCount + 1
                    }
                };
            } else {
                // All Done
                return { action: 'STOP', state: current };
            }
        }

        // 3. Just Next Verse
        return {
            action: 'PLAY',
            state: {
                verseIndex: nextVerseIndex,
                verseLoopCount: 0,
                rangeLoopCount: rangeLoopCount // Keep current range loop count
            }
        };
    }
};

// Expose for testing if environment supports it
if (typeof window !== 'undefined') {
    window.AppLogic = AppLogic;
}

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
    currentVerseIndex: 0,
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

        setupEventListeners();

        // Defaults
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
    const curatedReciters = [
        { id: 'Alafasy_128kbps', name: 'Mishary Rashid Alafasy' },
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
    });

    ui.surahSelect.addEventListener('change', (e) => {
        handleSurahChange(parseInt(e.target.value));
    });

    // Inputs
    ui.startVerseInput.addEventListener('change', updateRangeFromUI);
    ui.endVerseInput.addEventListener('change', updateRangeFromUI);

    // Play/Pause
    ui.btnPlay.addEventListener('click', togglePlay);
    ui.btnStop.addEventListener('click', stopPlayback);

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
    });

    ui.rangeRepeatInput.addEventListener('change', (e) => {
        state.rangeRepeat = parseInt(e.target.value) || 1;
    });

    // Audio
    state.audio.addEventListener('ended', handleVerseEnd);
    state.audio.addEventListener('error', (e) => {
        console.error("Audio Error", e);
        stopPlayback();
    });
}

function handleSurahChange(surahId) {
    state.selectedSurahId = surahId;
    const surah = state.chapters.find(c => c.id === surahId);

    if (surah) {
        ui.startVerseInput.max = surah.verses_count;
        ui.endVerseInput.max = surah.verses_count;

        // Reset to Verse 1
        ui.startVerseInput.value = 1;
        ui.endVerseInput.value = 1;

        state.startVerse = 1;
        state.endVerse = 1;

        ui.npSurah.textContent = surah.name;
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

    state.currentVerseIndex = 0;
    state.currentVerseLoopCount = 0;
    state.currentRangeLoopCount = 0;

    updatePlayButton();
    updateStatusDisplay();
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

    // Play
    const url = AppLogic.constructAudioUrl(state.selectedReciterId, state.selectedSurahId, verseNum);
    state.audio.src = url;
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
            updateStatusDisplay();
        } else {
            playCurrentVerse();
        }
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

document.addEventListener('DOMContentLoaded', init);