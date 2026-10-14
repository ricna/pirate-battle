import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { WorldCamera } from '../src/game/rendering/WorldCamera';
import { advance, observe, open, play, scenario, waitForAuthoredArt } from './helpers';
import { evidencePath } from './TestReports';

async function capture(page: Page, name: string) {
  await waitForAuthoredArt(page);
  await page.screenshot({ path: evidencePath(`mobile-layout/${name}.png`), fullPage: true });
}

/** Smallest space the owner accepts between two controls, or between a board and the demo panel. */
const MinimumSpacing = 4;

/** Element rectangles in the application's own axes; the rotated portrait layout turns them a quarter. */
async function layoutBoxes(page: Page, selector: string) {
  return page.locator(selector).evaluateAll((elements) => {
    const root = document.getElementById('root');
    if (!root) throw new Error('The application root is missing.');
    const rotated = getComputedStyle(root).transform !== 'none';
    return elements.map((element) => {
      const box = element.getBoundingClientRect();
      // A clockwise quarter turn: layout x runs down the screen and layout y from right to left.
      return rotated
        ? { x: box.top, y: innerWidth - box.right, width: box.height, height: box.width }
        : { x: box.left, y: box.top, width: box.width, height: box.height };
    });
  });
}

const isRotated = (page: Page) =>
  page.evaluate(() => getComputedStyle(document.getElementById('root')!).transform !== 'none');

async function expectScreenFits(page: Page, selector: string) {
  await expect
    .poll(async () =>
      page.evaluate(
        ({ target, spacing }) => {
          const panel = document.querySelector(target)?.getBoundingClientRect();
          const records = document.querySelector('.records-body');
          const dialog = document.querySelector<HTMLDialogElement>('.pause-dialog[open]');
          const screen = document.querySelector('.app');
          const demoPanel = document.querySelector('.network-tools summary');
          if (!panel) return false;
          const visibleButtons = Array.from(
            document.querySelectorAll<HTMLButtonElement>('.app button, .pause-dialog button'),
          ).filter(
            (button) =>
              !button.closest('details:not([open])') &&
              button.getClientRects().length > 0 &&
              getComputedStyle(button).visibility !== 'hidden',
          );
          // Rectangles closer than `spacing` on both axes, overlapping ones included.
          const crowded = (a: DOMRect, b: DOMRect) =>
            a.left < b.right + spacing &&
            b.left < a.right + spacing &&
            a.top < b.bottom + spacing &&
            b.top < a.bottom + spacing;
          const controls = visibleButtons.map((button) => button.getBoundingClientRect());
          const spaced = controls.every((box, index) =>
            controls.slice(index + 1).every((other) => !crowded(box, other)),
          );
          const demoBox =
            demoPanel && demoPanel.getClientRects().length > 0 ? demoPanel.getBoundingClientRect() : null;
          return (
            spaced &&
            (!demoBox || !crowded(demoBox, panel)) &&
            document.documentElement.scrollWidth <= innerWidth + 1 &&
            document.documentElement.scrollHeight <= innerHeight + 1 &&
            (!screen || screen.scrollHeight <= screen.clientHeight + 1) &&
            panel.left >= -1 &&
            panel.top >= -1 &&
            panel.right <= innerWidth + 1 &&
            panel.bottom <= innerHeight + 1 &&
            (!records || records.scrollWidth <= records.clientWidth + 1) &&
            (!dialog || dialog.scrollHeight <= dialog.clientHeight + 1) &&
            visibleButtons.every((button) => {
              const box = button.getBoundingClientRect();
              return (
                box.left >= -1 &&
                box.top >= -1 &&
                box.right <= innerWidth + 1 &&
                box.bottom <= innerHeight + 1
              );
            })
          );
        },
        { target: selector, spacing: MinimumSpacing },
      ),
    )
    .toBe(true);
}

