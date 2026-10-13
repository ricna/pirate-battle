import { expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { Scenario } from '../src/data/network';
export async function open(page: Page) {
  await page.clock.setFixedTime(new Date('2026-10-12T18:00:00Z'));
  await page.goto('/?test=1'); await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
}
export async function play(page: Page) {
  await page.getByRole('button', { name: /^(Play|Play Again)$/ }).click();
  await page.waitForFunction(() => !!window.pirateTest);
  await expect(page.locator('.arena')).toHaveAttribute('aria-busy', 'false');
}
export const observe = (page: Page) => page.evaluate(() => window.pirateTest!.observe());
export const advance = (page: Page, seconds: number) => page.evaluate((s) => window.pirateTest!.advance!(s), seconds);
export async function scenario(page: Page, value: Scenario) {
  const details = page.locator('.network-tools'); if (await details.getAttribute('open') === null) await details.locator('summary').click();
  await page.getByLabel('Network scenario').selectOption(value);
}
export async function options(page: Page, duration: number, spawn: number) {
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await page.getByLabel('Game session time').fill(String(duration)); await page.getByLabel('Enemy spawn time').fill(String(spawn));
  await page.getByRole('button', { name: 'Save options' }).click();
}
// Steering uses actual keyboard controls and advances the actual fixed-step rules.
// It never writes positions, health, scores, entities or cooldowns.
export async function defendUntilFinished(page: Page) {
  await page.locator('.game').focus(); await page.keyboard.down('Space');
  for (let i = 0; i < 700; i++) {
    const state = await page.evaluate(() => window.pirateTest?.observe()); if (!state) break;
    const enemy = [...state.enemies].sort((a, b) =>
      Math.hypot(a.x - state.player.x, a.y - state.player.y) - Math.hypot(b.x - state.player.x, b.y - state.player.y))[0];
    let turn = 0;
    if (enemy) { const desired = Math.atan2(enemy.x - state.player.x, state.player.y - enemy.y);
      turn = Math.atan2(Math.sin(desired - state.player.angle), Math.cos(desired - state.player.angle)); }
    await page.keyboard.up('a'); await page.keyboard.up('d');
    if (Math.abs(turn) > 0.02) await page.keyboard.down(turn > 0 ? 'd' : 'a');
    await page.evaluate((s) => window.pirateTest?.advance?.(s), Math.abs(turn) > 0.02 ? Math.min(0.2, Math.abs(turn) / state.config.player.movement.turnSpeed) : 0.2);
  }
  await page.keyboard.up('Space'); await page.keyboard.up('a'); await page.keyboard.up('d');
  await expect(page.getByRole('heading', { name: 'Battle result' })).toBeVisible();
}
