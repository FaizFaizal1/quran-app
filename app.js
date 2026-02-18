/**
 * Quran Looping App
 * Logic for state management, API fetching, and audio playback.
 */

// --- App Logic is loaded from logic.js ---
if (typeof window.AppLogic === 'undefined') {
  throw new Error('CRITICAL: logic.js not loaded!');
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

  // Playlist State
  mode: 'RANGE', // 'RANGE' or 'PLAYLIST'
  playlists: [], // [ { id: TIMESTAMP, name: "Default", items: [] } ]
  activePlaylistId: null, // ID of currently selected playlist

  // Legacy support: 'playlist' will be migrated to 'playlists[0]'

  playlistIndex: 0,
  playlistReciterId: null, // Separate reciter for playlist? Or shared? Shared easier for now.
  playlistRangeRepeat: 1,

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
  hasTouchedEndVerse: false, // Track manual interaction
  currentAudioUrl: '',
  currentAudioAttempt: 0,

  // Audio Object
  audio: document.getElementById('audio-player'),
};

// --- DOM Elements ---
const ui = {
  reciterSelect: document.getElementById('reciter-select'),
  surahSelect: document.getElementById('surah-select'),
  startVerseInput: document.getElementById('start-verse'),
  endVerseInput: document.getElementById('end-verse'),
  verseRepeatInput: document.getElementById('verse-repeat'),
  rangeRepeatInput: document.getElementById('range-repeat'),

  // Playlist UI
  playlistReciterSelect: document.getElementById('playlist-reciter-select'),
  btnModeRange: document.getElementById('btn-mode-range'),
  btnModePlaylist: document.getElementById('btn-mode-playlist'),
  rangeSettingsPanel: document.getElementById('range-settings-panel'),
  playlistSettingsPanel: document.getElementById('playlist-settings-panel'),
  playlistItems: document.getElementById('playlist-items'),
  btnClearPlaylist: document.getElementById('btn-clear-playlist'),
  btnPlayPlaylist: document.getElementById('btn-play-playlist'),
  playlistRangeRepeatInput: document.getElementById('playlist-range-repeat'),

  // New Playlist Manager UI
  playlistSelect: document.getElementById('playlist-select'),
  btnCreatePlaylist: document.getElementById('btn-create-playlist'),
  btnRenamePlaylist: document.getElementById('btn-rename-playlist'),
  btnMergePlaylist: document.getElementById('btn-merge-playlist'),

  btnImportPlaylist: document.getElementById('btn-import-playlist'), // New: Import
  btnExportPlaylist: document.getElementById('btn-export-playlist'), // New: Export
  importPlaylistFile: document.getElementById('import-playlist-file'), // New: File Input
  btnDeletePlaylist: document.getElementById('btn-delete-playlist'),

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
  controlBtns: document.querySelectorAll(
    '.control-btn.plus, .control-btn.minus'
  ),

  // Goals UI
  goalSurahSelect: document.getElementById('goal-surah'),
  goalStartInput: document.getElementById('goal-start'),
  goalEndInput: document.getElementById('goal-end'),
  goalDeadlineInput: document.getElementById('goal-deadline'),
  btnAddGoal: document.getElementById('btn-add-goal'),
  goalsList: document.getElementById('goals-list'),
};

const STORAGE_KEYS = {
  chapters: 'quranChaptersCache',
  versesPrefix: 'quranVersesCache:',
};

const FETCH_RETRY_COUNT = 2;
const FETCH_TIMEOUT_MS = 10000;
const AUDIO_RETRY_COUNT = 1;
const AUDIO_TIMEOUT_MS = 8000;

let audioRecoveryTimeoutId = null;

