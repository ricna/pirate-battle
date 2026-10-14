import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { observe, open, play } from './helpers';

const pageErrors = new Map<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  pageErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message));
  await open(page);
});
test.afterEach(async ({ page }) => {
  expect(pageErrors.get(page), 'No unhandled application errors').toEqual([]);
  pageErrors.delete(page);
});

test('pause board offers Resume, Options and Main Menu like the reference', async ({ page }) => {
  await play(page);
  await page.getByRole('button', { name: 'Pause game' }).click();
  const pause = page.getByRole('dialog', { name: 'Battle paused' });
  await expect(pause.getByRole('heading', { name: 'Paused' })).toBeVisible();
  await expect(pause).toContainText('Ready when you are.');
  await expect(pause.getByRole('button')).toHaveText(['Resume', 'Options', 'Main Menu']);
});

test('options opened from pause save immediately without changing the running battle', async ({ page }) => {
  await play(page);
  const before = await observe(page);
  await page.getByRole('button', { name: 'Pause game' }).click();
  await page.getByRole('button', { name: 'Options', exact: true }).click();

  const options = page.getByRole('dialog', { name: 'Options' });
  await expect(options).toContainText('Game changes apply to your next battle.');
  await options.getByRole('button', { name: 'Increase game session time' }).click();
  await expect(options).toContainText(`${before.config.sessionSeconds + 10} s`);

  // Escape steps back to the pause board instead of resuming the battle.
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Battle paused' })).toBeVisible();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  expect((await observe(page)).config.sessionSeconds).toBe(before.config.sessionSeconds);

  // The saved preference survives leaving the battle and reaches the Options screen.
  await page.getByRole('button', { name: 'Pause game' }).click();
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
  await page.getByRole('button', { name: 'Leave battle', exact: true }).click();
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Options' })).toBeVisible();
  await expect(page.locator('.options-board')).toContainText(`${before.config.sessionSeconds + 10} s`);
});

test('leaving from pause asks for confirmation and Stay here returns to the pause board', async ({
  page,
}) => {
  await play(page);
  await page.getByRole('button', { name: 'Pause game' }).click();
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
  const leave = page.getByRole('dialog', { name: 'Leave this battle?' });
  await expect(leave).toContainText('This unfinished battle will not be saved.');
  await page.getByRole('button', { name: 'Stay here', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Battle paused' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
