/* global window, document, navigator, history, location */
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import console from 'node:console';
import { execFileSync } from 'node:child_process';
const url = process.env.PROFILE_URL ?? 'http://127.0.0.1:4173/';
const pilot = process.env.PROFILE_PILOT ?? 'defend';
if (!['defend', 'boundary'].includes(pilot)) throw new Error('Unknown profiling pilot.');
// The challenge asks for a three-minute match; the spawn interval defaults to the shipped 5 s.
const sessionSeconds = Number(process.env.PROFILE_SESSION_SECONDS ?? 180);
const spawnSeconds = Number(process.env.PROFILE_SPAWN_SECONDS ?? 5);
const output = process.env.PROFILE_OUTPUT ?? 'reports/profile.json';
const viewport = {
  width: Number(process.env.PROFILE_VIEWPORT_WIDTH ?? 1280),
  height: Number(process.env.PROFILE_VIEWPORT_HEIGHT ?? 800),
};
const deviceScaleFactor = Number(process.env.PROFILE_DEVICE_SCALE ?? 1);
const mobile = process.env.PROFILE_MOBILE === 'true';
if (
  ![viewport.width, viewport.height, deviceScaleFactor].every((value) => Number.isFinite(value) && value > 0)
)
  throw new Error('Profiling viewport dimensions and device scale must be positive finite numbers.');
if (!Number.isFinite(sessionSeconds) || !Number.isFinite(spawnSeconds))
  throw new Error('PROFILE_SESSION_SECONDS and PROFILE_SPAWN_SECONDS must be numbers.');

