import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { WorldCamera } from '../src/game/rendering/WorldCamera';
import { advance, observe, open, play, waitForAuthoredArt } from './helpers';

async function capture(page: Page, name: string) {
  await waitForAuthoredArt(page);
  await page.screenshot({ path: `reports/mobile-layout/${name}.png`, fullPage: true });
}

test('camera follows the player, clamps all four shores and retains the desktop overview', () => {
  const camera = new WorldCamera(2048, 1152);
  camera.resize(844, 390);
  camera.follow({ x: 1024, y: 576 });
  const center = camera.observation();
  expect(center.scale).toBeGreaterThanOrEqual(0.75);
  expect((center.width * center.height) / (center.scale ** 2 * 2048 * 1152)).toBeCloseTo(0.25, 2);
  for (const target of [
    { x: 0, y: 0 },
    { x: 2048, y: 0 },
    { x: 0, y: 1152 },
    { x: 2048, y: 1152 },
  ]) {
    camera.follow(target);
    const view = camera.observation();
    expect(view.x).toBeLessThanOrEqual(0);
    expect(view.y).toBeLessThanOrEqual(0);
    expect(view.x + view.worldWidth * view.scale).toBeGreaterThanOrEqual(view.width);
    expect(view.y + view.worldHeight * view.scale).toBeGreaterThanOrEqual(view.height);
  }
  camera.resize(1800, 1000);
  camera.follow({ x: 34, y: 34 });
  const overview = camera.observation();
  expect(overview.following).toBe(false);
  expect(overview.scale * 1152).toBeCloseTo(1000);
  expect(overview.x).toBeGreaterThanOrEqual(0);
});

for (const viewport of [
  { width: 568, height: 320 },
  { width: 667, height: 375 },
  { width: 844, height: 390 },
  { width: 932, height: 430 },
  { width: 320, height: 568 },
  { width: 390, height: 844 },
]) {
  test(`compact menus and HUD remain usable at ${viewport.width}x${viewport.height}`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    const suffix = `${viewport.width}x${viewport.height}`;
    try {
      await open(page);
      await capture(page, `menu-${suffix}`);
      for (const button of await page.locator('.main-menu button').all()) {
        const box = (await button.boundingBox())!;
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
        expect(box.y + box.height).toBeLessThanOrEqual(viewport.height - 40);
      }
      await page.getByRole('button', { name: 'Options', exact: true }).click();
      await capture(page, `options-${suffix}`);
      for (const button of await page.locator('.options-step').all()) {
        const box = (await button.boundingBox())!;
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
      await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
      await page.getByRole('button', { name: 'Ranking', exact: true }).click();
      await expect(page.locator('tbody tr').first()).toBeVisible();
      await capture(page, `records-${suffix}`);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
      await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
      await play(page);
      if (viewport.width < viewport.height) {
        await expect(page.getByRole('dialog', { name: 'Battle paused' })).toBeVisible();
        await page.setViewportSize({ width: viewport.height, height: viewport.width });
        await page.getByRole('button', { name: 'Resume', exact: true }).click();
      }
      await advance(page, 0);
      const screen = page.viewportSize()!;
      const before = await observe(page);
      expect(before.camera.following).toBe(true);
      expect(before.config.player.visual.height * before.camera.scale).toBeGreaterThanOrEqual(84);
      const boxes = await page
        .locator('.hud-health, .hud-counter, .hud-pause, .fullscreen-button, .command')
        .evaluateAll((elements) =>
          elements.map((element) => {
            const box = element.getBoundingClientRect();
            return { x: box.x, y: box.y, right: box.right, bottom: box.bottom };
          }),
        );
      for (const box of boxes) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.right).toBeLessThanOrEqual(screen.width);
        expect(box.bottom).toBeLessThanOrEqual(screen.height);
        for (const other of boxes)
          if (box !== other) {
            expect(
              box.right <= other.x || box.x >= other.right || box.bottom <= other.y || box.y >= other.bottom,
            ).toBe(true);
          }
      }
      await capture(page, `arena-${suffix}`);
      await page.keyboard.down('w');
      // Start near the southern shore: sail far enough to leave the camera's bounded edge region.
      await advance(page, 1.2);
      await page.keyboard.up('w');
      const moved = await observe(page);
      expect(moved.player.y).not.toBe(before.player.y);
      expect(moved.camera.y).not.toBe(before.camera.y);
      await page.setViewportSize({ width: 1280, height: 800 });
      await expect.poll(async () => (await observe(page)).camera.following).toBe(false);
      const overview = await observe(page);
      expect(overview.player).toEqual(moved.player);
      expect(overview.snapshot.elapsed).toBe(moved.snapshot.elapsed);
      await page.setViewportSize(screen);
      await expect.poll(async () => (await observe(page)).camera).toEqual(moved.camera);
      await page.getByRole('button', { name: 'Pause game' }).click();
      await advance(page, 2);
      expect((await observe(page)).camera).toEqual(moved.camera);
      await capture(page, `pause-${suffix}`);
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  });
}

test('fullscreen is explicit, survives Play and exits with synchronized controls', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Full screen', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Exit full screen' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(await page.evaluate(() => document.fullscreenElement === document.documentElement)).toBe(true);
  await play(page);
  await page.getByRole('button', { name: 'Exit full screen' }).click();
  await expect(page.getByRole('dialog', { name: 'Battle paused' })).toBeVisible();
  expect(await page.evaluate(() => document.fullscreenElement)).toBeNull();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Full screen', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
});

test('unsupported fullscreen explains the home-screen route and leaves menus usable', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(document, 'fullscreenEnabled', { get: () => false }));
  await open(page);
  await page.getByRole('button', { name: 'Full screen', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Full screen', exact: true })).toContainText(
    'Add to Home Screen',
  );
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await play(page);
  expect((await observe(page)).snapshot.status).toBe('playing');
  await page.getByRole('button', { name: 'Full screen', exact: true }).click();
  const guidance = page.getByRole('dialog', { name: 'Full screen', exact: true });
  await expect(guidance).toBeVisible();
  await guidance.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Battle paused' })).toBeVisible();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  expect((await observe(page)).snapshot.status).toBe('playing');
});
