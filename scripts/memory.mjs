/* global window */
import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';
import console from 'node:console';
const browser = await chromium.launch({ channel: 'chromium', headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto('http://127.0.0.1:4173/?test=1');
const cdp = await page.context().newCDPSession(page); const samples = []; const summaries = [];
async function heapSummary() {
  const chunks = []; const receive = ({ chunk }) => chunks.push(chunk);
  cdp.on('HeapProfiler.addHeapSnapshotChunk', receive); await cdp.send('HeapProfiler.takeHeapSnapshot');
  cdp.off('HeapProfiler.addHeapSnapshotChunk', receive);
  const snapshot = JSON.parse(chunks.join('')); const fields = snapshot.snapshot.meta.node_fields;
  const names = snapshot.strings; const types = snapshot.snapshot.meta.node_types[0]; const result = {};
  for (let i = 0; i < snapshot.nodes.length; i += fields.length) {
    const type = types[snapshot.nodes[i + fields.indexOf('type')]];
    const name = names[snapshot.nodes[i + fields.indexOf('name')]];
    const label = `${type}:${name}`; result[label] ??= { count: 0, bytes: 0 };
    result[label].count++; result[label].bytes += snapshot.nodes[i + fields.indexOf('self_size')];
  }
  return result;
}
for (let cycle = 0; cycle < 25; cycle++) {
  await page.getByRole('button', { name: 'Play', exact: true }).click(); await page.waitForFunction(() => !!window.pirateTest);
  await page.evaluate(() => window.pirateTest.advance(10));
  await page.getByRole('button', { name: 'Pause game' }).click(); await page.getByRole('button', { name: 'Main Menu', exact: true }).click();
  await page.getByRole('button', { name: 'Leave battle', exact: true }).click(); await page.waitForTimeout(200);
  await cdp.send('HeapProfiler.collectGarbage');
  const heap = await cdp.send('Runtime.getHeapUsage'); const dom = await cdp.send('Memory.getDOMCounters');
  samples.push({ cycle: cycle + 1, heapBytes: heap.usedSize, ...dom });
  console.log(JSON.stringify(samples.at(-1)));
  if (cycle === 4 || cycle === 24) summaries.push(await heapSummary());
}
await writeFile('reports/memory-followup.json', JSON.stringify({ browser: await browser.version(), viewport: '1280x800',
  build: 'optimized preview', warmupCycles: 5, samples }, null, 2) + '\n');
const differences = Object.entries(summaries[1]).map(([name, value]) => ({ name,
  countDelta: value.count - (summaries[0][name]?.count ?? 0), bytesDelta: value.bytes - (summaries[0][name]?.bytes ?? 0) }))
  .filter((value) => value.countDelta > 0).sort((a, b) => b.bytesDelta - a.bytesDelta);
await writeFile('reports/memory-retainers.json', JSON.stringify({ comparedCycles: [5, 25], differences: differences.slice(0, 40) }, null, 2) + '\n');
await browser.close();
