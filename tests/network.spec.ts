import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { Scenario } from '../src/infrastructure/network/NetworkScenarios';
import { advance, open, play, scenario, selectRecordsTab } from './helpers';

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

const serverRecords = (page: Page) =>
  page.evaluate(() => (JSON.parse(localStorage.getItem('pirate.server') ?? '[]') as unknown[]).length);

/** Request failures and the accessible message each one produces after the single automatic retry. */
const RequestFailures: readonly { readonly scenario: Scenario; readonly message: RegExp }[] = [
  { scenario: 'timeout', message: /Request timed out/ },
  { scenario: 'connection-error', message: /Connection failed/ },
  { scenario: 'http-400', message: /Service error \(400\)/ },
  { scenario: 'http-500', message: /Service error \(503\)/ },
];

for (const failure of RequestFailures) {
  test(`${failure.scenario}: lists report an accessible error and recover`, async ({ page }) => {
    await scenario(page, failure.scenario);
    await page.getByRole('button', { name: 'Ranking', exact: true }).click();
    // Timeouts need two 1.8 s attempts plus TanStack's retry delay before the error is shown.
    await expect(page.getByRole('alert')).toContainText(failure.message, { timeout: 15000 });
    await expect(page.getByRole('button', { name: 'Retry', exact: true })).toBeVisible();
    await scenario(page, 'success');
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
}

test('slow responses show loading, and background refreshes keep cached rows visible', async ({ page }) => {
  await scenario(page, 'slow');
  await page.getByRole('button', { name: 'Ranking', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Loading records…' })).toBeVisible();
  await expect(page.getByRole('table')).toBeVisible({ timeout: 5000 });
  await expect(page.getByText('Loading records…')).toHaveCount(0);
  // Returning to the tab refetches in the background: cached rows stay visible, dimmed, with a status.
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
  await page.getByRole('button', { name: 'Ranking', exact: true }).click();
  const table = page.getByRole('table');
  await expect(table).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'Updating records…' })).toBeVisible();
  await expect(table).toHaveAttribute('aria-busy', 'true');
  await expect(page.getByText('Updating records…')).toHaveCount(0, { timeout: 5000 });
  await expect(table).toHaveAttribute('aria-busy', 'false');
});

test('variable latency resolves both lists deterministically', async ({ page }) => {
  await scenario(page, 'variable-latency');
  await page.getByRole('button', { name: 'Ranking', exact: true }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByText('Page 1 of 3')).toBeVisible();
  await selectRecordsTab(page, 'Match History');
  await expect(page.getByText('No records yet.', { exact: false })).toBeVisible();
});

test('an out-of-order ranking response is cancelled and never replaces the newer view', async ({ page }) => {
  const cancelled: string[] = [];
  page.on('requestfailed', (request) => {
    if (request.url().includes('/api/ranking')) cancelled.push(request.failure()?.errorText ?? '');
  });
  await scenario(page, 'out-of-order');
  // Request 1 (ranking) takes 1300 ms; request 2 (history) answers in 100 ms.
  await page.getByRole('button', { name: 'Ranking', exact: true }).click();
  await selectRecordsTab(page, 'Match History');
  await expect(page.getByText('No records yet.', { exact: false })).toBeVisible();
  await page.waitForTimeout(1600);
  await expect(page.getByRole('tabpanel', { name: 'Match History' })).toBeVisible();
  await expect(page.getByText('No records yet.', { exact: false })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: 'Captain' })).toHaveCount(0);
  expect(cancelled.length, 'The abandoned ranking request is aborted').toBeGreaterThan(0);
});

test('a pending battle never blocks a new match, and repeated retries register it once', async ({ page }) => {
  await scenario(page, 'outage');
  await play(page);
  await advance(page, 120);
  await expect(page.getByRole('alert')).toContainText('503');
  // Another battle can start while the first one is still pending.
  await play(page);
  await page.getByRole('button', { name: 'Pause game' }).click();
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
  await page.getByRole('button', { name: 'Leave battle' }).click();
  await expect(page.locator('.pending-banner')).toContainText('1 battle(s) awaiting registration');
  await scenario(page, 'slow');
  // Three synchronous clicks, before React can disable the button, resend the same match ID.
  await page.evaluate(() => {
    const retry = Array.from(document.querySelectorAll('button')).find(
      (button) => button.textContent === 'Retry pending battle',
    );
    if (!retry) throw new Error('The pending banner must offer a retry.');
    for (let click = 0; click < 3; click++) retry.click();
  });
  await expect(page.locator('.pending-banner')).toHaveCount(0, { timeout: 10000 });
  expect(await serverRecords(page)).toBe(1);
  await page.getByRole('button', { name: 'Match History', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(1);
});
