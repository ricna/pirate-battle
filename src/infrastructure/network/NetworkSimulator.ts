import { OptionsConfig } from '../../application/configuration/OptionsConfig';
import { GameConfigFactory } from '../../game/configuration/GameConfigFactory';
import { GameConfigIdentity } from '../../game/configuration/GameConfigIdentity';
import type { GameConfig } from '../../game/contracts/GameConfig';
import { http, HttpResponse, delay } from 'msw';
import type { JsonBodyType } from 'msw';
import axios from 'axios';
import type { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { setupWorker } from 'msw/browser';

import { isMatch, isMatchList } from '../../application/records/MatchRecord';
import type { MatchRecord, Page } from '../../application/records/MatchRecord';
import type { LocalStorageStore } from '../storage/LocalStorageStore';
import { MockFixtures } from './MockFixtures';
import { NetworkConfig } from './NetworkConfig';
import { NetworkScenarios } from './NetworkScenarios';
import type { MockEndpoint, MockFailure, Scenario } from './NetworkScenarios';

/** Mocked JSON response carrying the marker that distinguishes it from the static host. */
function mockJson<T extends JsonBodyType>(body: T, status = 200): Response {
  return HttpResponse.json(body, { status, headers: { [NetworkConfig.MockHeader]: '1' } });
}

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
      return mockJson({ message: 'Simulated invalid request.' }, 400);
    case 'http-503':
      return mockJson({ message: 'Simulated service outage.' }, 503);
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
  #reactivation: Promise<void> | null = null;

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
        if (!config) return mockJson({ message: 'Unknown ranking configuration.' }, 400);
        const key = GameConfigIdentity.key(config);
        const items = [...MockFixtures.ranking(behaviour.fixtures.ranking, config), ...this.#savedRecords()]
          .filter((record) => GameConfigIdentity.key(record.config) === key)
          // Score descending, then the earliest date, then ID: a deterministic tie-break.
          .sort((a, b) => b.score - a.score || a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
          .map((record, index) => ({ ...record, rank: index + 1 }));
        return mockJson(page(items, url.searchParams.get('page')));
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
        return mockJson(page(items, url.searchParams.get('page')));
      }),
      http.post('*/api/history', async ({ request }) => {
        const behaviour = NetworkScenarios.Behaviours[this.#scenario];
        const epoch = this.#generation;
        const record: unknown = await request.json();
        if (!isMatch(record)) return mockJson({ message: 'Invalid match record.' }, 400);
        const existing = this.#savedRecords().find((saved) => saved.id === record.id);
        if (existing) {
          await delay(NetworkConfig.ExistingRecordDelayMs);
          return mockJson(existing);
        }
        const failure = await this.#condition('post');
        if (failure) return failure;
        if (epoch !== this.#generation)
          return mockJson({ message: 'Demo server was reset. Retry this battle.' }, 503);
        // Commit is synchronous before the response delay. A retry recovers this same ID.
        const latest = this.#savedRecords();
        const raced = latest.find((saved) => saved.id === record.id);
        if (raced) return mockJson(raced);
        this.#storage.write('server', [...latest, record]);
        if (behaviour.postCommitDelayMs) await delay(behaviour.postCommitDelayMs);
        return mockJson(record, 201);
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

  /**
   * The browser may stop and restart an idle service worker, which then forgets this page and lets
   * `/api/` requests reach the static host. The page re-announces itself with the worker's own
   * `MOCK_ACTIVATE` message (`public/mockServiceWorker.js`, generated for the installed MSW version)
   * and waits for its `MOCKING_ENABLED` acknowledgement. Stopping and restarting MSW instead would make
   * a worker with no remaining clients unregister itself.
   */
  reactivate(): Promise<void> {
    this.#reactivation ??= this.#announceClient().finally(() => {
      this.#reactivation = null;
    });
    return this.#reactivation;
  }

  async #announceClient(): Promise<void> {
    const worker = navigator.serviceWorker?.controller;
    if (!worker) {
      await this.start();
      return;
    }
    await new Promise<void>((resolve) => {
      const finish = () => {
        clearTimeout(timeout);
        navigator.serviceWorker.removeEventListener('message', acknowledged);
        resolve();
      };
      const acknowledged = (event: MessageEvent<unknown>) => {
        const type = event.data && typeof event.data === 'object' ? Reflect.get(event.data, 'type') : null;
        if (type === 'MOCKING_ENABLED') finish();
      };
      // Without an acknowledgement the single retry still runs and reports a visible failure.
      const timeout = setTimeout(finish, NetworkConfig.ReactivationTimeoutMs);
      navigator.serviceWorker.addEventListener('message', acknowledged);
      worker.postMessage('MOCK_ACTIVATE');
    });
  }

  /**
   * Retries once, after re-activating the worker, any `/api/` response that lacks the mock marker. A second
   * unmarked response is reported instead of being parsed as records.
   */
  withRecovery(client: AxiosInstance): AxiosInstance {
    const recover = async (config: InternalAxiosRequestConfig) => {
      if (config.headers.get(NetworkConfig.RecoveryHeader))
        throw new Error('The demo network is not answering. Reload the page to restart it.');
      await this.reactivate();
      config.headers.set(NetworkConfig.RecoveryHeader, '1');
      return client.request(config);
    };
    client.interceptors.response.use(
      (response) => (response.headers[NetworkConfig.MockHeader] ? response : recover(response.config)),
      (error: unknown) => {
        if (
          axios.isAxiosError(error) &&
          error.response &&
          error.config &&
          !error.response.headers[NetworkConfig.MockHeader]
        )
          return recover(error.config);
        return Promise.reject(error);
      },
    );
    return client;
  }
}
