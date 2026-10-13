import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';
import { advance, defendUntilFinished, observe, open, options, play, scenario } from './helpers';
const pageErrors = new Map<Page, string[]>();
test.beforeEach(async ({ page }) => { const errors: string[] = []; pageErrors.set(page, errors);
  page.on('pageerror', (error) => errors.push(error.message)); await open(page); });
test.afterEach(async ({ page }) => { expect(pageErrors.get(page), 'No unhandled application errors').toEqual([]); pageErrors.delete(page); });
test('options validate, persist, and isolate new matches', async ({ page }) => {
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await page.getByLabel('Game session time').fill('59'); await page.getByLabel('Enemy spawn time').fill('0');
  await page.getByRole('button', { name: 'Save options' }).click(); await expect(page.getByRole('alert')).toContainText('60–180');
  await page.getByLabel('Game session time').fill('60'); await page.getByLabel('Enemy spawn time').fill('10');
  await page.getByRole('button', { name: 'Save options' }).click(); await page.reload();
  await page.getByRole('button', { name: 'Options', exact: true }).click();
  await expect(page.getByLabel('Game session time')).toHaveValue('60'); await expect(page.getByLabel('Enemy spawn time')).toHaveValue('10');
  await page.getByRole('button', { name: 'Back', exact: true }).click(); await play(page);
  expect((await observe(page)).config.sessionSeconds).toBe(60);
});
test('authored map loading failure is visible and retry succeeds', async ({ page }) => {
  let fail = true;
  await page.context().route('**/assets/maps/arena_00.tmj*', async (route) => {
    if (fail) { fail = false; await route.fulfill({ status: 503, body: 'Unavailable' }); } else await route.continue();
  });
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Unable to load the arena');
  await page.getByRole('button', { name: 'Try again' }).click(); await page.waitForFunction(() => !!window.pirateTest);
  expect((await observe(page)).colliders).toHaveLength(5);
});
test('movement, rotation, island collision and arena limits', async ({ page }) => {
  await play(page); const initial = (await observe(page)).player;
  await page.keyboard.down('w'); await advance(page, 2); await page.keyboard.up('w');
  const island = (await observe(page)).player;
  expect(island.y).toBeLessThan(initial.y); expect(island.y).toBeGreaterThanOrEqual(630 + island.radius);
  await page.keyboard.down('d'); await advance(page, Math.PI / 2.6); await page.keyboard.up('d');
  expect((await observe(page)).player.angle).toBeCloseTo(Math.PI, 1);
  await page.keyboard.down('w'); await advance(page, 2.5); await page.keyboard.up('w');
  expect((await observe(page)).player.y).toBeCloseTo(1118, 0);
  await page.keyboard.down('a'); await advance(page, Math.PI / 2 / 2.6); await page.keyboard.up('a');
  await page.keyboard.down('w'); await advance(page, 6); await page.keyboard.up('w');
  const final = (await observe(page)).player; expect(final.x).toBeGreaterThan(1950); expect(final.x).toBeLessThanOrEqual(2048 - final.radius);
});
test('player acceleration and braking are gradual and stop without held input', async ({ page }) => {
  await play(page); const initial = (await observe(page)).player;
  await page.keyboard.down('w'); await advance(page, 0.25);
  const starting = (await observe(page)).player;
  expect(starting.speed).toBeGreaterThan(0); expect(starting.speed).toBeLessThan(230); expect(starting.y).toBeLessThan(initial.y);
  await advance(page, 0.75); expect((await observe(page)).player.speed).toBe(230);
  await page.keyboard.up('w'); await advance(page, 0.5); const coasting = (await observe(page)).player;
  expect(coasting.speed).toBeGreaterThan(0); expect(coasting.speed).toBeLessThan(230); expect(coasting.y).toBeLessThan(starting.y);
  await advance(page, 1.5); const stopped = (await observe(page)).player; expect(stopped.speed).toBeCloseTo(0, 10);
  await advance(page, 0.25); const settled = (await observe(page)).player;
  expect(settled.speed).toBe(0); expect(settled.y).toBe(stopped.y);
});
test('front and parallel broadsides obey independent cooldowns and expire', async ({ page }) => {
  await play(page); await page.keyboard.down('Space'); await advance(page, 1 / 60);
  expect((await observe(page)).projectiles).toHaveLength(1);
  await advance(page, 0.15); expect((await observe(page)).projectiles).toHaveLength(1);
  await page.keyboard.up('Space'); await page.keyboard.down('q'); await page.keyboard.down('e'); await advance(page, 1 / 60);
  const bullets = (await observe(page)).projectiles; expect(bullets).toHaveLength(7);
  const side = bullets.filter((b) => b.vx < -700); expect(side).toHaveLength(3);
  expect(new Set(side.map((b) => b.vy)).size).toBe(1); expect(new Set(side.map((b) => b.y)).size).toBe(3);
  await advance(page, 0.5); expect((await observe(page)).projectiles.length).toBeLessThanOrEqual(7);
  await page.keyboard.up('q'); await page.keyboard.up('e'); await advance(page, 2); expect((await observe(page)).projectiles).toHaveLength(0);
});
test('one cannonball applies its configured damage once; one destroyed enemy awards exactly one point', async ({ page }) => {
  await play(page); await advance(page, 10); let state = await observe(page);
  // Engage the first Chaser at mid-range, leaving time for two shots before it can ram, whatever its route timing.
  const engagementDistance = 340;
  const approaching = () => state.enemies.find((e) => e.kind === 'chaser'
    && Math.hypot(e.x - state.player.x, e.y - state.player.y) <= engagementDistance);
  for (let i = 0; i < 40 && !approaching(); i++) { await advance(page, 0.1); state = await observe(page); }
  const enemy = approaching()!; expect(enemy.health).toBe(state.config.enemies.chaser!.health);
  const desired = Math.atan2(enemy.x - state.player.x, state.player.y - enemy.y);
  const turn = Math.atan2(Math.sin(desired - state.player.angle), Math.cos(desired - state.player.angle));
  await page.keyboard.down(turn >= 0 ? 'd' : 'a'); await advance(page, Math.abs(turn) / state.config.player.movement.turnSpeed);
  await page.keyboard.up('d'); await page.keyboard.up('a');
  await page.keyboard.down('Space'); await advance(page, 1 / 60); await page.keyboard.up('Space');
  for (let i = 0; i < 20; i++) { await advance(page, 0.05); if ((await observe(page)).enemies.find((e) => e.id === enemy.id)?.health !== enemy.health) break; }
  expect((await observe(page)).enemies.find((e) => e.id === enemy.id)?.health).toBe(enemy.health - state.config.player.weapons[0]!.projectile.damage);
  expect((await observe(page)).snapshot.score).toBe(0);
  await advance(page, 0.36); await page.keyboard.down('Space'); await advance(page, 1 / 60); await page.keyboard.up('Space');
  for (let i = 0; i < 20; i++) { await advance(page, 0.05); if (!(await observe(page)).enemies.some((e) => e.id === enemy.id)) break; }
  expect((await observe(page)).enemies.some((e) => e.id === enemy.id)).toBe(false);
  expect((await observe(page)).snapshot.score).toBe(1); await advance(page, 1);
  expect((await observe(page)).snapshot.score).toBe(1);
});
test('missing ship image fails visibly and can be loaded on retry', async ({ page }) => {
  let fail = true;
  await page.context().route('**/assets/png/default/ships/ship_7.png', async (route) => {
    if (fail) { fail = false; await route.fulfill({ status: 404, body: 'Missing' }); } else await route.continue();
  });
  await page.getByRole('button', { name: 'Play', exact: true }).click(); await expect(page.getByRole('alert')).toContainText('Unable to load the arena');
  await page.getByRole('button', { name: 'Try again' }).click(); await page.waitForFunction(() => !!window.pirateTest);
  expect((await observe(page)).snapshot.health).toBe(100);
});
test('failed lazy engine module has an accessible error and reload recovery', async ({ page }) => {
  let fail = true;
  await page.context().route('**/src/ui/GameCanvas.tsx*', async (route) => {
    if (fail) { fail = false; await route.fulfill({ status: 503, body: 'Unavailable' }); } else await route.continue();
  });
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Unable to load game engine');
  await page.getByRole('button', { name: 'Reload and retry' }).click();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible(); await play(page);
  expect((await observe(page)).snapshot.health).toBe(100);
});
test('both enemy behaviours appear on schedule, navigate obstacles and damage the player', async ({ page }) => {
  await play(page); await advance(page, 4.9); expect((await observe(page)).enemies).toHaveLength(0);
  await advance(page, 0.1); const first = (await observe(page)).enemies[0]!; expect(first.kind).toBe('chaser');
  expect(Math.hypot(first.x - 1024, first.y - 960)).toBeGreaterThan(400);
  await advance(page, 5); const enemies = (await observe(page)).enemies;
  expect(enemies.map((e) => e.kind)).toEqual(['chaser', 'shooter']); expect(enemies[0]!.x).not.toBe(first.x);
  await advance(page, 12); const later = await observe(page);
  expect(later.projectiles.some((p) => p.owner === 'enemy')).toBe(true);
  expect(later.snapshot.health).toBeLessThanOrEqual(100); expect(later.snapshot.score).toBe(0);
  for (const enemy of later.enemies) for (const r of later.colliders) {
    const dx = enemy.x - Math.max(r.x, Math.min(enemy.x, r.x + r.width)); const dy = enemy.y - Math.max(r.y, Math.min(enemy.y, r.y + r.height));
    expect(Math.hypot(dx, dy)).toBeGreaterThanOrEqual(enemy.radius - 0.01);
  }
});
test('real cannon input sinks enemies once and battle ends on time', async ({ page }) => {
  await options(page, 60, 10); await play(page); await defendUntilFinished(page);
  const result = await page.evaluate(() => JSON.parse(localStorage.getItem('pirate.last')!) as { reason: string; score: number; duration: number });
  expect(result.reason).toBe('time'); expect(result.duration).toBeCloseTo(60, 3); expect(result.score).toBeGreaterThan(0);
  await expect(page.locator('.result-panel')).toContainText('Time expired');
  await page.getByRole('button', { name: 'Play Again' }).click(); await page.waitForFunction(() => !!window.pirateTest);
  const clean = await observe(page); expect(clean.snapshot.health).toBe(100); expect(clean.snapshot.score).toBe(0);
  expect(clean.snapshot.elapsed).toBe(0); expect(clean.enemies).toHaveLength(0); expect(clean.projectiles).toHaveLength(0);
});
test('death stops combat and result survives refresh', async ({ page }) => {
  await play(page); await advance(page, 120); await expect(page.getByRole('heading', { name: 'Battle result' })).toBeVisible();
  await expect(page.locator('.result-panel')).toContainText('ship was lost');
  const result = await page.evaluate(() => localStorage.getItem('pirate.last'));
  await page.waitForTimeout(500); expect(await page.evaluate(() => localStorage.getItem('pirate.last'))).toBe(result);
  expect(await page.evaluate(() => !!window.pirateTest)).toBe(false);
  await page.reload(); await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('pirate.last'))).toBe(result);
});
test('pause freezes simulation and cooldowns, focus loss requires explicit resume', async ({ page }) => {
  await play(page); await page.keyboard.down('w'); await page.keyboard.down('Space'); await advance(page, 0.1);
  await page.keyboard.press('p'); const paused = await observe(page); await advance(page, 20);
  expect((await observe(page)).snapshot.elapsed).toBe(paused.snapshot.elapsed); expect((await observe(page)).projectiles).toEqual(paused.projectiles);
  await page.getByRole('button', { name: 'Resume', exact: true }).click(); await advance(page, 0.1);
  const resumed = (await observe(page)).player; expect(resumed.speed).toBeLessThan(paused.player.speed);
  expect(Math.abs(resumed.y - paused.player.y)).toBeLessThan(10);
  await page.evaluate(() => window.dispatchEvent(new Event('blur'))); await expect(page.getByRole('dialog')).toBeVisible();
  await advance(page, 10); expect((await observe(page)).snapshot.elapsed).toBeCloseTo(0.2, 5);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.keyboard.up('w'); await page.keyboard.up('Space');
});
test('abandonment, repeated mounts, refresh and simultaneous touch controls', async ({ page }) => {
  for (let i = 0; i < 3; i++) {
    await play(page);
    const cdp = await page.context().newCDPSession(page);
    const forward = (await page.getByRole('button', { name: 'Forward', exact: true }).boundingBox())!;
    const fire = (await page.getByRole('button', { name: 'Front cannon', exact: true }).boundingBox())!;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [
      { x: forward.x + forward.width / 2, y: forward.y + forward.height / 2, id: 1 },
      { x: fire.x + fire.width / 2, y: fire.y + fire.height / 2, id: 2 },
    ] });
    await advance(page, 0.1); const state = await observe(page); expect(state.player.y).toBeLessThan(960); expect(state.projectiles.length).toBeGreaterThan(0);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }); await cdp.detach();
    await page.getByRole('button', { name: 'Pause game' }).click(); await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
    await page.getByRole('button', { name: 'Leave battle' }).click(); expect(await page.evaluate(() => !!window.pirateTest)).toBe(false);
  }
  expect(await page.evaluate(() => localStorage.getItem('pirate.last'))).toBeNull();
  await play(page); await page.reload(); await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('pirate.last'))).toBeNull();
});
test('how to play explains the controls and only returns to the main menu', async ({ page }) => {
  await page.getByRole('button', { name: 'How To Play', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'How To Play' })).toBeVisible();
  await expect(page.locator('.controls-help')).toContainText('left broadside');
  await expect(page.locator('.how-to-play').getByRole('button')).toHaveCount(1);
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
});
test('demo server reset confirmation is shown briefly', async ({ page }) => {
  await page.locator('.network-tools summary').click();
  await page.getByRole('button', { name: 'Reset demo server' }).click();
  const notice = page.locator('.notice');
  await expect(notice).toContainText('Demo server reset');
  await expect(notice).toBeHidden({ timeout: 8000 });
});
test('ranking and history handle pages, empty lists, loading and errors', async ({ page }) => {
  await scenario(page, 'multiple-pages'); await page.getByRole('button', { name: 'Ranking', exact: true }).click();
  await expect(page.getByRole('table')).toBeVisible(); await expect(page.getByText('Page 1 of 6')).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click(); await expect(page.getByText('Page 2 of 6')).toBeVisible();
  await page.getByRole('button', { name: 'Match History', exact: true }).click(); await expect(page.getByText('Page 1 of 4')).toBeVisible();
  await scenario(page, 'empty'); await expect(page.getByText('No records yet.', { exact: false })).toBeVisible();
  await scenario(page, 'history-error'); await expect(page.getByRole('alert')).toContainText('503');
  await scenario(page, 'success'); await page.getByRole('button', { name: 'Ranking', exact: true }).click(); await expect(page.getByRole('table')).toBeVisible();
  await scenario(page, 'ranking-error'); await expect(page.getByRole('alert')).toContainText('503');
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
  await page.getByRole('button', { name: 'Play', exact: true }).click(); await page.waitForFunction(() => !!window.pirateTest);
});
test('pending outage submission survives refresh and updates both tabs', async ({ page }) => {
  await scenario(page, 'outage'); await play(page); await advance(page, 120);
  await expect(page.getByRole('alert')).toContainText('503'); expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pirate.pending')!).length)).toBe(1);
  await page.reload(); await expect(page.getByRole('button', { name: 'Play', exact: true })).toBeVisible();
  await scenario(page, 'success'); await page.getByRole('button', { name: 'Retry pending battle' }).click();
  await expect(page.locator('.pending-banner')).toHaveCount(0);
  await page.getByRole('button', { name: 'Match History', exact: true }).click(); await expect(page.locator('tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'Ranking', exact: true }).click(); await expect(page.getByRole('table')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pirate.server')!).length)).toBe(1);
});
test('post-commit timeout retries idempotently and late requests do not replace current data', async ({ page }) => {
  await scenario(page, 'post-commit-timeout'); await play(page); await advance(page, 120);
  await expect(page.getByRole('alert')).toContainText('timed out');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pirate.server')!).length)).toBe(1);
  await page.reload(); await expect(page.locator('.pending-banner')).toHaveCount(0);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('pirate.server')!).length)).toBe(1);
  await scenario(page, 'out-of-order'); await page.getByRole('button', { name: 'Ranking', exact: true }).click();
  await scenario(page, 'empty'); await expect(page.locator('tbody tr')).toHaveCount(1); // Only the confirmed local match.
  await page.waitForTimeout(1500); await expect(page.locator('tbody tr')).toHaveCount(1);
});
test('versioned menu, arena and result visual baselines; layout fits supported screens', async ({ page }) => {
  await expect(page).toHaveScreenshot('menu.png', { fullPage: true });
  await play(page); await expect(page).toHaveScreenshot('arena.png');
  const bounds = await page.locator('.arena').boundingBox(); const size = page.viewportSize()!;
  expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(size.width);
  expect(bounds!.y + bounds!.height).toBeLessThan(size.height);
  await advance(page, 120); await expect(page.locator('.result-panel')).toContainText('Battle registered');
  await expect(page).toHaveScreenshot('result.png', { fullPage: true });
});
