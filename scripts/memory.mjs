/* global window */
// Repeats start/play/leave cycles on the optimized preview and reports whether retained heap plateaus.
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import process from 'node:process';
import console from 'node:console';

const url = process.env.PROFILE_URL ?? 'http://127.0.0.1:4173/';
const cycles = Number(process.env.MEMORY_CYCLES ?? 30);
/** Early cycles warm JIT code, shader programs and decoded-image caches; the trend excludes them. */
const warmupCycles = Number(process.env.MEMORY_WARMUP_CYCLES ?? 5);
const output = process.env.MEMORY_OUTPUT ?? 'reports/memory-followup.json';
const retainersOutput = process.env.MEMORY_RETAINERS_OUTPUT ?? 'reports/memory-retainers.json';
if (!Number.isInteger(cycles) || !Number.isInteger(warmupCycles) || cycles <= warmupCycles + 2)
  throw new Error('MEMORY_CYCLES must exceed MEMORY_WARMUP_CYCLES by at least three.');

const browser = await chromium.launch({ channel: 'chromium', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await page.goto(`${url}?test=1`);
const cdp = await page.context().newCDPSession(page);
const samples = [];
const summaries = new Map();

async function heapSummary() {
  const chunks = [];
  const receive = ({ chunk }) => chunks.push(chunk);
  cdp.on('HeapProfiler.addHeapSnapshotChunk', receive);
  await cdp.send('HeapProfiler.takeHeapSnapshot');
  cdp.off('HeapProfiler.addHeapSnapshotChunk', receive);
  const snapshot = JSON.parse(chunks.join(''));
  const fields = snapshot.snapshot.meta.node_fields;
  const names = snapshot.strings;
  const types = snapshot.snapshot.meta.node_types[0];
  const result = {};
  for (let index = 0; index < snapshot.nodes.length; index += fields.length) {
    const type = types[snapshot.nodes[index + fields.indexOf('type')]];
    const name = names[snapshot.nodes[index + fields.indexOf('name')]];
    const label = `${type}:${name}`;
    result[label] ??= { count: 0, bytes: 0 };
    result[label].count++;
    result[label].bytes += snapshot.nodes[index + fields.indexOf('self_size')];
  }
  return result;
}

/** Least-squares slope in bytes per cycle. */
function slope(points) {
  const n = points.length;
  const meanX = points.reduce((sum, point) => sum + point.cycle, 0) / n;
  const meanY = points.reduce((sum, point) => sum + point.heapBytes, 0) / n;
  const numerator = points.reduce((sum, point) => sum + (point.cycle - meanX) * (point.heapBytes - meanY), 0);
  const denominator = points.reduce((sum, point) => sum + (point.cycle - meanX) ** 2, 0);
  return numerator / denominator;
}

for (let cycle = 1; cycle <= cycles; cycle++) {
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await page.waitForFunction(() => !!window.pirateTest);
  await page.evaluate(() => window.pirateTest.advance(10));
  await page.getByRole('button', { name: 'Pause game' }).click();
  await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
  await page.getByRole('button', { name: 'Leave battle', exact: true }).click();
  await page.waitForTimeout(200);
  await cdp.send('HeapProfiler.collectGarbage');
  const heap = await cdp.send('Runtime.getHeapUsage');
  const dom = await cdp.send('Memory.getDOMCounters');
  samples.push({ cycle, heapBytes: heap.usedSize, ...dom });
  console.log(JSON.stringify(samples.at(-1)));
  if (cycle === warmupCycles || cycle === cycles) summaries.set(cycle, await heapSummary());
}

const trend = samples.filter((sample) => sample.cycle > warmupCycles);
const bytesPerCycle = slope(trend);
const first = trend[0];
const last = trend.at(-1);
const report = {
  date: new Date().toISOString(),
  browser: await browser.version(),
  revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  viewport: '1280x800',
  build: 'optimized Vite preview',
  workload: 'Each cycle: Play, 10 s of real fixed-step rules through the test clock, pause, leave the battle',
  cycles,
  warmupCycles,
  analysis: {
    bytesPerCycleAfterWarmup: Math.round(bytesPerCycle),
    heapGrowthAfterWarmupBytes: last.heapBytes - first.heapBytes,
    documents: [...new Set(samples.map((sample) => sample.documents))],
    nodesRange: [Math.min(...trend.map((s) => s.nodes)), Math.max(...trend.map((s) => s.nodes))],
    listenersRange: [
      Math.min(...trend.map((s) => s.jsEventListeners)),
      Math.max(...trend.map((s) => s.jsEventListeners)),
    ],
  },
  errors,
  samples,
};
await mkdir('reports', { recursive: true });
await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
const before = summaries.get(warmupCycles);
const after = summaries.get(cycles);
const differences = Object.entries(after)
  .map(([name, value]) => ({
    name,
    countDelta: value.count - (before[name]?.count ?? 0),
    bytesDelta: value.bytes - (before[name]?.bytes ?? 0),
  }))
  .filter((value) => value.countDelta > 0)
  .sort((a, b) => b.bytesDelta - a.bytesDelta);
await writeFile(
  retainersOutput,
  `${JSON.stringify({ comparedCycles: [warmupCycles, cycles], differences: differences.slice(0, 40) }, null, 2)}\n`,
);
console.log(JSON.stringify({ ...report, samples: undefined }, null, 2));
await browser.close();
if (errors.length) process.exitCode = 1;
