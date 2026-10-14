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

test('Alt+Enter switches fullscreen from menus and a paused battle without activating focused buttons', async ({
  page,
}) => {
  await open(page);
  await page.getByRole('button', { name: 'Play', exact: true }).focus();
  await page.keyboard.press('Alt+Enter');
  await expect(page.getByRole('button', { name: 'Exit full screen' })).toBeEnabled();
  await expect(page.locator('.main-menu')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Exit full screen' })).toHaveAttribute(
    'aria-keyshortcuts',
    'Alt+Enter',
  );
  await page.evaluate(() =>
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        code: 'Enter',
        key: 'Enter',
        altKey: true,
        repeat: true,
        bubbles: true,
      }),
    ),
  );
  expect(await page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await play(page);
  await page.keyboard.press('Alt+Enter');
  await expect(page.getByRole('dialog', { name: 'Battle paused' })).toBeVisible();
  expect(await page.evaluate(() => document.fullscreenElement)).toBeNull();
  await page.keyboard.press('Alt+NumpadEnter');
  await expect(page.getByRole('button', { name: 'Exit full screen' })).toBeEnabled();
  await expect(page.getByRole('dialog', { name: 'Battle paused' })).toBeVisible();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.keyboard.press('Alt+Enter');
  await expect(page.getByRole('dialog', { name: 'Battle paused' })).toBeVisible();
  expect(await page.evaluate(() => document.fullscreenElement)).toBeNull();
});

test('native Keyboard Lock keeps a short Escape press in fullscreen while pause and dialogs work', async ({
  page,
}) => {
  await open(page);
  const supported = await page.evaluate(
    () =>
      'keyboard' in navigator &&
      typeof navigator.keyboard === 'object' &&
      navigator.keyboard !== null &&
      'lock' in navigator.keyboard,
  );
  test.skip(!supported, 'This browser does not expose native Keyboard Lock.');
  await page.keyboard.press('Alt+Enter');
  await expect(page.getByRole('button', { name: 'Exit full screen' })).toBeEnabled();
  await play(page);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Battle paused' })).toBeVisible();
  expect(await page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Battle paused' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
  await page.keyboard.press('Alt+Enter');
  await expect(page.getByRole('dialog', { name: 'Battle paused' })).toBeVisible();
  expect(await page.evaluate(() => document.fullscreenElement)).toBeNull();
});

test('unavailable or denied Keyboard Lock never prevents fullscreen entry or exit', async ({ browser }) => {
  for (const denied of [false, true]) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    try {
      await page.addInitScript(
        (denied) =>
          Object.defineProperty(navigator, 'keyboard', {
            configurable: true,
            value: denied
              ? {
                  lock: async () => {
                    throw new DOMException('Keyboard capture denied.', 'NotAllowedError');
                  },
                  unlock: () => {},
                }
              : undefined,
          }),
        denied,
      );
      await open(page);
      await page.keyboard.press('Alt+Enter');
      await expect(page.getByRole('button', { name: 'Exit full screen' })).toBeEnabled();
      expect(await page.evaluate(() => Boolean(document.fullscreenElement))).toBe(true);
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await page.keyboard.press('Alt+Enter');
      await expect(page.getByRole('button', { name: 'Full screen', exact: true })).toBeEnabled();
      expect(await page.evaluate(() => document.fullscreenElement)).toBeNull();
      expect(errors).toEqual([]);
    } finally {
      await context.close();
    }
  }
});

test('Alt+Enter still works while the lazy game engine prepares', async ({ page }) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route('**/src/ui/game/GameCanvas.tsx*', async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await open(page);
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(page.getByRole('progressbar', { name: 'Loading game engine', exact: true })).toBeVisible();
    await page.keyboard.press('Alt+Enter');
    await expect(page.getByRole('button', { name: 'Exit full screen' })).toBeEnabled();
    release();
    await page.waitForFunction(() => !!window.pirateTest);
    await expect(page.getByRole('button', { name: 'Exit full screen' })).toBeEnabled();
    await page.keyboard.press('Alt+Enter');
    await expect(page.getByRole('dialog', { name: 'Battle paused' })).toBeVisible();
    expect(await page.evaluate(() => document.fullscreenElement)).toBeNull();
  } finally {
    release();
  }
});

test('a late keyboard capture never blocks Alt+Enter exit and is released after any fullscreen exit', async ({
  page,
}) => {
  await page.addInitScript(() => {
    let grant: (() => void) | undefined;
    Object.defineProperty(navigator, 'keyboard', {
      configurable: true,
      value: {
        lock: () =>
          new Promise<void>((resolve) => {
            grant = resolve;
            document.documentElement.dataset.keyboardLockPending = 'true';
          }),
        unlock: () => {
          const root = document.documentElement;
          root.dataset.keyboardUnlocks = String(Number(root.dataset.keyboardUnlocks ?? 0) + 1);
        },
      },
    });
    document.addEventListener('grant-test-keyboard-lock', () => grant?.());
  });
  for (const external of [false, true]) {
    await open(page);
    await page.keyboard.press('Alt+Enter');
    await expect(page.locator('html')).toHaveAttribute('data-keyboard-lock-pending', 'true');
    await expect(page.getByRole('button', { name: 'Exit full screen' })).toBeEnabled();
    if (external) await page.evaluate(() => document.exitFullscreen());
    else await page.keyboard.press('Alt+Enter');
    const button = page.getByRole('button', { name: 'Full screen', exact: true });
    await expect(button).toHaveAttribute('aria-pressed', 'false');
    const released = await page.evaluate(() => Number(document.documentElement.dataset.keyboardUnlocks));
    await page.evaluate(() => document.dispatchEvent(new Event('grant-test-keyboard-lock')));
    await expect(button).toBeEnabled();
    await expect
      .poll(() => page.evaluate(() => Number(document.documentElement.dataset.keyboardUnlocks)))
      .toBeGreaterThan(released);
    expect(await page.evaluate(() => document.fullscreenElement)).toBeNull();
  }
});