/** Presses a setting's minus/plus buttons (each press is saved) until its value shows `target`. */
async function setOption(page, name, target) {
  const setting = page.getByRole('group', { name, exact: true });
  const value = setting.locator('output');
  for (let presses = 0; presses < 80 && Number.parseFloat(await value.textContent()) !== target; presses++) {
    const increase = Number.parseFloat(await value.textContent()) < target;
    await setting.getByRole('button', { name: increase ? /^Increase/ : /^Decrease/ }).click();
  }
  if (Number.parseFloat(await value.textContent()) !== target)
    throw new Error(`${name} cannot be set to ${target}.`);
}
// Outward-biased headings hold the authored boundary lanes despite discrete turns.
const route = [
  { axis: 'y', boundary: 1118, angle: Math.PI },
  { axis: 'x', boundary: 2014, angle: Math.PI / 2 },
  { axis: 'y', boundary: 34, angle: 0 },
  { axis: 'x', boundary: 34, angle: -Math.PI / 2 },
  { axis: 'y', boundary: 1118, angle: Math.PI },
];
let waypoint = 0;
// Defend pilot tuning, as in tests/helpers.ts (logical pixels and radians): survivors are collected only
// while no enemy is this close, and the bow must point this close to a survivor before sailing to it.
const rescueClearance = 350;
const rescueHeadingTolerance = 0.6;
const headingTolerance = 0.02;
const wrapAngle = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));
const browser = await chromium.launch({ channel: 'chromium', headless: true });
const page = await browser.newPage({ viewport, deviceScaleFactor, isMobile: mobile, hasTouch: mobile });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`${url}?profile=1`);
await page.getByRole('button', { name: 'Options', exact: true }).click();
// Options save on every press: the profiled session, spawn interval, and sound/music enabled.
await setOption(page, 'Game session time', sessionSeconds);
await setOption(page, 'Enemy spawn time', spawnSeconds);
const sound = page.getByRole('switch', { name: 'Sound', exact: true });
if ((await sound.getAttribute('aria-checked')) !== 'true') await sound.click();
await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
await page.getByRole('button', { name: 'Play', exact: true }).click();
await page.waitForFunction(() => !!window.pirateTest);
await page.keyboard.down('Space');
await page.keyboard.down('q');
await page.keyboard.down('e');
const started = Date.now();
let lastTurn = '';
let lastLog = 0;
let moving = false;
let pools = null;
let renderPools = null;
let config = null;
while (Date.now() - started < 210000 && (await page.evaluate(() => !!window.pirateTest))) {
  const state = await page.evaluate(() => window.pirateTest?.observe());
  if (!state) break;
  pools = state.pools;
  renderPools = state.renderPools;
  config = state.config;
  if (pilot === 'boundary') {
    if (Math.abs(state.player[route[waypoint].axis] - route[waypoint].boundary) < 0.01)
      waypoint = waypoint === route.length - 1 ? 1 : waypoint + 1;
    const difference = Math.atan2(
      Math.sin(route[waypoint].angle - state.player.angle),
      Math.cos(route[waypoint].angle - state.player.angle),
    );
    const angularStep = state.config.player.movement.turnSpeed * state.config.fixedStep;
    const target = Math.ceil((state.player.angle + difference) / angularStep) * angularStep;
    const turn = target - state.player.angle;
    const key = Math.abs(turn) < angularStep * 0.49 ? '' : turn > 0 ? 'd' : 'a';
    if (key !== lastTurn) {
      if (lastTurn) await page.keyboard.up(lastTurn);
      if (key) await page.keyboard.down(key);
      lastTurn = key;
    }
    const shouldMove = Math.abs(turn) < angularStep * 0.49;
    if (shouldMove !== moving) {
      if (shouldMove) await page.keyboard.down('w');
      else await page.keyboard.up('w');
      moving = shouldMove;
    }
  } else {
    // The gameplay regression's pilot, using real keyboard input only: it keeps sailing with the nearest
    // enemy abeam for the broadsides and collects survivors whenever no enemy is close.
    const { player } = state;
    const range = (point) => Math.hypot(point.x - player.x, point.y - player.y);
    const bearing = (point) => Math.atan2(point.x - player.x, player.y - point.y);
    const enemy = [...state.enemies].sort((a, b) => range(a) - range(b))[0];
    const survivor = state.presentation.particles
      .filter((particle) => particle.kind === 'crew')
      .sort((a, b) => range(a) - range(b))[0];
    let difference = 0;
    let shouldMove = true;
    if (survivor && player.health < player.maxHealth && (!enemy || range(enemy) > rescueClearance)) {
      difference = wrapAngle(bearing(survivor) - player.angle);
      shouldMove = Math.abs(difference) < rescueHeadingTolerance;
    } else if (enemy) {
      const port = wrapAngle(bearing(enemy) + Math.PI / 2 - player.angle);
      const starboard = wrapAngle(bearing(enemy) - Math.PI / 2 - player.angle);
      difference = Math.abs(port) < Math.abs(starboard) ? port : starboard;
    }
    const key = Math.abs(difference) < headingTolerance ? '' : difference > 0 ? 'd' : 'a';
    if (key !== lastTurn) {
      if (lastTurn) await page.keyboard.up(lastTurn);
      if (key) await page.keyboard.down(key);
      lastTurn = key;
    }
    if (shouldMove !== moving) {
      if (shouldMove) await page.keyboard.down('w');
      else await page.keyboard.up('w');
      moving = shouldMove;
    }
  }
  if (state.snapshot.elapsed - lastLog >= 30) {
    console.log(
      `Active time ${state.snapshot.elapsed.toFixed(1)}s, health ${state.snapshot.health}, score ${state.snapshot.score}, position ${state.player.x.toFixed(0)},${state.player.y.toFixed(0)}, route ${waypoint}`,
    );
    lastLog = state.snapshot.elapsed;
  }
  await page.waitForTimeout(15);
}
await page.keyboard.up('Space');
await page.keyboard.up('q');
await page.keyboard.up('e');
await page.keyboard.up('w');
if (lastTurn) await page.keyboard.up(lastTurn);
const metrics = await page.evaluate(() => window.pirateMetrics ?? null);
if (!metrics) throw new Error('Profiling did not reach a completed match.');
const frames = metrics.frames;
const sorted = [...frames].sort((a, b) => a - b);
const mean = frames.reduce((sum, value) => sum + value, 0) / frames.length;
const graphics = await page.evaluate(() => {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl');
  const debug = gl?.getExtension('WEBGL_debug_renderer_info');
  return {
    userAgent: navigator.userAgent,
    gpu: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : 'Unavailable',
  };
});
await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
await page.evaluate(() => history.replaceState(null, '', `${location.pathname}?test=1`));
const cdp = await page.context().newCDPSession(page);
const heap = async () => {
  await cdp.send('HeapProfiler.collectGarbage');
  return (await cdp.send('Runtime.getHeapUsage')).usedSize;
};
const memory = [{ cycle: 0, heapBytes: await heap() }];
for (let i = 1; i <= 5; i++) {
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.waitForFunction(() => !!window.pirateTest);
  await page.evaluate(() => window.pirateTest.advance(10));
  await page.getByRole('button', { name: 'Pause game' }).click();
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
  await page.getByRole('button', { name: 'Leave battle', exact: true }).click();
  await page.waitForTimeout(150);
  memory.push({ cycle: i, heapBytes: await heap() });
}
const report = {
  date: new Date().toISOString(),
  browser: await browser.version(),
  ...graphics,
  revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  // A revision with uncommitted tracked changes is not a release measurement.
  uncommittedChanges:
    execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).trim() !==
    '',
  version: await page.evaluate(
    () => document.querySelector('meta[name="build-commit"]')?.getAttribute('content') ?? null,
  ),
  viewport: `${viewport.width}x${viewport.height}`,
  deviceScaleFactor,
  mobile,
  build: 'optimized Vite preview',
  options: { sessionSeconds: config.sessionSeconds, spawnSeconds: config.spawnSeconds, sound: true },
  pilot,
  control:
    pilot === 'boundary'
      ? 'Actual keyboard navigation around authored water boundary waypoints, all three weapons held, real-time fixed-step simulation; no state writes'
      : 'Actual keyboard sailing with the nearest enemy abeam and survivor rescue, all three weapons held, real-time fixed-step simulation; no state writes',
  wallSeconds: (Date.now() - started) / 1000,
  activeSeconds: metrics.elapsed,
  reason: metrics.reason,
  score: metrics.score,
  frames: frames.length,
  fps: 1000 / mean,
  p95FrameMs: sorted[Math.floor(sorted.length * 0.95)],
  entityPeak: metrics.entityPeak,
  config,
  pools,
  renderPools,
  presentationPools: metrics.presentationPools,
  audio: metrics.audio,
  memory,
  errors,
  frameIntervalsMs: frames,
};
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ ...report, frameIntervalsMs: undefined }, null, 2));
await browser.close();
// Reinforcements can outlast a scripted pilot: the end reason and active time are reported, not required.
if (!frames.length || errors.length) process.exitCode = 1;
