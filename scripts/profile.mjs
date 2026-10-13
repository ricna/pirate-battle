/* global window, document, navigator, history, location */
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import process from 'node:process';
import console from 'node:console';
const url = process.env.PROFILE_URL ?? 'http://127.0.0.1:4173/';
// Outward-biased headings hold the authored boundary lanes despite discrete turns.
const route = [{ axis: 'y', boundary: 1118, angle: Math.PI }, { axis: 'x', boundary: 2014, angle: Math.PI / 2 },
  { axis: 'y', boundary: 34, angle: 0 }, { axis: 'x', boundary: 34, angle: -Math.PI / 2 }, { axis: 'y', boundary: 1118, angle: Math.PI }];
let waypoint = 0;
const browser = await chromium.launch({ channel: 'chromium', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const errors = []; page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${url}?profile=1`);
await page.getByRole('button', { name: 'Options', exact: true }).click();
// Options save on every press; raising each setting to its limit selects the profiled 180 s, 10 s and sound on.
for (const name of ['Game session time', 'Enemy spawn time', 'Sound']) {
  const increase = page.getByRole('group', { name, exact: true }).getByRole('button', { name: /^Increase/ });
  while (await increase.isEnabled()) await increase.click();
}
await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
await page.getByRole('button', { name: 'Play', exact: true }).click(); await page.waitForFunction(() => !!window.pirateTest);
await page.keyboard.down('Space'); await page.keyboard.down('q'); await page.keyboard.down('e'); const started = Date.now();
let lastTurn = ''; let lastLog = 0; let moving = false; let pools = null; let renderPools = null; let config = null;
while (Date.now() - started < 210000 && await page.evaluate(() => !!window.pirateTest)) {
  const state = await page.evaluate(() => window.pirateTest?.observe());
  if (!state) break; pools = state.pools; renderPools = state.renderPools; config = state.config;
  if (Math.abs(state.player[route[waypoint].axis] - route[waypoint].boundary) < 0.01) waypoint = waypoint === route.length - 1 ? 1 : waypoint + 1;
  const difference = Math.atan2(Math.sin(route[waypoint].angle - state.player.angle), Math.cos(route[waypoint].angle - state.player.angle));
  const angularStep = state.config.player.movement.turnSpeed * state.config.fixedStep;
  const target = Math.ceil((state.player.angle + difference) / angularStep) * angularStep;
  const turn = target - state.player.angle;
  const key = Math.abs(turn) < angularStep * 0.49 ? '' : turn > 0 ? 'd' : 'a';
  if (key !== lastTurn) { if (lastTurn) await page.keyboard.up(lastTurn); if (key) await page.keyboard.down(key); lastTurn = key; }
  const shouldMove = Math.abs(turn) < angularStep * 0.49;
  if (shouldMove !== moving) { if (shouldMove) await page.keyboard.down('w'); else await page.keyboard.up('w'); moving = shouldMove; }
  if (state.snapshot.elapsed - lastLog >= 30) { console.log(`Active time ${state.snapshot.elapsed.toFixed(1)}s, health ${state.snapshot.health}, score ${state.snapshot.score}, position ${state.player.x.toFixed(0)},${state.player.y.toFixed(0)}, route ${waypoint}`); lastLog = state.snapshot.elapsed; }
  await page.waitForTimeout(15);
}
await page.keyboard.up('Space'); await page.keyboard.up('q'); await page.keyboard.up('e'); await page.keyboard.up('w'); if (lastTurn) await page.keyboard.up(lastTurn);
const metrics = await page.evaluate(() => window.pirateMetrics ?? null);
if (!metrics) throw new Error('Profiling did not reach a completed match.');
const frames = metrics.frames; const sorted = [...frames].sort((a, b) => a - b);
const mean = frames.reduce((sum, value) => sum + value, 0) / frames.length;
const graphics = await page.evaluate(() => {
  const canvas = document.createElement('canvas'); const gl = canvas.getContext('webgl');
  const debug = gl?.getExtension('WEBGL_debug_renderer_info');
  return { userAgent: navigator.userAgent, gpu: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : 'Unavailable' };
});
await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
await page.evaluate(() => history.replaceState(null, '', `${location.pathname}?test=1`));
const cdp = await page.context().newCDPSession(page);
const heap = async () => { await cdp.send('HeapProfiler.collectGarbage'); return (await cdp.send('Runtime.getHeapUsage')).usedSize; };
const memory = [{ cycle: 0, heapBytes: await heap() }];
for (let i = 1; i <= 5; i++) {
  await page.getByRole('button', { name: 'Play', exact: true }).click(); await page.waitForFunction(() => !!window.pirateTest);
  await page.evaluate(() => window.pirateTest.advance(10));
  await page.getByRole('button', { name: 'Pause game' }).click(); await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
  await page.getByRole('button', { name: 'Leave battle', exact: true }).click(); await page.waitForTimeout(150);
  memory.push({ cycle: i, heapBytes: await heap() });
}
const report = { date: new Date().toISOString(), browser: await browser.version(), ...graphics,
  viewport: '1280x800', deviceScaleFactor: 1, build: 'optimized Vite preview',
  options: { sessionSeconds: 180, spawnSeconds: 10, sound: true },
  control: 'Actual keyboard navigation around authored water boundary waypoints, all three weapons held, real-time fixed-step simulation; no state writes',
  wallSeconds: (Date.now() - started) / 1000, activeSeconds: metrics.elapsed, reason: metrics.reason,
  score: metrics.score, frames: frames.length, fps: 1000 / mean, p95FrameMs: sorted[Math.floor(sorted.length * 0.95)],
  entityPeak: metrics.entityPeak, config, pools, renderPools, presentationPools: metrics.presentationPools, audio: metrics.audio,
  memory, errors, frameIntervalsMs: frames };
await mkdir('reports', { recursive: true }); await writeFile('reports/profile.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ...report, frameIntervalsMs: undefined }, null, 2));
await browser.close();
if (metrics.elapsed < 179.99 || errors.length) process.exitCode = 1;
