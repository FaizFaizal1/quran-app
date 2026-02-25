/**
 * Quran App Logic
 * Pure functions for state management and calculations.
 * Compatible with Browser (window) and Node.js (module.exports).
 */

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

    if (reciterId === 'minshawi_mushaf_muallim') {
      return `https://mp3quran.net/minshawi_mushaf/${surahPad}.mp3`;
    }

    return `https://everyayah.com/data/${reciterId}/${surahPad}${versePad}.mp3`;
  },

  /**
   * Determines the next playback state based on loop settings.
   * @param {Object} current - { verseIndex, verseLoopCount, rangeLoopCount }
   * @param {Object} settings - { startVerse, endVerse, verseRepeat, rangeRepeat }
   * @returns {Object} { action: 'PLAY'|'STOP', state: { ...newCurrent } }
   */
  calculateNextState: (current, settings) => {
    let { verseIndex, verseLoopCount, rangeLoopCount, mode, playlistIndex } =
      current;
    const { startVerse, endVerse, verseRepeat, rangeRepeat, playlistLength } =
      settings;

    // 1. Check Verse Loop (Common for both modes)
    if (verseLoopCount + 1 < verseRepeat) {
      return {
        action: 'PLAY',
        state: { ...current, verseLoopCount: verseLoopCount + 1 },
      };
    }

    // Verse Loop Done.
    // Determine "Next Item" based on Mode.

    if (mode === 'PLAYLIST') {
      const nextPlaylistIndex = (playlistIndex || 0) + 1;

      if (nextPlaylistIndex >= playlistLength) {
        // Playlist Finished
        if (rangeLoopCount + 1 < rangeRepeat) {
          // Restart Playlist
          return {
            action: 'PLAY',
            state: {
              mode: 'PLAYLIST',
              playlistIndex: 0,
              verseIndex: 0, // Placeholder
              verseLoopCount: 0,
              rangeLoopCount: rangeLoopCount + 1,
            },
          };
        } else {
          // All Done
          return { action: 'STOP', state: current };
        }
      } else {
        // Next Item in Playlist
        return {
          action: 'PLAY',
          state: {
            mode: 'PLAYLIST',
            playlistIndex: nextPlaylistIndex,
            verseIndex: 0, // Placeholder
            verseLoopCount: 0,
            rangeLoopCount: rangeLoopCount,
          },
        };
      }
    } else {
      // RANGE MODE (Default)
      const nextVerseIndex = verseIndex + 1;
      const nextVerseNum = startVerse + nextVerseIndex;

      // Check Range Bounds
      if (nextVerseNum > endVerse) {
        // Range Finished
        if (rangeLoopCount + 1 < rangeRepeat) {
          // Restart Range
          return {
            action: 'PLAY',
            state: {
              mode: 'RANGE',
              verseIndex: 0,
              verseLoopCount: 0,
              rangeLoopCount: rangeLoopCount + 1,
            },
          };
        } else {
          // All Done
          return { action: 'STOP', state: current };
        }
      }

      // Just Next Verse
      return {
        action: 'PLAY',
        state: {
          mode: 'RANGE',
          verseIndex: nextVerseIndex,
          verseLoopCount: 0,
          rangeLoopCount: rangeLoopCount, // Keep current range loop count
        },
      };
    }
  },

  /**
   * Calculates the next playback speed.
   * @param {number} currentRate
   * @returns {number} Next rate
   */
  calculateNextSpeed: (currentRate) => {
    const speeds = [1.0, 1.25, 1.5, 2.0, 0.75];
    const currentIndex = speeds.indexOf(currentRate);
    // If not found (custom rate), default to 1.0
    if (currentIndex === -1) return 1.0;
    const nextIndex = (currentIndex + 1) % speeds.length;
    return speeds[nextIndex];
  },

  /**
   * Validates and sanitizes settings for storage.
   * @param {Object} state - Current application state
   * @returns {Object} Sanitized settings object
   */
  createSettingsObject: (state) => {
    return {
      reciterId: state.selectedReciterId,
      surahId: state.selectedSurahId,
      startVerse: state.startVerse,
      endVerse: state.endVerse,
      verseRepeat: state.verseRepeat,
      rangeRepeat: state.rangeRepeat,
      playbackRate: state.playbackRate,
    };
  },
};

// Export (Node.js) or Expose (Browser)
if (typeof window !== 'undefined') {
  window.AppLogic = AppLogic;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AppLogic;
}
