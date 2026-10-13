import { http, HttpResponse, delay } from 'msw';
import { setupWorker } from 'msw/browser';
import { configurationKey, createGameConfig, DEFAULT_OPTIONS } from '../../game/configuration/GameConfiguration';
import { isMatch, isMatchList } from '../../application/records/MatchRecord';
import type { MatchRecord, Page } from '../../application/records/MatchRecord';
import { readStored, writeStored } from '../storage/LocalStorageStore';
export const SCENARIOS = ['success', 'empty', 'multiple-pages', 'slow', 'variable-latency', 'out-of-order',
  'timeout', 'connection-error', 'http-400', 'http-500', 'ranking-error', 'history-error',
  'post-commit-timeout', 'outage'] as const;
export type Scenario = typeof SCENARIOS[number];
let scenario = readStored<Scenario>('scenario', (v): v is Scenario => SCENARIOS.includes(v as Scenario), 'success');
let requestCount = 0; let generation = 0;
export function getScenario() { return scenario; }
export function setScenario(value: Scenario) { scenario = value; requestCount = 0; writeStored('scenario', value); }
export function resetNetwork() { generation++; writeStored('server', []); setScenario('success'); }
function fixture(index: number, playerId: string, config: MatchRecord['config']): MatchRecord {
  return { id: `fixture-${playerId}-${configurationKey(config)}-${index}`, playerId,
    playerName: playerId.startsWith('fixture') ? ['Blackbeard', 'Anne Bonny', 'Calico Jack', 'Mary Read'][index % 4]! : 'You',
    date: new Date(Date.UTC(2026, 9, 10, 12, index)).toISOString(), score: 3 + index % 11,
    duration: index % 2 ? config.sessionSeconds : 40 + index % 20, reason: index % 2 ? 'time' : 'death', config };
}
function page<T>(items: T[], number: number): Page<T> {
  return { items: items.slice((number - 1) * 5, number * 5), page: number, totalPages: Math.max(1, Math.ceil(items.length / 5)), total: items.length };
}
async function condition(mode: Scenario, kind: 'ranking' | 'history' | 'post') {
  const count = ++requestCount;
  const latency = mode === 'slow' ? 1400 : mode === 'timeout' ? 2500 : mode === 'variable-latency'
    ? 100 + (count * 193 % 700) : mode === 'out-of-order' ? count % 2 ? 1300 : 100 : 180;
  await delay(latency);
  if (mode === 'connection-error') return HttpResponse.error();
  if (mode === 'http-400') return HttpResponse.json({ message: 'Simulated invalid request.' }, { status: 400 });
  if (mode === 'http-500' || mode === 'outage' || mode === `${kind}-error`)
    return HttpResponse.json({ message: 'Simulated service outage.' }, { status: 503 });
  return null;
}
function savedRecords() { return readStored('server', isMatchList, []); }
function configFromKey(key: string | null) {
  const bits = key?.split('|');
  const duration = Number(bits?.[2]); const spawn = Number(bits?.[3]);
  if (duration >= 60 && duration <= 180 && spawn >= 2 && spawn <= 10)
    return createGameConfig({ ...DEFAULT_OPTIONS, sessionSeconds: duration, spawnSeconds: spawn });
  return createGameConfig(DEFAULT_OPTIONS);
}
export const handlers = [
  http.get('*/api/ranking', async ({ request }) => {
    const mode = scenario; const url = new URL(request.url); const failure = await condition(mode, 'ranking'); if (failure) return failure;
    const config = configFromKey(url.searchParams.get('config')); const key = configurationKey(config);
    const fixtures = mode === 'empty' ? [] : Array.from({ length: mode === 'multiple-pages' ? 28 : 12 }, (_, i) => fixture(i, `fixture-${i}`, config));
    const items = [...fixtures, ...savedRecords()].filter((r) => configurationKey(r.config) === key)
      .sort((a, b) => b.score - a.score || a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
      .map((r, i) => ({ ...r, rank: i + 1 }));
    return HttpResponse.json(page(items, Math.max(1, Number(url.searchParams.get('page')) || 1)));
  }),
  http.get('*/api/history', async ({ request }) => {
    const mode = scenario; const url = new URL(request.url); const failure = await condition(mode, 'history'); if (failure) return failure;
    const playerId = url.searchParams.get('playerId') ?? '';
    const fixtures = mode === 'multiple-pages' ? Array.from({ length: 16 }, (_, i) => fixture(i, playerId, createGameConfig(DEFAULT_OPTIONS))) : [];
    const items = [...fixtures, ...savedRecords().filter((r) => r.playerId === playerId)]
      .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
    return HttpResponse.json(page(items, Math.max(1, Number(url.searchParams.get('page')) || 1)));
  }),
  http.post('*/api/history', async ({ request }) => {
    const mode = scenario; const epoch = generation; const record: unknown = await request.json();
    if (!isMatch(record)) return HttpResponse.json({ message: 'Invalid match record.' }, { status: 400 });
    const existing = savedRecords().find((r) => r.id === record.id);
    if (existing) { await delay(100); return HttpResponse.json(existing); }
    const failure = await condition(mode, 'post'); if (failure) return failure;
    if (epoch !== generation) return HttpResponse.json({ message: 'Demo server was reset. Retry this battle.' }, { status: 503 });
    // Commit is synchronous before the response delay. A retry recovers this same ID.
    const latest = savedRecords(); const raced = latest.find((r) => r.id === record.id);
    if (raced) return HttpResponse.json(raced);
    writeStored('server', [...latest, record]);
    if (mode === 'post-commit-timeout') await delay(2500);
    return HttpResponse.json(record, { status: 201 });
  }),
];
export const worker = setupWorker(...handlers);
export let networkWarning: string | null = null;
export async function startNetwork() {
  try {
    await worker.start({ serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
      onUnhandledFrame: 'bypass', quiet: true });
  } catch { networkWarning = 'The demo network could not start. Enable service workers to use Ranking and Match History. You can still play.'; }
}
