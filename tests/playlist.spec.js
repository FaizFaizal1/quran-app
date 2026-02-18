const { test, expect } = require('@playwright/test');

test.describe('Playlist Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Mock confirm to always return true
    await page.evaluate(() => {
      window.confirm = () => true;
    });

    // Sidebar is always visible now
    await page.waitForSelector('#btn-mode-playlist', { state: 'visible' });

    // Ensure app/event listeners are ready
    await page.waitForFunction(
      () => typeof window.createPlaylist === 'function',
      null,
      { timeout: 60000 }
    );
    await expect(page.locator('#playlist-select option')).toHaveCount(1);

    // Switch to Playlist Mode
    await page.click('#btn-mode-playlist');
    await expect(page.locator('#playlist-settings-panel')).toBeVisible();
  });

  test('should create a new playlist', async ({ page }) => {
    await expect(page.locator('#playlist-select option')).toHaveCount(1);

    // Set prompt value
    await page.evaluate(() => (window.QURAN_TEST_PROMPT = 'New Test Playlist'));

    // Trigger creation via JS click
    await page.evaluate(() =>
      document.getElementById('btn-create-playlist').click()
    );

    // Wait for update
    await expect(page.locator('#playlist-select')).toHaveValue(/^\d+$/);
    await expect(page.locator('#playlist-select option:checked')).toHaveText(
      'New Test Playlist'
    );
    await expect(page.locator('#playlist-select option')).toHaveCount(2);

    await page.evaluate(() => (window.QURAN_TEST_PROMPT = null));
  });

  test('should rename a playlist', async ({ page }) => {
    // Create first
    await page.evaluate(() => (window.QURAN_TEST_PROMPT = 'Temp Playlist'));
    await page.evaluate(() =>
      document.getElementById('btn-create-playlist').click()
    );
    await expect(page.locator('#playlist-select option:checked')).toHaveText(
      'Temp Playlist'
    );

    // Rename
    await page.evaluate(() => (window.QURAN_TEST_PROMPT = 'Updated Name'));
    await page.evaluate(() =>
      document.getElementById('btn-rename-playlist').click()
    );

    await expect(page.locator('#playlist-select option:checked')).toHaveText(
      'Updated Name'
    );

    await page.evaluate(() => (window.QURAN_TEST_PROMPT = null));
  });

  test('should delete a playlist', async ({ page }) => {
    // Create dummy
    await page.evaluate(() => (window.QURAN_TEST_PROMPT = 'Delete Me'));
    await page.evaluate(() =>
      document.getElementById('btn-create-playlist').click()
    );
    await expect(page.locator('#playlist-select option:checked')).toHaveText(
      'Delete Me'
    );

    // Delete uses confirm(). We mocked it to return true.
    // Prompt should not be called for delete, but create uses it.
    await page.evaluate(() =>
      document.getElementById('btn-delete-playlist').click()
    );

    // Should revert to default
    await expect(page.locator('#playlist-select option')).toHaveCount(1);
    await expect(page.locator('#playlist-select option:checked')).toHaveText(
      'My Playlist'
    );
  });

  test('should add verses to playlist', async ({ page }) => {
    // 1. Create playlist
    await page.evaluate(
      () => (window.QURAN_TEST_PROMPT = 'Verse Test Playlist')
    );
    await page.evaluate(() =>
      document.getElementById('btn-create-playlist').click()
    );

    // 2. Go to Verses
    await page.waitForSelector('.verse-number');

    // Click "Add to Playlist" on first verse
    // Note: ensure api loaded verses. If only 1 verse warning, fine.
    await page.click('.verse-item:first-child .btn-add-playlist');

    // 3. Verify
    await expect(page.locator('#playlist-items .playlist-item')).toHaveCount(1);
    // The text contains "1. Surah Name 1:1", so we check for verse number or surah name
    await expect(page.locator('#playlist-items .playlist-item')).toContainText(
      '1:1'
    );
  });
});