for (const viewport of [
  { width: 568, height: 320 },
  { width: 844, height: 390 },
  { width: 320, height: 568 },
]) {
  test(`menu screens fit without scrolling at ${viewport.width}x${viewport.height}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    try {
      await open(page);
      await expectScreenFits(page, '.main-menu');
      await page.getByRole('button', { name: 'Options', exact: true }).click();
      await expectScreenFits(page, '.options-board');
      await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
      await page.getByRole('button', { name: 'Ranking', exact: true }).click();
      await expect(page.locator('tbody tr').first()).toBeVisible();
      await expectScreenFits(page, '.captains-log');
      await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
      await page.getByRole('button', { name: 'Match History', exact: true }).click();
      await expectScreenFits(page, '.captains-log');
      await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
      await page.getByRole('button', { name: 'How To Play', exact: true }).click();
      for (const topic of ['Overview', 'Controls', 'Enemies']) {
        await page.getByRole('button', { name: topic, exact: true }).click();
        await expectScreenFits(page, '.how-to-play');
      }
    } finally {
      await context.close();
    }
  });
}

test('pause options and battle results fit on a short landscape phone and after portrait rotation', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 568, height: 320 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  try {
    await open(page);
    await scenario(page, 'outage');
    await play(page);
    await page.getByRole('button', { name: 'Pause game' }).click();
    await expectScreenFits(page, '.pause-board');
    await page.getByRole('button', { name: 'Options', exact: true }).click();
    await expectScreenFits(page, '.pause-dialog .options-board');
    await page.getByRole('button', { name: 'Back', exact: true }).click();
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await advance(page, 120);
    await expect(page.getByRole('heading', { name: 'Battle result' })).toBeVisible();
    await expect(page.locator('.result-panel').getByRole('alert')).toContainText('503');
    await expectScreenFits(page, '.result-panel');
    await page.setViewportSize({ width: 320, height: 568 });
    await expectScreenFits(page, '.result-panel');
  } finally {
    await context.close();
  }
});

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
    const portrait = viewport.width < viewport.height;
    // A touch device held in portrait shows the landscape layout turned a quarter.
    const layout = portrait ? { width: viewport.height, height: viewport.width } : viewport;
    try {
      await open(page);
      expect(await isRotated(page)).toBe(portrait);
      await capture(page, `menu-${suffix}`);
      for (const box of await layoutBoxes(page, '.main-menu button')) {
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(layout.width);
        // The bottom strip belongs to the demo network panel.
        expect(box.y + box.height).toBeLessThanOrEqual(layout.height - 40);
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
      if (portrait) {
        // Turning the device removes the rotation without a pause or a rotate prompt, in both directions.
        expect((await observe(page)).snapshot.status).toBe('playing');
        await page.setViewportSize(layout);
        await expect.poll(() => isRotated(page)).toBe(false);
        expect((await observe(page)).snapshot.status).toBe('playing');
        await page.setViewportSize(viewport);
        await expect.poll(() => isRotated(page)).toBe(true);
        expect((await observe(page)).snapshot.status).toBe('playing');
      }
      await advance(page, 0);
      const screen = page.viewportSize()!;
      const before = await observe(page);
      expect(before.camera.following).toBe(true);
      expect(before.config.player.visual.height * before.camera.scale).toBeGreaterThanOrEqual(84);
      const boxes = await page
        .locator('.hud-health, .hud-counter, .hud-pause, .command')
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

const isFullscreen = (page: Page) =>
  page.evaluate(() => document.fullscreenElement === document.documentElement);

/** Two frames: long enough for a full-screen request started by the last gesture to settle. */
const settle = (page: Page) =>
  page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));

test('full screen is required: the first gesture enters it and a gesture after a browser exit returns', async ({
  page,
}) => {
  await open(page);
  await expect(page.getByRole('button', { name: /full screen/i })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await settle(page);
  expect(await isFullscreen(page)).toBe(false);
  await page.locator('.main-menu-tagline').click();
  await expect.poll(() => isFullscreen(page)).toBe(true);
  await play(page);
  // Holding Esc or Android's back gesture leaves full screen without pausing the battle.
  await page.evaluate(() => document.exitFullscreen());
  await expect.poll(() => isFullscreen(page)).toBe(false);
  expect((await observe(page)).snapshot.status).toBe('playing');
  await page.locator('.arena canvas').click();
  await expect.poll(() => isFullscreen(page)).toBe(true);
  expect((await observe(page)).snapshot.status).toBe('playing');
});

test('Alt+Enter keeps a window until the player chooses full screen again, pausing a battle', async ({
  page,
}) => {
  await open(page);
  await page.getByRole('button', { name: 'Play', exact: true }).focus();
  await page.keyboard.press('Alt+Enter');
  await expect.poll(() => isFullscreen(page)).toBe(true);
  await expect(page.locator('.main-menu')).toBeVisible();
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
  await settle(page);
  expect(await isFullscreen(page)).toBe(true);
  await page.keyboard.press('Alt+Enter');
  await expect.poll(() => isFullscreen(page)).toBe(false);
  await page.locator('.main-menu-tagline').click();
  await play(page);
  await settle(page);
  expect(await isFullscreen(page)).toBe(false);
  await page.keyboard.press('Alt+NumpadEnter');
  await expect(page.getByRole('dialog', { name: 'Battle paused' })).toBeVisible();
  await expect.poll(() => isFullscreen(page)).toBe(true);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.keyboard.press('Alt+Enter');
  await expect(page.getByRole('dialog', { name: 'Battle paused' })).toBeVisible();
  await expect.poll(() => isFullscreen(page)).toBe(false);
});

test('unsupported full screen never blocks play and Alt+Enter explains the home-screen route', async ({
  page,
}) => {
  await page.addInitScript(() => Object.defineProperty(document, 'fullscreenEnabled', { get: () => false }));
  await open(page);
  await page.locator('.main-menu-tagline').click();
  await settle(page);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await play(page);
  expect((await observe(page)).snapshot.status).toBe('playing');
  await page.keyboard.press('Alt+Enter');
  const guidance = page.getByRole('dialog', { name: 'Full screen', exact: true });
  await expect(guidance).toContainText('Add to Home Screen');
  await guidance.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Battle paused' })).toBeVisible();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  expect((await observe(page)).snapshot.status).toBe('playing');
});

test('a refused full-screen request is explained once and offers another attempt', async ({ page }) => {
  await page.addInitScript(() => {
    Element.prototype.requestFullscreen = () => Promise.reject(new TypeError('Permissions check failed'));
  });
  await open(page);
  await page.locator('.main-menu-tagline').click();
  const guidance = page.getByRole('dialog', { name: 'Full screen', exact: true });
  await expect(guidance).toContainText('could not change full screen');
  await expect(guidance.getByRole('button', { name: 'Try again', exact: true })).toBeVisible();
  await guidance.getByRole('button', { name: 'Close', exact: true }).click();
  await page.locator('.main-menu-tagline').click();
  await settle(page);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('Quit closes a tab that the page may close', async ({ browser }) => {
  const context = await browser.newContext();
  const launcher = await context.newPage();
  try {
    await launcher.goto('/?test=1');
    // Browsers let a page close a tab that a script opened, as a launcher or portal does.
    const [game] = await Promise.all([
      context.waitForEvent('page'),
      launcher.evaluate(() => window.open('/?test=1')),
    ]);
    await expect(game.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
    await Promise.all([
      game.waitForEvent('close'),
      game.getByRole('button', { name: 'Quit', exact: true }).click(),
    ]);
  } finally {
    await context.close();
  }
});

test('Quit leaves full screen before closing and explains a tab the browser keeps open', async ({ page }) => {
  await open(page);
  // A second document in this tab's history: browsers then refuse window.close() from a script.
  await page.goto('/?test=1&visit=2');
  await page.locator('.main-menu-tagline').click();
  await expect.poll(() => isFullscreen(page)).toBe(true);
  // Observe the display state at the moment the page asks the browser to close the tab.
  await page.evaluate(() => {
    const calls: boolean[] = [];
    const close = window.close.bind(window);
    Reflect.set(window, 'closeCalls', calls);
    window.close = () => {
      calls.push(Boolean(document.fullscreenElement));
      close();
    };
  });
  await page.getByRole('button', { name: 'Quit', exact: true }).click();
  const guidance = page.getByRole('dialog', { name: 'Quit', exact: true });
  await expect(guidance).toContainText('Close the tab');
  expect(await page.evaluate(() => Reflect.get(window, 'closeCalls'))).toEqual([false]);
  await guidance.getByRole('button', { name: 'Return to the game', exact: true }).click();
  await expect.poll(() => isFullscreen(page)).toBe(true);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.main-menu')).toBeVisible();
});

test('dragging Forward steers in the directions of the rotated layout', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  try {
    await open(page);
    await play(page);
    expect(await isRotated(page)).toBe(true);
    const cdp = await context.newCDPSession(page);
    const forward = (await page.getByRole('button', { name: 'Forward', exact: true }).boundingBox())!;
    const x = forward.x + forward.width / 2;
    const y = forward.y + forward.height / 2;
    await page.evaluate(() => {
      const button = document.querySelector<HTMLElement>('.command-forward')!;
      button.addEventListener('pointermove', () => {
        button.dataset.moves = String(Number(button.dataset.moves ?? 0) + 1);
      });
    });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
    await advance(page, 0.2);
    const straight = (await observe(page)).player;
    // Up the physical screen is the rotated layout's left, so the ship turns anticlockwise.
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y - 40, id: 1 }] });
    await expect(page.locator('.command-forward')).toHaveAttribute('data-moves', '1');
    await advance(page, 0.2);
    expect((await observe(page)).player.angle).toBeLessThan(straight.angle);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } finally {
    await context.close();
  }
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
  await expect.poll(() => isFullscreen(page)).toBe(true);
  await play(page);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Battle paused' })).toBeVisible();
  expect(await isFullscreen(page)).toBe(true);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Battle paused' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(await isFullscreen(page)).toBe(true);
  await page.keyboard.press('Alt+Enter');
  await expect(page.getByRole('dialog', { name: 'Battle paused' })).toBeVisible();
  await expect.poll(() => isFullscreen(page)).toBe(false);
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
      await expect.poll(() => isFullscreen(page)).toBe(true);
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await page.keyboard.press('Alt+Enter');
      await expect.poll(() => isFullscreen(page)).toBe(false);
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
    // The Play tap itself enters full screen; Alt+Enter during preparation chooses a window.
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(page.getByRole('progressbar', { name: 'Loading game engine', exact: true })).toBeVisible();
    await expect.poll(() => isFullscreen(page)).toBe(true);
    await page.keyboard.press('Alt+Enter');
    await expect.poll(() => isFullscreen(page)).toBe(false);
    release();
    await page.waitForFunction(() => !!window.pirateTest);
    await page.keyboard.press('Alt+Enter');
    await expect(page.getByRole('dialog', { name: 'Battle paused' })).toBeVisible();
    await expect.poll(() => isFullscreen(page)).toBe(true);
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
    await expect.poll(() => isFullscreen(page)).toBe(true);
    if (external) await page.evaluate(() => document.exitFullscreen());
    else await page.keyboard.press('Alt+Enter');
    await expect.poll(() => isFullscreen(page)).toBe(false);
    const released = await page.evaluate(() => Number(document.documentElement.dataset.keyboardUnlocks));
    await page.evaluate(() => document.dispatchEvent(new Event('grant-test-keyboard-lock')));
    await expect
      .poll(() => page.evaluate(() => Number(document.documentElement.dataset.keyboardUnlocks)))
      .toBeGreaterThan(released);
    expect(await isFullscreen(page)).toBe(false);
  }
});
