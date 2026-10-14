import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { Scenario } from '../src/infrastructure/network/NetworkScenarios';
export async function open(page: Page) {
  await page.clock.setFixedTime(new Date('2026-10-12T18:00:00Z'));
  await page.goto('/?test=1');
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
}
export async function play(page: Page) {
  await page.getByRole('button', { name: /^(Play|Play Again)$/ }).click();
  await page.waitForFunction(() => !!window.pirateTest);
  await expect(page.locator('.arena')).toHaveAttribute('aria-busy', 'false');
}
export const observe = (page: Page) => page.evaluate(() => window.pirateTest!.observe());
export const advance = (page: Page, seconds: number) =>
  page.evaluate((s) => window.pirateTest!.advance!(s), seconds);

/**
 * Waits until every authored image is decoded: <img> elements plus CSS background and border-image
 * sources (menu panels, buttons). Visual baselines must never capture a partially loaded board.
 */
export async function waitForAuthoredArt(page: Page) {
  await page.waitForFunction(() =>
    Array.from(document.images).every((image) => image.complete && image.naturalWidth > 0),
  );
  await page.evaluate(async () => {
    await document.fonts.ready;
    const sources = new Set<string>();
    for (const element of Array.from(document.querySelectorAll<HTMLElement>('*'))) {
      const style = getComputedStyle(element);
      for (const value of [style.backgroundImage, style.borderImageSource])
        for (const match of value.matchAll(/url\("?([^")]+)"?\)/g)) if (match[1]) sources.add(match[1]);
    }
    const decodes = [...sources].map((source) => {
      const image = new Image();
      image.src = source;
      return image.decode();
    });
    await Promise.all([...decodes, ...Array.from(document.images).map((image) => image.decode())]);
    // Two frames let the compositor paint the decoded images before a capture.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

/** Simulates the browser hiding or showing this tab (visibilitychange). Combat state is never written. */
export async function setTabHidden(page: Page, hidden: boolean) {
  await page.evaluate((value) => {
    if (value) {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    } else {
      Reflect.deleteProperty(document, 'hidden');
      Reflect.deleteProperty(document, 'visibilityState');
    }
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);
}

/** Captain's Log tabs follow the WAI-ARIA tabs pattern; the main menu opens them with buttons. */
export async function selectRecordsTab(page: Page, name: 'Ranking' | 'Match History') {
  await page.getByRole('tab', { name, exact: true }).click();
  await expect(page.getByRole('tab', { name, exact: true })).toHaveAttribute('aria-selected', 'true');
}
export async function scenario(page: Page, value: Scenario) {
  const details = page.locator('.network-tools');
  if ((await details.getAttribute('open')) === null) await details.locator('summary').click();
  await page.getByLabel('Network scenario').selectOption(value);
}
// Presses the setting's minus/plus buttons until it shows `target` (each press is saved immediately).
export async function setOption(page: Page, label: string, target: string) {
  const setting = page.getByRole('group', { name: label, exact: true });
  const value = setting.locator('output');
  for (let presses = 0; presses < 40 && (await value.textContent()) !== target; presses++) {
    const increase = Number.parseFloat((await value.textContent())!) < Number.parseFloat(target);
    await setting.getByRole('button', { name: increase ? /^Increase/ : /^Decrease/ }).click();
  }
  await expect(value).toHaveText(target);
}
export async function options(page: Page, duration: number, spawn: number) {
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await setOption(page, 'Game session time', `${duration} s`);
  await setOption(page, 'Enemy spawn time', `${spawn} s`);
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
}
// Pilot tuning, in logical pixels and radians: survivors are collected only while no enemy is this close,
// and the bow must point this close to a survivor before sailing to it.
const rescueClearance = 350;
const rescueHeadingTolerance = 0.6;
const headingTolerance = 0.02;
const wrapAngle = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));
const bearing = (from: { x: number; y: number }, to: { x: number; y: number }) =>
  Math.atan2(to.x - from.x, from.y - to.y);
// Steering uses actual keyboard controls and advances the actual fixed-step rules.
// It never writes positions, health, scores, entities or cooldowns.
// Sinkings call in reinforcements, so the pilot keeps sailing with the nearest enemy abeam for its
// broadsides, and heals from survivors whenever no enemy is close.
export async function defendUntilFinished(page: Page, waitForResult = true) {
  await page.locator('.game').focus();
  for (const key of ['w', 'Space', 'q', 'e']) await page.keyboard.down(key);
  for (let i = 0; i < 1500; i++) {
    const state = await page.evaluate(() => window.pirateTest?.observe());
    if (!state) break;
    if (!waitForResult && state.snapshot.status === 'ended') break;
    const { player } = state;
    const range = (point: { x: number; y: number }) => Math.hypot(point.x - player.x, point.y - player.y);
    const enemy = [...state.enemies].sort((a, b) => range(a) - range(b))[0];
    const survivor = state.presentation.particles
      .filter((particle) => particle.kind === 'crew')
      .sort((a, b) => range(a) - range(b))[0];
    let turn = 0;
    let sail = true;
    if (survivor && player.health < player.maxHealth && (!enemy || range(enemy) > rescueClearance)) {
      turn = wrapAngle(bearing(player, survivor) - player.angle);
      sail = Math.abs(turn) < rescueHeadingTolerance;
    } else if (enemy) {
      const port = wrapAngle(bearing(player, enemy) + Math.PI / 2 - player.angle);
      const starboard = wrapAngle(bearing(player, enemy) - Math.PI / 2 - player.angle);
      turn = Math.abs(port) < Math.abs(starboard) ? port : starboard;
    }
    await page.keyboard.up('a');
    await page.keyboard.up('d');
    if (sail) await page.keyboard.down('w');
    else await page.keyboard.up('w');
    if (Math.abs(turn) > headingTolerance) await page.keyboard.down(turn > 0 ? 'd' : 'a');
    const turning = Math.abs(turn) > headingTolerance;
    const turnSeconds = Math.abs(turn) / state.config.player.movement.turnSpeed;
    await page.evaluate(
      (s) => window.pirateTest?.advance?.(s),
      turning ? Math.max(state.config.fixedStep, Math.min(0.2, turnSeconds)) : 0.2,
    );
  }
  for (const key of ['w', 'Space', 'q', 'e', 'a', 'd']) await page.keyboard.up(key);
  if (waitForResult) await expect(page.getByRole('heading', { name: 'Battle result' })).toBeVisible();
}