async function fetchWithRetry(url, options = {}) {
  const { retries = FETCH_RETRY_COUNT, timeoutMs = FETCH_TIMEOUT_MS } = options;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status}`);
      }
      return response;
    } catch {
      if (attempt === retries) throw new Error('Request failed after retries');
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error('Unreachable');
}

function clearAudioRecoveryTimeout() {
  if (audioRecoveryTimeoutId) {
    clearTimeout(audioRecoveryTimeoutId);
    audioRecoveryTimeoutId = null;
  }
}

async function attemptAudioPlayback(url, attempt = 0) {
  if (!state.isPlaying) return;

  if (attempt > AUDIO_RETRY_COUNT) {
    clearAudioRecoveryTimeout();
    stopPlayback();
    alert(
      'Audio could not be loaded. Please check your network and try again.'
    );
    return;
  }

  state.currentAudioUrl = url;
  state.currentAudioAttempt = attempt;
  clearAudioRecoveryTimeout();

  state.audio.src = url;
  state.audio.playbackRate = state.playbackRate;

  audioRecoveryTimeoutId = setTimeout(() => {
    attemptAudioPlayback(url, attempt + 1);
  }, AUDIO_TIMEOUT_MS);

  try {
    await state.audio.play();
  } catch {
    attemptAudioPlayback(url, attempt + 1);
  }
}

function shouldRegisterServiceWorker() {
  if (!('serviceWorker' in navigator)) return false;
  if (navigator.webdriver) return false;

  const isLocalhost =
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';
  if (!isLocalhost && window.location.protocol !== 'https:') return false;

  return true;
}

function registerServiceWorker() {
  if (!shouldRegisterServiceWorker()) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // fail silently to avoid blocking app usage
    });
  });
}

// --- Persistence ---

function saveSettings() {
  const settings = AppLogic.createSettingsObject(state);

  settings.mode = state.mode;
  settings.playlists = state.playlists;
  settings.activePlaylistId = state.activePlaylistId;
  settings.playlistRangeRepeat = state.playlistRangeRepeat;

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

      // Playlist Migration Logic
      state.mode = settings.mode || 'RANGE';
      state.playlistRangeRepeat = settings.playlistRangeRepeat || 1;

      if (settings.playlists && Array.isArray(settings.playlists)) {
        state.playlists = settings.playlists;
        state.activePlaylistId = settings.activePlaylistId;
      } else if (settings.playlist && Array.isArray(settings.playlist)) {
        // Migrate old single playlist
        const defaultId = generateUniquePlaylistId();
        state.playlists = [
          {
            id: defaultId,
            name: 'Default Playlist',
            items: settings.playlist,
          },
        ];
        state.activePlaylistId = defaultId;
      } else {
        // Initialize fresh if nothing exists
        const defaultId = generateUniquePlaylistId();
        state.playlists = [
          {
            id: defaultId,
            name: 'My Playlist',
            items: [],
          },
        ];
        state.activePlaylistId = defaultId;
      }

      ensureActivePlaylist();

      // Apply to UI
      ui.startVerseInput.value = state.startVerse;
      ui.endVerseInput.value = state.endVerse;
      ui.verseRepeatInput.value = state.verseRepeat;
      ui.rangeRepeatInput.value = state.rangeRepeat;
      ui.btnSpeed.textContent = `${state.playbackRate}x`;
      state.audio.playbackRate = state.playbackRate;
      ui.playlistRangeRepeatInput.value = state.playlistRangeRepeat;

      // Apply Mode
      switchMode(state.mode);
      updatePlaylistSelectOptions(); // Populate dropdown
      renderPlaylist();

      return true; // Settings loaded
    } catch {
      state.playlists = [];
      state.activePlaylistId = null;
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
    } catch {
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
    } catch {
      state.goals = [];
    }
  }
}

// --- Initialization ---
async function init() {
  try {
    registerServiceWorker();

    await Promise.all([fetchReciters(), fetchChapters()]);

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
      if (ui.playlistReciterSelect)
        ui.playlistReciterSelect.value = state.selectedReciterId; // Sync
      ui.surahSelect.value = state.selectedSurahId;
      handleSurahChange(state.selectedSurahId, false); // false = don't reset verses
    } else {
      // Defaults
      if (state.reciters.length > 0) {
        ui.reciterSelect.value = state.reciters[0].id;
        state.selectedReciterId = state.reciters[0].id;
        if (ui.playlistReciterSelect)
          ui.playlistReciterSelect.value = state.reciters[0].id;
      }
      if (state.chapters.length > 0) {
        ui.surahSelect.value = state.chapters[0].id;
        handleSurahChange(state.chapters[0].id);
      }

      ensureActivePlaylist();
      updatePlaylistSelectOptions();
    }
  } catch {
    alert(
      'Failed to load initial data. Please check your internet connection.'
    );
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
    { id: 'Hudhaify_128kbps', name: 'Ali Al-Hudhaify' },
  ];

  state.reciters = curatedReciters;
  populateSelect(ui.reciterSelect, state.reciters, 'id', 'name');
  if (ui.playlistReciterSelect)
    populateSelect(ui.playlistReciterSelect, state.reciters, 'id', 'name');
}

async function fetchChapters() {
  try {
    const response = await fetchWithRetry(
      'https://api.quran.com/api/v4/chapters'
    );
    const data = await response.json();

    state.chapters = data.chapters.map((ch) => ({
      id: ch.id,
      name: `${ch.id}. ${ch.name_simple} (${ch.translated_name.name})`,
      verses_count: ch.verses_count,
    }));

    localStorage.setItem(STORAGE_KEYS.chapters, JSON.stringify(state.chapters));
  } catch {
    const cached = localStorage.getItem(STORAGE_KEYS.chapters);
    if (!cached) throw new Error('Unable to load chapter list');

    state.chapters = JSON.parse(cached);
  }

  populateSelect(ui.surahSelect, state.chapters, 'id', 'name');
}

async function fetchVerses(surahId) {
  ui.versesContainer.innerHTML =
    '<div class="verse-item placeholder"><p>Loading Verses...</p></div>';
  state.versesData = []; // Clear old data immediately

  try {
    // Fetch Arabic (Uthmani) and Translation (Saheeh International: 131) in parallel
    // We use per_page=300 to fetch all verses in one go (max surah length is 286)
    const [arabicRes, transRes] = await Promise.all([
      fetchWithRetry(
        `https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${surahId}&per_page=300`
      ),
      fetchWithRetry(
        `https://api.quran.com/api/v4/quran/translations/131?chapter_number=${surahId}&per_page=300`
      ),
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
      translation: transVerses[i] ? transVerses[i].text : '',
    }));

    localStorage.setItem(
      `${STORAGE_KEYS.versesPrefix}${surahId}`,
      JSON.stringify(state.versesData)
    );

    renderVerses();
  } catch {
    const cached = localStorage.getItem(
      `${STORAGE_KEYS.versesPrefix}${surahId}`
    );
    if (cached) {
      state.versesData = JSON.parse(cached);
      renderVerses();
      return;
    }

    ui.versesContainer.innerHTML =
      '<div class="verse-item placeholder"><p>Error loading text.</p></div>';
  }
}

