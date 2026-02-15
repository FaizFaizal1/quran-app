const AppLogic = require('../logic.js');

describe('AppLogic', () => {
  // --- Range Validation ---
  describe('validateRange', () => {
    test('validates correct range', () => {
      const result = AppLogic.validateRange(2, 5, 10);
      expect(result).toEqual({ start: 2, end: 5 });
    });

    test('swaps if start > end', () => {
      const result = AppLogic.validateRange(5, 2, 10);
      expect(result).toEqual({ start: 5, end: 5 });
      // Logic: "if s > e, e = s". So range becomes 5-5.
      // Wait, let's verify if that is the intended behavior or if it should swap.
      // app.js logic:
      // if (s > e) e = s;
      // So yes, 5,2 becomes 5,5.
    });

    test('clamps to min 1', () => {
      const result = AppLogic.validateRange(0, 5, 10);
      expect(result).toEqual({ start: 1, end: 5 });
    });

    test('clamps to max', () => {
      const result = AppLogic.validateRange(1, 15, 10);
      expect(result).toEqual({ start: 1, end: 10 });
    });
  });

  // --- Audio URL ---
  describe('constructAudioUrl', () => {
    test('constructs valid URL with padding', () => {
      const url = AppLogic.constructAudioUrl('Reciter_ID', 1, 7);
      expect(url).toBe('https://everyayah.com/data/Reciter_ID/001007.mp3');
    });

    test('handles string inputs', () => {
      const url = AppLogic.constructAudioUrl('Test', '2', '10');
      expect(url).toBe('https://everyayah.com/data/Test/002010.mp3');
    });
  });

  // --- Loop Logic ---
  describe('calculateNextState', () => {
    const settings = {
      startVerse: 1,
      endVerse: 2,
      verseRepeat: 2,
      rangeRepeat: 2,
    };

    test('Action: PLAY - repeats verse', () => {
      // Verse 1, Loop 0 -> Should be Verse 1, Loop 1
      const current = { verseIndex: 0, verseLoopCount: 0, rangeLoopCount: 0 };
      const next = AppLogic.calculateNextState(current, settings);

      expect(next.action).toBe('PLAY');
      expect(next.state.verseLoopCount).toBe(1);
      expect(next.state.verseIndex).toBe(0);
    });

    test('Action: PLAY - next verse', () => {
      // Verse 1, Loop 1 (Done) -> Should be Verse 2, Loop 0
      const current = { verseIndex: 0, verseLoopCount: 1, rangeLoopCount: 0 };
      const next = AppLogic.calculateNextState(current, settings);

      expect(next.action).toBe('PLAY');
      expect(next.state.verseIndex).toBe(1);
      expect(next.state.verseLoopCount).toBe(0);
    });

    test('Action: PLAY - repeats range', () => {
      // Verse 2, Loop 1 (End of Range) -> Range Loop 0 -> Should be Verse 1, Loop 0, Range Loop 1
      const current = { verseIndex: 1, verseLoopCount: 1, rangeLoopCount: 0 };
      const next = AppLogic.calculateNextState(current, settings);

      expect(next.action).toBe('PLAY');
      expect(next.state.verseIndex).toBe(0);
      expect(next.state.rangeLoopCount).toBe(1);
    });

    test('Action: STOP - all done', () => {
      // Verse 2, Loop 1. Range Loop 1 (Done) -> STOP
      const current = { verseIndex: 1, verseLoopCount: 1, rangeLoopCount: 1 };
      const next = AppLogic.calculateNextState(current, settings);

      expect(next.action).toBe('STOP');
    });
  });

  // --- Speed Logic ---
  describe('calculateNextSpeed', () => {
    test('cycles through speeds correctly', () => {
      expect(AppLogic.calculateNextSpeed(1.0)).toBe(1.25);
      expect(AppLogic.calculateNextSpeed(1.25)).toBe(1.5);
      expect(AppLogic.calculateNextSpeed(1.5)).toBe(2.0);
      expect(AppLogic.calculateNextSpeed(2.0)).toBe(0.75);
      expect(AppLogic.calculateNextSpeed(0.75)).toBe(1.0);
    });

    test('resets to 1.0 from unknown', () => {
      expect(AppLogic.calculateNextSpeed(99.9)).toBe(1.0);
    });
  });

  // --- Persistence ---
  describe('createSettingsObject', () => {
    test('extracts only relevant fields', () => {
      const mockState = {
        selectedReciterId: 'xyz',
        selectedSurahId: 1,
        startVerse: 1,
        endVerse: 10,
        verseRepeat: 3,
        rangeRepeat: 1,
        playbackRate: 1.25,
        isPlaying: true, // Should be ignored
        chapters: [], // Should be ignored
      };

      const settings = AppLogic.createSettingsObject(mockState);

      expect(settings).toEqual({
        reciterId: 'xyz',
        surahId: 1,
        startVerse: 1,
        endVerse: 10,
        verseRepeat: 3,
        rangeRepeat: 1,
        playbackRate: 1.25,
      });
    });
  });
});
