/**
 * Simple Test Runner
 */
const assert = (desc, condition) => {
    const div = document.createElement('div');
    if (condition) {
        div.className = 'pass';
        div.innerHTML = `✅ <b>PASS</b>: ${desc}`;
    } else {
        div.className = 'fail';
        div.innerHTML = `❌ <b>FAIL</b>: ${desc}`;
        console.error(`FAIL: ${desc}`);
    }
    document.getElementById('results').appendChild(div);
};

// --- Tests ---

// 1. Validate Range
(() => {
    const max = 10;

    // Normal case
    let r = AppLogic.validateRange(2, 5, max);
    assert('validateRange: keeps valid range', r.start === 2 && r.end === 5);

    // Swap if Start > End
    r = AppLogic.validateRange(6, 4, max);
    assert('validateRange: fixes inverted range', r.start === 6 && r.end === 6);
    // ^ Logic was: "if start > end, set end = start"

    // Clamp Min
    r = AppLogic.validateRange(0, 5, max);
    assert('validateRange: clamps min to 1', r.start === 1);

    // Clamp Max
    r = AppLogic.validateRange(1, 15, max);
    assert('validateRange: clamps max to Max', r.end === 10);
})();

// 2. Audio URL
(() => {
    // Test Generic
    const url = AppLogic.constructAudioUrl('Reciter_ID', 1, 7);
    const expected = 'https://everyayah.com/data/Reciter_ID/001007.mp3';
    assert('constructAudioUrl: pads surah/verse correctly', url === expected);

    // Test specific ID format (just to be sure logic handles underscores etc)
    const url2 = AppLogic.constructAudioUrl('Alafasy_128kbps', 1, 1);
    const expected2 = 'https://everyayah.com/data/Alafasy_128kbps/001001.mp3';
    assert('constructAudioUrl: handles real ID', url2 === expected2);
})();

// 3. Loop Logic - Next State
(() => {
    // Settings: Verses 1-2. VerseRepeat: 2. RangeRepeat: 2.
    const settings = {
        startVerse: 1, endVerse: 2,
        verseRepeat: 2, rangeRepeat: 2
    };

    // Case A: Verse not done repeating
    // Current: Verse 1 (index 0), Loop 0
    let state = { verseIndex: 0, verseLoopCount: 0, rangeLoopCount: 0 };
    let next = AppLogic.calculateNextState(state, settings);

    assert('NextState: repeats verse if loop count < target',
        next.action === 'PLAY' &&
        next.state.verseLoopCount === 1 &&
        next.state.verseIndex === 0
    );

    // Case B: Verse done, move to next
    // Current: Verse 1 (index 0), Loop 1 (reached limit 2? No, limit is count. 0->1 is 2 plays)
    // Actually limit is 2. 0 is 1st play. 1 is 2nd play.
    // Logic: if loopCount + 1 < repeat.  1+1 < 2 is False. So move next.
    state = { verseIndex: 0, verseLoopCount: 1, rangeLoopCount: 0 };
    next = AppLogic.calculateNextState(state, settings);

    assert('NextState: moves to next verse after repeats done',
        next.action === 'PLAY' &&
        next.state.verseIndex === 1 &&
        next.state.verseLoopCount === 0
    );

    // Case C: End of Range, but Range Repeat not done
    // Current: Verse 2 (index 1), Loop 1 (Done with this verse).
    // rangeRepeat is 2. Current rangeLoop is 0.
    state = { verseIndex: 1, verseLoopCount: 1, rangeLoopCount: 0 };
    next = AppLogic.calculateNextState(state, settings);

    // Should reset verseIndex to 0, increment rangeLoopCount
    assert('NextState: loops range if range repeats remaining',
        next.action === 'PLAY' &&
        next.state.verseIndex === 0 &&
        next.state.rangeLoopCount === 1
    );

    // Case D: All Done
    // Current: Verse 2 (index 1), Loop 1. Range Loop 1.
    // Range Repeat is 2. Current is 1 (which means 2nd pass).
    // 1 < 2 is True? Wait.
    // If rangeRepeat is 2. 
    // Passes: 0, 1. (2 passes).
    // rangeLoopCount 1 means we just finished the 2nd pass.
    // Logic: if rangeLoopCount + 1 < rangeRepeat. 
    // 1 + 1 < 2 is False.
    // So STOP.
    state = { verseIndex: 1, verseLoopCount: 1, rangeLoopCount: 1 };
    next = AppLogic.calculateNextState(state, settings);

    assert('NextState: stops when all loops finished',
        next.action === 'STOP'
    );
})();