function renderVerses() {
  ui.versesContainer.innerHTML = '';

  state.versesData.forEach((verse) => {
    const div = document.createElement('div');
    div.className = 'verse-item';
    div.id = `verse-${verse.number}`; // ID for scrolling

    div.innerHTML = `
            <div class="verse-header">
                <span class="verse-number">${verse.number}</span>
                <button class="control-btn btn-add-playlist" data-verse="${verse.number}" title="Add to Playlist">
                    <i class="fa-solid fa-list-ul"></i>
                </button>
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

    // Add to Playlist Listener
    const btnAdd = div.querySelector('.btn-add-playlist');
    btnAdd.addEventListener('click', () => {
      addToPlaylist(state.selectedSurahId, verse.number, verse.text);
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
    state.memorization[surahId] = state.memorization[surahId].filter(
      (v) => v !== verseNum
    );
  }

  saveMemorization();
  updateProgress();

  // Update goals that might be affected
  renderGoals();
}

function updateProgress() {
  const surah = state.chapters.find((c) => c.id === state.selectedSurahId);
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
  document
    .querySelectorAll('.verse-item.active-verse')
    .forEach((el) => el.classList.remove('active-verse'));

  // Add new highlight
  // Add new highlight
  const el = document.getElementById(`verse-${verseNum}`);
  if (el) {
    el.classList.add('active-verse');

    // Revised Scroll Logic for Single Column
    // The container is now .content-area
    const container = document.querySelector('.content-area');

    // Simple scrollIntoView works better in this simplified layout
    // but let's stick to the manual calculation to be safe centering

    const elHeight = el.offsetHeight;
    const containerHeight = container.clientHeight;

    // We need to account for the container's scroll position if we use offsetTop relative to parent
    // However, since el is inside title > container, offsetTop is relative to offsetParent.

    // Let's use getBoundingClientRect for absolute precision
    const rect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const offset = rect.top - containerRect.top + container.scrollTop;
    const centeredScroll = offset - containerHeight / 2 + elHeight / 2;

    container.scrollTo({
      top: centeredScroll,
      behavior: 'smooth',
    });
  }
}

// --- UI Helpers ---

function populateSelect(element, items, valueKey, textKey) {
  element.innerHTML = '';
  items.forEach((item) => {
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
  ui.startVerseInput.addEventListener('change', () => {
    updateRangeFromUI();
    saveSettings();
  });
  // Update end verse interaction state on change
  ui.endVerseInput.addEventListener('change', () => {
    state.hasTouchedEndVerse = true;
    updateRangeFromUI();
    saveSettings();
  });

  // End Verse Focus Sync Logic
  ui.endVerseInput.addEventListener('focus', () => {
    if (!state.hasTouchedEndVerse) {
      // Sync to Start Verse if not manually touched yet
      ui.endVerseInput.value = ui.startVerseInput.value;
      // Trigger update to sync state
      updateRangeFromUI();
    }
  });

  // Play/Pause
  ui.btnPlay.addEventListener('click', togglePlay);
  ui.btnStop.addEventListener('click', stopPlayback);
  ui.btnPrev.addEventListener('click', playPrevious);
  ui.btnNext.addEventListener('click', playNext);

  // Speed Control
  ui.btnSpeed.addEventListener('click', () => {
    toggleSpeed();
    saveSettings();
  });

  // Controls +/-
  ui.controlBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      const isPlus = btn.classList.contains('plus');
      let val = parseInt(input.value) || 1;

      if (isPlus) val++;
      else val = Math.max(1, val - 1);

      // Special logic: If updating End Verse manually via buttons, flag it as touched
      if (targetId === 'end-verse') {
        state.hasTouchedEndVerse = true;
      }

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
  state.audio.addEventListener('playing', clearAudioRecoveryTimeout);
  state.audio.addEventListener('error', () => {
    if (!state.isPlaying || !state.currentAudioUrl) {
      stopPlayback();
      return;
    }

    attemptAudioPlayback(state.currentAudioUrl, state.currentAudioAttempt + 1);
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

  // Mobile Responsive
  window.addEventListener('resize', () => {
    // ...
  });

  // Drawer Logic
  const drawer = document.getElementById('settings-drawer');
  const overlay = document.getElementById('settings-overlay');
  const btnToggle = document.getElementById('btn-toggle-settings');
  const btnClose = document.getElementById('btn-close-settings');

  function toggleDrawer() {
    if (drawer) drawer.classList.add('open');
    if (overlay) overlay.classList.remove('open');
  }

  toggleDrawer();

  if (btnToggle) btnToggle.addEventListener('click', toggleDrawer);
  if (btnClose) btnClose.addEventListener('click', toggleDrawer);
  if (overlay) overlay.addEventListener('click', toggleDrawer);

  // Playlist Mode Toggles
  ui.btnModeRange.addEventListener('click', () => switchMode('RANGE'));
  ui.btnModePlaylist.addEventListener('click', () => switchMode('PLAYLIST'));

  // Playlist Controls
  if (ui.playlistReciterSelect) {
    ui.playlistReciterSelect.addEventListener('change', (e) => {
      state.selectedReciterId = e.target.value;
      // Sync with other select
      ui.reciterSelect.value = state.selectedReciterId;
      saveSettings();
    });
  }

  ui.btnClearPlaylist.addEventListener('click', clearPlaylist);

  ui.btnPlayPlaylist.addEventListener('click', () => startPlayback());

  // Create Playlist
  if (ui.btnCreatePlaylist) {
    ui.btnCreatePlaylist.addEventListener('click', createPlaylist);
  }

  // Rename Playlist
  if (ui.btnRenamePlaylist) {
    ui.btnRenamePlaylist.addEventListener('click', renamePlaylist);
  }

  // Delete Playlist
  if (ui.btnDeletePlaylist) {
    ui.btnDeletePlaylist.addEventListener('click', deletePlaylist);
  }

  // Merge Playlist
  if (ui.btnMergePlaylist) {
    ui.btnMergePlaylist.addEventListener('click', mergePlaylists);
  }

  // Playlist Selector Change
  if (ui.playlistSelect) {
    ui.playlistSelect.addEventListener('change', (e) => {
      const selectedId = Number(e.target.value);
      state.activePlaylistId = Number.isFinite(selectedId)
        ? selectedId
        : state.playlists[0]?.id;
      ensureActivePlaylist();
      saveSettings();
      renderPlaylist();
    });
  }

  // Import Playlist
  if (ui.btnImportPlaylist && ui.importPlaylistFile) {
    ui.btnImportPlaylist.addEventListener('click', () =>
      ui.importPlaylistFile.click()
    );
    ui.importPlaylistFile.addEventListener('change', handlePlaylistImport);
  }

  // Export Playlist
  if (ui.btnExportPlaylist) {
    ui.btnExportPlaylist.addEventListener('click', exportPlaylist);
  }

  ui.playlistRangeRepeatInput.addEventListener('change', (e) => {
    state.playlistRangeRepeat = parseInt(e.target.value) || 1;
    saveSettings();
  });

  // Delegated Playlist Item Events (Remove)
  ui.playlistItems.addEventListener('click', (e) => {
    const removeBtn = e.target.closest('.btn-remove-playlist-item');
    if (removeBtn) {
      const index = parseInt(removeBtn.getAttribute('data-index'));
      removeFromPlaylist(index);
    }
  });

  // Update Max Verse for Goal Inputs
  ui.goalSurahSelect.addEventListener('change', (e) => {
    const surahId = parseInt(e.target.value);
    const surah = state.chapters.find((c) => c.id === surahId);
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
  state.hasTouchedEndVerse = false; // Reset interaction flag
  const surah = state.chapters.find((c) => c.id === surahId);

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

  const surah = state.chapters.find((c) => c.id === state.selectedSurahId);
  const max = surah ? surah.verses_count : 114;

  const validated = AppLogic.validateRange(start, end, max);

  // Update UI and State
  ui.startVerseInput.value = validated.start;
  ui.endVerseInput.value = validated.end;

  state.startVerse = validated.start;
  state.endVerse = validated.end;
}

// Hard Reset Logic
const btnHardReset = document.getElementById('btn-hard-reset');
if (btnHardReset) {
  btnHardReset.addEventListener('click', async () => {
    if (
      confirm(
        'This will clear all settings and reload the app to fix issues. Continue?'
      )
    ) {
      // 1. Unregister Service Workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }

      // 2. Clear Local Storage (Optional, maybe keep data?)
      // Let's keep goals/memorization but clear settings which might be corrupted
      localStorage.removeItem('quranLoopSettings');

      // 3. Force Reload
      window.location.reload(true);
    }
  });
}

// --- Playlist Logic ---

function generateUniquePlaylistId(extraUsedIds = new Set()) {
  const existingIds = new Set(
    state.playlists
      .map((playlist) => Number(playlist?.id))
      .filter((id) => Number.isFinite(id))
  );

  extraUsedIds.forEach((id) => existingIds.add(id));

  let id = Date.now();
  while (existingIds.has(id)) id += 1;

  return id;
}

function ensureActivePlaylist() {
  if (!Array.isArray(state.playlists)) {
    state.playlists = [];
  }

  const sanitized = [];
  const usedIds = new Set();
  const validPlaylists = state.playlists.filter(
    (playlist) => playlist && typeof playlist === 'object'
  );

  for (let index = validPlaylists.length - 1; index >= 0; index -= 1) {
    const playlist = validPlaylists[index];

    let id = Number(playlist.id);
    if (!Number.isFinite(id) || usedIds.has(id)) {
      id = generateUniquePlaylistId(usedIds);
    }
    usedIds.add(id);

    const name =
      typeof playlist.name === 'string' && playlist.name.trim()
        ? playlist.name.trim()
        : `Playlist ${index + 1}`;

    sanitized.unshift({
      id,
      name,
      items: Array.isArray(playlist.items) ? playlist.items : [],
    });
  }

  state.playlists = sanitized;

  if (state.playlists.length === 0) {
    const defaultId = generateUniquePlaylistId();
    state.playlists = [
      {
        id: defaultId,
        name: 'My Playlist',
        items: [],
      },
    ];
    state.activePlaylistId = defaultId;
    return;
  }

  const activeId = Number(state.activePlaylistId);
  const hasActivePlaylist = state.playlists.some((p) => p.id === activeId);
  state.activePlaylistId = hasActivePlaylist ? activeId : state.playlists[0].id;
}

/**
 * Helper to get the active playlist object
 */
function getActivePlaylist() {
  ensureActivePlaylist();
  return state.playlists.find((p) => p.id === state.activePlaylistId);
}

function switchMode(newMode) {
  state.mode = newMode;

  // UI Toggles
  if (newMode === 'PLAYLIST') {
    ui.btnModeRange.classList.remove('active');
    ui.btnModePlaylist.classList.add('active');
    ui.rangeSettingsPanel.style.display = 'none';
    ui.playlistSettingsPanel.style.display = 'block';

    ui.statusVerse.parentElement.style.opacity = '0.5';
    ui.statusRange.previousElementSibling.textContent = 'Playlist Loop';

    // Ensure playlist selector is populated
    updatePlaylistSelectOptions();
  } else {
    ui.btnModePlaylist.classList.remove('active');
    ui.btnModeRange.classList.add('active');
    ui.playlistSettingsPanel.style.display = 'none';
    ui.rangeSettingsPanel.style.display = 'block';

    ui.statusVerse.parentElement.style.opacity = '1';
    ui.statusRange.previousElementSibling.textContent = 'Range Loop';
  }

  saveSettings();
  stopPlayback();
}

// --- Playlist Management (CRUD) ---

function updatePlaylistSelectOptions() {
  if (!ui.playlistSelect) return;
  ensureActivePlaylist();

  ui.playlistSelect.innerHTML = '';
  state.playlists.forEach((pl) => {
    const option = document.createElement('option');
    option.value = pl.id;
    option.textContent = pl.name;
    if (pl.id === state.activePlaylistId) option.selected = true;
    ui.playlistSelect.appendChild(option);
  });
}

function createPlaylist() {
  const name =
    window.QURAN_TEST_PROMPT || prompt('Enter playlist name:', 'New Playlist');
  const normalizedName = name ? String(name).trim() : '';

  if (normalizedName) {
    const newId = generateUniquePlaylistId();
    state.playlists.push({
      id: newId,
      name: normalizedName,
      items: [],
    });
    state.activePlaylistId = newId;
    saveSettings();
    updatePlaylistSelectOptions();
    renderPlaylist();
  }
}

function renamePlaylist() {
  const active = getActivePlaylist();
  if (!active) return;
  const newName =
    window.QURAN_TEST_PROMPT || prompt('Rename playlist:', active.name);
  const normalizedName = newName ? String(newName).trim() : '';

  if (normalizedName) {
    active.name = normalizedName;
    saveSettings();
    updatePlaylistSelectOptions();
  }
}

function deletePlaylist() {
  const active = getActivePlaylist();
  if (!active) return;

  if (state.playlists.length <= 1) {
    alert('Cannot delete the last playlist.');
    return;
  }

  if (confirm(`Delete playlist "${active.name}"?`)) {
    state.playlists = state.playlists.filter((p) => p.id !== active.id);
    state.activePlaylistId = state.playlists[0].id;
    saveSettings();
    updatePlaylistSelectOptions();
    renderPlaylist();
  }
}

function mergePlaylists() {
  if (state.playlists.length < 2) {
    alert('You need at least two playlists to merge.');
    return;
  }

  const active = getActivePlaylist();

  // Create a simple prompt showing IDs/Names?
  // For simplicity, let's use a standard prompt requiring the exact name,
  // or better, temporarily show a confirm list?
  // Let's iterate and ask user which one to merge.

  // Refinement: Prompt user to choose index from list string.
  let msg = `Select playlist to merge FROM into "${active.name}":\n`;
  const others = state.playlists.filter((p) => p.id !== active.id);
  others.forEach((p, idx) => {
    msg += `${idx + 1}. ${p.name}\n`;
  });

  const choice = prompt(msg);
  if (choice) {
    const index = parseInt(choice) - 1;
    if (index >= 0 && index < others.length) {
      const source = others[index];
      if (confirm(`Merge items from "${source.name}" into "${active.name}"?`)) {
        // Merge items
        // Should we clone them to avoid reference issues? Yes.
        const clonedItems = JSON.parse(JSON.stringify(source.items));
        // Update IDs to be unique?
        clonedItems.forEach((item) => (item.id = Date.now() + Math.random()));

        active.items.push(...clonedItems);

        saveSettings();
        renderPlaylist();
        alert('Merged successfully!');
      }
    } else {
      alert('Invalid selection.');
    }
  }
}

async function handlePlaylistImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const data = JSON.parse(text);

    if (!Array.isArray(data)) {
      alert('Invalid format: Root must be a JSON array.');
      return;
    }

    const newItems = [];

    // Parsing Logic
    for (const entry of data) {
      const surahId = parseInt(entry.surah);
      if (!surahId || isNaN(surahId)) continue; // Skip invalid surah

      const surah = state.chapters.find((c) => c.id === surahId);
      if (!surah) continue; // Skip unknown surah

      // Determine verses to add
      let versesToAdd = [];

      if (entry.verses) {
        // Parse "1-5, 8, 10" string
        const ranges = String(entry.verses)
          .split(',')
          .map((s) => s.trim());
        ranges.forEach((r) => {
          if (r.includes('-')) {
            const [start, end] = r.split('-').map((n) => parseInt(n));
            if (!isNaN(start) && !isNaN(end)) {
              for (let i = start; i <= end; i++) {
                if (i <= surah.verses_count) versesToAdd.push(i);
              }
            }
          } else {
            const v = parseInt(r);
            if (!isNaN(v) && v <= surah.verses_count) versesToAdd.push(v);
          }
        });
      } else if (entry.start && entry.end) {
        // Legacy support for "start": 1, "end": 7
        const start = parseInt(entry.start);
        const end = parseInt(entry.end);
        for (let i = start; i <= end; i++) {
          if (i <= surah.verses_count) versesToAdd.push(i);
        }
      } else if (entry.verse) {
        // Single verse
        const v = parseInt(entry.verse);
        if (!isNaN(v) && v <= surah.verses_count) versesToAdd.push(v);
      }

      // Add unique verses
      versesToAdd.forEach((vNum) => {
        newItems.push({
          surahId: surahId,
          verseNum: vNum,
          text: '',
          id: Date.now() + Math.random(), // Ensure unique ID
        });
      });
    }

    if (newItems.length > 0) {
      const name = prompt(
        'Import successful! Name this playlist:',
        file.name.replace('.json', '')
      );
      const normalizedName = name ? String(name).trim() : '';

      if (normalizedName) {
        const newId = generateUniquePlaylistId();
        state.playlists.push({
          id: newId,
          name: normalizedName,
          items: newItems,
        });
        state.activePlaylistId = newId;
        saveSettings();
        updatePlaylistSelectOptions();
        renderPlaylist();
        alert(`Imported ${newItems.length} verses into "${normalizedName}".`);
      }
    } else {
      alert('No valid verses found in the file.');
    }
  } catch {
    alert('Failed to import playlist. Please verify the file format.');
  } finally {
    event.target.value = ''; // Reset input
  }
}

function exportPlaylist() {
  const active = getActivePlaylist();
  if (!active) {
    alert('No active playlist to export.');
    return;
  }

  if (active.items.length === 0) {
    if (!confirm('This playlist is empty. Export anyway?')) return;
  }

  // Prepare Data: Export items as a JSON array of simple objects
  // Format: [ { surah: 1, verse: 1 }, ... ]
  // Or optimized ranges? Let's just dump items for now, easy to re-import.
  // Actually, re-import expects {surah, verses} or just {surah, verse}.
  // Our internal structure has {surahId, verseNum}.

  // Let's clean up the export to act as a proper backup
  const exportData = active.items.map((item) => ({
    surah: item.surahId,
    verse: item.verseNum,
  }));

  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  // Sanitize filename
  const safeName = active.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const timestamp = new Date().toISOString().slice(0, 10);
  a.download = `playlist_${safeName}_${timestamp}.json`;

  document.body.appendChild(a);
  a.click();

  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

function addToPlaylist(surahId, verseNum, text) {
  const active = getActivePlaylist();
  if (!active) return;

  active.items.push({
    surahId,
    verseNum,
    text: text || '',
    id: Date.now(),
  });

  renderPlaylist();
  saveSettings();

  // UI Feedback
  const btn = document.querySelector(
    `.btn-add-playlist[data-verse="${verseNum}"]`
  );
  if (btn) {
    const original = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-check"></i>';
    setTimeout(() => (btn.innerHTML = original), 1000);
  }
}

function removeFromPlaylist(index) {
  const active = getActivePlaylist();
  if (!active) return;

  active.items.splice(index, 1);
  renderPlaylist();
  saveSettings();
}

function clearPlaylist() {
  const active = getActivePlaylist();
  if (active && confirm(`Clear all items from "${active.name}"?`)) {
    active.items = [];
    renderPlaylist();
    saveSettings();
  }
}

function renderPlaylist() {
  if (!ui.playlistItems) return;
  ui.playlistItems.innerHTML = '';

  const active = getActivePlaylist();
  if (!active || !active.items) return;

  if (active.items.length === 0) {
    ui.playlistItems.innerHTML =
      '<div class="empty-state" style="padding: 15px; color: var(--text-muted); text-align: center;">Playlist is empty. Add verses from the main card.</div>';
    return;
  }

  active.items.forEach((item, index) => {
    const surahName =
      state.chapters.find((c) => c.id === item.surahId)?.name_simple ||
      `Surah ${item.surahId}`;

    const div = document.createElement('div');

    const isActive =
      state.mode === 'PLAYLIST' &&
      state.isPlaying &&
      state.playlistIndex === index;
    div.className = `playlist-item ${isActive ? 'playing' : ''}`;

    div.innerHTML = `
            <div class="playlist-item-text">
                <span class="playlist-index">${index + 1}.</span> 
                ${surahName} <span class="playlist-meta">${item.surahId}:${item.verseNum}</span>
            </div>
            <button class="btn-remove-playlist-item" data-index="${index}">
                <i class="fa-solid fa-times"></i>
            </button>
         `;
    ui.playlistItems.appendChild(div);
  });
}

// --- Playback Logic ---

function toggleSpeed() {
  state.playbackRate = AppLogic.calculateNextSpeed(state.playbackRate);
  ui.btnSpeed.textContent = `${state.playbackRate} x`;

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

function navigatePlayback(direction) {
  const isNext = direction > 0;

  if (state.mode === 'PLAYLIST') {
    const active = getActivePlaylist();
    if (!active || active.items.length === 0) return;

    const maxIndex = active.items.length - 1;
    state.playlistIndex = isNext
      ? Math.min(maxIndex, state.playlistIndex + 1)
      : Math.max(0, state.playlistIndex - 1);
  } else {
    const totalVerses = Math.max(1, state.endVerse - state.startVerse + 1);
    const maxIndex = totalVerses - 1;
    state.currentVerseIndex = isNext
      ? Math.min(maxIndex, state.currentVerseIndex + 1)
      : Math.max(0, state.currentVerseIndex - 1);
  }

  state.currentVerseLoopCount = 0;
  state.currentRangeLoopCount = 0;
  playCurrentVerse();
}

function playPrevious() {
  navigatePlayback(-1);
}

function playNext() {
  navigatePlayback(1);
}

function startPlayback() {
  if (state.mode === 'PLAYLIST') {
    const active = getActivePlaylist();
    if (!active || active.items.length === 0) {
      alert('Playlist is empty!');
      return;
    }
  } else {
    if (!state.selectedReciterId || !state.selectedSurahId) {
      alert('Please select a Reciter and Surah.');
      return;
    }
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
  clearAudioRecoveryTimeout();
  updatePlayButton();
  state.audio.pause();
}

function stopPlayback() {
  state.isPlaying = false;
  state.audio.pause();
  state.audio.currentTime = 0;
  state.audio.playbackRate = state.playbackRate; // Reset rate just in case
  clearAudioRecoveryTimeout();
  state.currentAudioUrl = '';
  state.currentAudioAttempt = 0;

  // Reset Counters
  state.currentVerseIndex = 0;
  state.currentVerseLoopCount = 0;
  state.currentRangeLoopCount = 0;

  // Only reset playlist index if stopped? Or maybe keep it?
  // Usually stop resets to beginning. Pause keeps place.
  state.playlistIndex = 0;

  updatePlayButton();
  updateStatusDisplay();
  renderPlaylist(); // To remove active highlight

  // Remove Highlight
  document
    .querySelectorAll('.verse-item.active-verse')
    .forEach((el) => el.classList.remove('active-verse'));
}

function playCurrentVerse() {
  if (!state.isPlaying) return;

  let surahId, verseNum;

  if (state.mode === 'PLAYLIST') {
    const active = getActivePlaylist();
    if (!active) {
      stopPlayback();
      return;
    }

    const item = active.items[state.playlistIndex];
    if (!item) {
      stopPlayback();
      return;
    }
    surahId = item.surahId;
    verseNum = item.verseNum;

    // Update Player Card Text
    const surah = state.chapters.find((c) => c.id === surahId);
    ui.npSurah.textContent = surah ? surah.name : `Surah ${surahId} `;
    ui.npDetails.textContent = `Playlist (${active.name}) ${state.playlistIndex + 1} / ${active.items.length} (Verse ${surahId}:${verseNum})`;

    renderPlaylist(); // Update active item highlight
  } else {
    // Range Mode
    surahId = state.selectedSurahId;
    verseNum = state.startVerse + state.currentVerseIndex;
    // Update UI
    ui.npDetails.textContent = `Verse ${verseNum} / ${state.endVerse}`;

    // Highlight in Verse List (Only if current surah is visible?)
    highlightVerse(verseNum);
  }

  const reciterName =
    state.reciters.find((r) => r.id === state.selectedReciterId)?.name ||
    'Unknown';
  ui.npReciter.textContent = reciterName;
  updateStatusDisplay();

  // Play
  // Ensure surahId and verseNum are valid numbers/strings
  const url = AppLogic.constructAudioUrl(
    state.selectedReciterId,
    surahId,
    verseNum
  );
  attemptAudioPlayback(url);
}

function handleVerseEnd() {
  if (!state.isPlaying) return;

  // Get Playlist Length safely
  let pLength = 0;
  if (state.mode === 'PLAYLIST') {
    const active = getActivePlaylist();
    pLength = active ? active.items.length : 0;
  }

  // Use AppLogic to determine next move
  const currentState = {
    verseIndex: state.currentVerseIndex,
    verseLoopCount: state.currentVerseLoopCount,
    rangeLoopCount: state.currentRangeLoopCount,
    mode: state.mode,
    playlistIndex: state.playlistIndex,
  };

  const settings = {
    startVerse: state.startVerse,
    endVerse: state.endVerse,
    verseRepeat: state.verseRepeat,
    rangeRepeat:
      state.mode === 'PLAYLIST' ? state.playlistRangeRepeat : state.rangeRepeat,
    playlistLength: pLength,
  };

  const result = AppLogic.calculateNextState(currentState, settings);

  if (result.action === 'STOP') {
    // Range finished or stop requested
    stopPlayback();
  } else {
    // Apply new state
    state.currentVerseIndex = result.state.verseIndex;
    state.currentVerseLoopCount = result.state.verseLoopCount;
    state.currentRangeLoopCount = result.state.rangeLoopCount;

    if (state.mode === 'PLAYLIST') {
      state.playlistIndex = result.state.playlistIndex;
    }

    // Check if we need to replay exact same audio or load new
    // Optimization: if verseNum is same, just replay.

    // But for Playlist, even if verse is same (duplicates?), we might want to treat it as next step.
    // Simplest is to just call playCurrentVerse() which reloads src.
    // Logic.js returns state. App.js executes.

    // If it's a "replay same verse" in loop (verseLoopCount increased), we just replay.
    // If verseLoopCount is 0, we moved to next item.

    if (result.state.verseLoopCount > 0) {
      state.audio.currentTime = 0;
      state.audio.play();
      state.audio.playbackRate = state.playbackRate;
      updateStatusDisplay();
    } else {
      playCurrentVerse();
    }
  }
}

function updateStatusDisplay() {
  if (state.mode === 'PLAYLIST') {
    if (ui.statusVerse)
      ui.statusVerse.textContent = `${state.currentVerseLoopCount + 1} / ${state.verseRepeat}`;
    if (ui.statusRange)
      ui.statusRange.textContent = `${state.currentRangeLoopCount + 1} / ${state.playlistRangeRepeat}`;
  } else {
    if (ui.statusVerse)
      ui.statusVerse.textContent = `${state.currentVerseLoopCount + 1} / ${state.verseRepeat}`;
    if (ui.statusRange)
      ui.statusRange.textContent = `${state.currentRangeLoopCount + 1} / ${state.rangeRepeat}`;
  }
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
    alert('Please fill in all fields for the goal.');
    return;
  }

  if (start > end) {
    alert('Start verse cannot be greater than end verse.');
    return;
  }

  const newGoal = {
    id: Date.now(),
    surahId,
    start,
    end,
    deadline,
  };

  state.goals.push(newGoal);
  saveGoals();
  renderGoals();

  ui.goalDeadlineInput.value = '';
}

async function playGoal(id) {
  const goal = state.goals.find((g) => g.id === id);
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
  if (confirm('Are you sure you want to delete this goal?')) {
    state.goals = state.goals.filter((g) => g.id !== id);
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

  state.goals.forEach((goal) => {
    const surah = state.chapters.find((c) => c.id === goal.surahId);
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
    let deadlineText;

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
    const dateDisplay = new Date(goal.deadline).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });

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

// Initialize App
window.addEventListener('DOMContentLoaded', init);
