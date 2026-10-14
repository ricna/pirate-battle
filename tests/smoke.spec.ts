import { expect, test } from '@playwright/test';

/**
 * Runs against the optimized production build: the local `vite preview` server by default, or a
 * deployed URL through PIRATE_SMOKE_URL. It proves the published bundle, service worker and mocks work.
 */
test('the published build serves its commit, mocks Ranking and History, and registers a battle', async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });

  const version = (await (await request.get('/version.json')).json()) as { commit: string };
  expect(version.commit).toMatch(/^[0-9a-f]{7,12}(-dirty)?$/);
  expect((await request.get('/mockServiceWorker.js')).ok()).toBe(true);

  await page.clock.setFixedTime(new Date('2026-10-12T18:00:00Z'));
  await page.goto('/?test=1');
  await expect(page.locator('meta[name="build-commit"]')).toHaveAttribute('content', version.commit);
  await page.getByRole('button', { name: 'Ranking', exact: true }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.getByText('Page 1 of 3')).toBeVisible();
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click();

  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.waitForFunction(() => !!window.pirateTest);
  await page.evaluate(() => window.pirateTest!.advance!(120));
  await expect(page.getByRole('heading', { name: 'Battle result' })).toBeVisible();
  await expect(page.locator('.result-panel')).toContainText('Battle registered');

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Battle result' })).toBeVisible();
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
  await page.getByRole('button', { name: 'Match History', exact: true }).click();
  await expect(page.locator('tbody tr')).toHaveCount(1);
  expect(errors).toEqual([]);
});
