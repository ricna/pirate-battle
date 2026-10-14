import { OptionsConfig } from '../../application/configuration/OptionsConfig';
import { GameConfigFactory } from '../../game/configuration/GameConfigFactory';
import { GameConfigIdentity } from '../../game/configuration/GameConfigIdentity';
import type { GameConfig } from '../../game/contracts/GameConfig';
import { http, HttpResponse, delay } from 'msw';
import { setupWorker } from 'msw/browser';

import { isMatch, isMatchList } from '../../application/records/MatchRecord';
import type { MatchRecord, Page } from '../../application/records/MatchRecord';
import type { LocalStorageStore } from '../storage/LocalStorageStore';
import { MockFixtures } from './MockFixtures';
import { NetworkConfig } from './NetworkConfig';
import { NetworkScenarios } from './NetworkScenarios';
import type { MockEndpoint, MockFailure, Scenario } from './NetworkScenarios';

function page<T>(items: T[], requested: string | null): Page<T> {
  const number = Math.max(1, Number(requested) || 1);
  const size = NetworkConfig.PageSize;
  return {
    items: items.slice((number - 1) * size, number * size),
    page: number,
    totalPages: Math.max(1, Math.ceil(items.length / size)),
    total: items.length,
  };
}

/** The ranking group's own session settings, validated with the same rules as the Options screen. */
function configFromKey(key: string | null): GameConfig | null {
  const settings = key ? GameConfigIdentity.settings(key) : null;
  if (!settings) return null;
  const options = { ...OptionsConfig.Default, ...settings };
  return OptionsConfig.isValid(options) ? GameConfigFactory.create(options) : null;
}

function failureResponse(failure: MockFailure): Response {
  switch (failure) {
    case 'connection':
      return HttpResponse.error();
    case 'http-400':
      return HttpResponse.json({ message: 'Simulated invalid request.' }, { status: 400 });
    case 'http-503':
      return HttpResponse.json({ message: 'Simulated service outage.' }, { status: 503 });
  }
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
    this.#scenario = storage.read<Scenario>('scenario', NetworkScenarios.isScenario, 'success');
    this.#worker = setupWorker(
      http.get('*/api/ranking', async ({ request }) => {
        const behaviour = NetworkScenarios.Behaviours[this.#scenario];
        const url = new URL(request.url);
        const failure = await this.#condition('ranking');
        if (failure) return failure;
        const config = configFromKey(url.searchParams.get('config'));
        if (!config) return HttpResponse.json({ message: 'Unknown ranking configuration.' }, { status: 400 });
        const key = GameConfigIdentity.key(config);
        const items = [...MockFixtures.ranking(behaviour.fixtures.ranking, config), ...this.#savedRecords()]
          .filter((record) => GameConfigIdentity.key(record.config) === key)
          // Score descending, then the earliest date, then ID: a deterministic tie-break.
          .sort((a, b) => b.score - a.score || a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
          .map((record, index) => ({ ...record, rank: index + 1 }));
        return HttpResponse.json(page(items, url.searchParams.get('page')));
      }),
      http.get('*/api/history', async ({ request }) => {
        const behaviour = NetworkScenarios.Behaviours[this.#scenario];
        const url = new URL(request.url);
        const failure = await this.#condition('history');
        if (failure) return failure;
        const playerId = url.searchParams.get('playerId') ?? '';
        const fixtures = MockFixtures.history(
          behaviour.fixtures.history,
          playerId,
          GameConfigFactory.create(OptionsConfig.Default),
        );
        const items = [...fixtures, ...this.#savedRecords().filter((record) => record.playerId === playerId)];
        items.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
        return HttpResponse.json(page(items, url.searchParams.get('page')));
      }),
      http.post('*/api/history', async ({ request }) => {
        const behaviour = NetworkScenarios.Behaviours[this.#scenario];
        const epoch = this.#generation;
        const record: unknown = await request.json();
        if (!isMatch(record)) return HttpResponse.json({ message: 'Invalid match record.' }, { status: 400 });
        const existing = this.#savedRecords().find((saved) => saved.id === record.id);
        if (existing) {
          await delay(NetworkConfig.ExistingRecordDelayMs);
          return HttpResponse.json(existing);
        }
        const failure = await this.#condition('post');
        if (failure) return failure;
        if (epoch !== this.#generation)
          return HttpResponse.json({ message: 'Demo server was reset. Retry this battle.' }, { status: 503 });
        // Commit is synchronous before the response delay. A retry recovers this same ID.
        const latest = this.#savedRecords();
        const raced = latest.find((saved) => saved.id === record.id);
        if (raced) return HttpResponse.json(raced);
        this.#storage.write('server', [...latest, record]);
        if (behaviour.postCommitDelayMs) await delay(behaviour.postCommitDelayMs);
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
  /** Applies the selected scenario's deterministic latency, then its failure for this endpoint, if any. */
  async #condition(endpoint: MockEndpoint): Promise<Response | null> {
    const behaviour = NetworkScenarios.Behaviours[this.#scenario];
    await delay(behaviour.latencyMs(++this.#requestCount));
    const failure = behaviour.failures[endpoint];
    return failure ? failureResponse(failure) : null;
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
