import { OptionsConfig } from '../../application/configuration/OptionsConfig';
import { GameConfigFactory } from '../../game/configuration/GameConfigFactory';
import { GameConfigIdentity } from '../../game/configuration/GameConfigIdentity';
import { http, HttpResponse, delay } from 'msw';
import { setupWorker } from 'msw/browser';

import { isMatch, isMatchList } from '../../application/records/MatchRecord';
import type { MatchRecord, Page } from '../../application/records/MatchRecord';
import type { LocalStorageStore } from '../storage/LocalStorageStore';
export const SCENARIOS = [
  'success',
  'empty',
  'multiple-pages',
  'slow',
  'variable-latency',
  'out-of-order',
  'timeout',
  'connection-error',
  'http-400',
  'http-500',
  'ranking-error',
  'history-error',
  'post-commit-timeout',
  'outage',
] as const;
export type Scenario = (typeof SCENARIOS)[number];
function fixture(index: number, playerId: string, config: MatchRecord['config']): MatchRecord {
  return {
    id: `fixture-${playerId}-${GameConfigIdentity.key(config)}-${index}`,
    playerId,
    playerName: playerId.startsWith('fixture')
      ? ['Blackbeard', 'Anne Bonny', 'Calico Jack', 'Mary Read'][index % 4]!
      : 'You',
    date: new Date(Date.UTC(2026, 9, 10, 12, index)).toISOString(),
    score: 3 + (index % 11),
    duration: index % 2 ? config.sessionSeconds : 40 + (index % 20),
    reason: index % 2 ? 'time' : 'death',
    config,
  };
}
function page<T>(items: T[], number: number): Page<T> {
  return {
    items: items.slice((number - 1) * 5, number * 5),
    page: number,
    totalPages: Math.max(1, Math.ceil(items.length / 5)),
    total: items.length,
  };
}
function configFromKey(key: string | null) {
  const bits = key?.split('|');
  const duration = Number(bits?.[2]);
  const spawn = Number(bits?.[3]);
  if (duration >= 60 && duration <= 180 && spawn >= 2 && spawn <= 10)
    return GameConfigFactory.create({
      ...OptionsConfig.Default,
      sessionSeconds: duration,
      spawnSeconds: spawn,
    });
  return GameConfigFactory.create(OptionsConfig.Default);
}
/** Origin-local mock server with encapsulated scenario and reset generation. */
export class NetworkSimulator {
  readonly #storage: LocalStorageStore;
  readonly #worker: ReturnType<typeof setupWorker>;
  #scenario: Scenario;
  #requestCount = 0;
  #generation = 0;
  #warning: string | null = null;

  constructor(storage: LocalStorageStore) {
    this.#storage = storage;
    this.#scenario = storage.read<Scenario>(
      'scenario',
      (value): value is Scenario => SCENARIOS.includes(value as Scenario),
      'success',
    );
    this.#worker = setupWorker(
      http.get('*/api/ranking', async ({ request }) => {
        const mode = this.#scenario;
        const url = new URL(request.url);
        const failure = await this.#condition(mode, 'ranking');
        if (failure) return failure;
        const config = configFromKey(url.searchParams.get('config'));
        const key = GameConfigIdentity.key(config);
        const fixtures =
          mode === 'empty'
            ? []
            : Array.from({ length: mode === 'multiple-pages' ? 28 : 12 }, (_, i) =>
                fixture(i, `fixture-${i}`, config),
              );
        const items = [...fixtures, ...this.#savedRecords()]
          .filter((r) => GameConfigIdentity.key(r.config) === key)
          .sort((a, b) => b.score - a.score || a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
          .map((r, i) => ({ ...r, rank: i + 1 }));
        return HttpResponse.json(page(items, Math.max(1, Number(url.searchParams.get('page')) || 1)));
      }),
      http.get('*/api/history', async ({ request }) => {
        const mode = this.#scenario;
        const url = new URL(request.url);
        const failure = await this.#condition(mode, 'history');
        if (failure) return failure;
        const playerId = url.searchParams.get('playerId') ?? '';
        const fixtures =
          mode === 'multiple-pages'
            ? Array.from({ length: 16 }, (_, i) =>
                fixture(i, playerId, GameConfigFactory.create(OptionsConfig.Default)),
              )
            : [];
        const items = [...fixtures, ...this.#savedRecords().filter((r) => r.playerId === playerId)].sort(
          (a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id),
        );
        return HttpResponse.json(page(items, Math.max(1, Number(url.searchParams.get('page')) || 1)));
      }),
      http.post('*/api/history', async ({ request }) => {
        const mode = this.#scenario;
        const epoch = this.#generation;
        const record: unknown = await request.json();
        if (!isMatch(record)) return HttpResponse.json({ message: 'Invalid match record.' }, { status: 400 });
        const existing = this.#savedRecords().find((r) => r.id === record.id);
        if (existing) {
          await delay(100);
          return HttpResponse.json(existing);
        }
        const failure = await this.#condition(mode, 'post');
        if (failure) return failure;
        if (epoch !== this.#generation)
          return HttpResponse.json({ message: 'Demo server was reset. Retry this battle.' }, { status: 503 });
        // Commit is synchronous before the response delay. A retry recovers this same ID.
        const latest = this.#savedRecords();
        const raced = latest.find((r) => r.id === record.id);
        if (raced) return HttpResponse.json(raced);
        this.#storage.write('server', [...latest, record]);
        if (mode === 'post-commit-timeout') await delay(2500);
        return HttpResponse.json(record, { status: 201 });
      }),
    );
  }
  get scenario(): Scenario {
    return this.#scenario;
  }
  get warning(): string | null {
    return this.#warning;
  }
  setScenario(value: Scenario): void {
    this.#scenario = value;
    this.#requestCount = 0;
    this.#storage.write('scenario', value);
  }
  reset(): void {
    this.#generation++;
    this.#storage.write('server', []);
    this.setScenario('success');
  }
  #savedRecords(): MatchRecord[] {
    return this.#storage.read('server', isMatchList, []);
  }
  async #condition(mode: Scenario, kind: 'ranking' | 'history' | 'post') {
    const count = ++this.#requestCount;
    const latency =
      mode === 'slow'
        ? 1400
        : mode === 'timeout'
          ? 2500
          : mode === 'variable-latency'
            ? 100 + ((count * 193) % 700)
            : mode === 'out-of-order'
              ? count % 2
                ? 1300
                : 100
              : 180;
    await delay(latency);
    if (mode === 'connection-error') return HttpResponse.error();
    if (mode === 'http-400')
      return HttpResponse.json({ message: 'Simulated invalid request.' }, { status: 400 });
    if (mode === 'http-500' || mode === 'outage' || mode === `${kind}-error`)
      return HttpResponse.json({ message: 'Simulated service outage.' }, { status: 503 });
    return null;
  }

  async start(): Promise<void> {
    try {
      await this.#worker.start({
        serviceWorker: { url: `${import.meta.env.BASE_URL}mockServiceWorker.js` },
        onUnhandledFrame: 'bypass',
        quiet: true,
      });
    } catch {
      this.#warning =
        'The demo network could not start. Enable service workers to use Ranking and Match History. You can still play.';
    }
  }
}
