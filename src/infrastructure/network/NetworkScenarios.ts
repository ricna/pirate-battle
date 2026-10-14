import { freezeStaticConfiguration } from '../../game/core/Immutable';
import { NetworkConfig } from './NetworkConfig';

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

export type MockEndpoint = 'ranking' | 'history' | 'post';
export type MockFailure = 'connection' | 'http-400' | 'http-503';

export interface ScenarioBehaviour {
  /** Response delay for the 1-based request count since the scenario was selected; deterministic. */
  readonly latencyMs: (requestCount: number) => number;
  /** Endpoints that fail and how; omitted endpoints succeed. */
  readonly failures: Readonly<Partial<Record<MockEndpoint, MockFailure>>>;
  /** Fixture records of other captains (ranking) and of this player (history). */
  readonly fixtures: { readonly ranking: number; readonly history: number };
  /** A new POST commits first, then waits this long before responding. */
  readonly postCommitDelayMs: number;
}

const NormalLatencyMs = 180;
const SlowLatencyMs = 1400;
const TimeoutLatencyMs = 2500;
const OutOfOrderLatencyMs = { odd: 1300, even: 100 } as const;
const VariableLatency = { baseMs: 100, stepMs: 193, rangeMs: 700 } as const;
const StandardFixtures = { ranking: 12, history: 0 } as const;
const PagedFixtures = { ranking: 28, history: 16 } as const;
const NoFixtures = { ranking: 0, history: 0 } as const;
const AllEndpoints = (failure: MockFailure) =>
  ({ ranking: failure, history: failure, post: failure }) as const;

const normal = (overrides: Partial<ScenarioBehaviour> = {}): ScenarioBehaviour => ({
  latencyMs: () => NormalLatencyMs,
  failures: {},
  fixtures: StandardFixtures,
  postCommitDelayMs: 0,
  ...overrides,
});

/** Reproducible MSW scenarios, authored as data instead of branches inside the request handlers. */
export class NetworkScenarios {
  private constructor() {}
  static readonly Behaviours: Readonly<Record<Scenario, ScenarioBehaviour>> = {
    success: normal(),
    empty: normal({ fixtures: NoFixtures }),
    'multiple-pages': normal({ fixtures: PagedFixtures }),
    slow: normal({ latencyMs: () => SlowLatencyMs }),
    'variable-latency': normal({
      latencyMs: (count) =>
        VariableLatency.baseMs + ((count * VariableLatency.stepMs) % VariableLatency.rangeMs),
    }),
    'out-of-order': normal({
      latencyMs: (count) => (count % 2 ? OutOfOrderLatencyMs.odd : OutOfOrderLatencyMs.even),
    }),
    timeout: normal({ latencyMs: () => TimeoutLatencyMs }),
    'connection-error': normal({ failures: AllEndpoints('connection') }),
    'http-400': normal({ failures: AllEndpoints('http-400') }),
    'http-500': normal({ failures: AllEndpoints('http-503') }),
    'ranking-error': normal({ failures: { ranking: 'http-503' } }),
    'history-error': normal({ failures: { history: 'http-503' } }),
    'post-commit-timeout': normal({ postCommitDelayMs: TimeoutLatencyMs }),
    outage: normal({ failures: AllEndpoints('http-503') }),
  };

  static isScenario(value: unknown): value is Scenario {
    return SCENARIOS.some((scenario) => scenario === value);
  }
}

// The documented timing relationships are part of the scenario contract; fail at startup if edited apart.
if (SlowLatencyMs >= NetworkConfig.RequestTimeoutMs || TimeoutLatencyMs <= NetworkConfig.RequestTimeoutMs)
  throw new Error('Slow scenarios must finish before the request timeout and timeout scenarios after it.');

freezeStaticConfiguration(NetworkScenarios);
