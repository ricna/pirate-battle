import type { GameConfig } from '../contracts/GameConfig';
import type { GameObservation } from '../contracts/GameObservation';

type CompletedMetrics = Omit<NonNullable<Window['pirateMetrics']>, 'frames' | 'entityPeak'>;

export interface InstrumentedSession {
  observe(includeFrames: boolean): GameObservation;
  /** Advances the existing fixed-step simulation clock; it never writes combat state. */
  advance(seconds: number): void;
}

/**
 * Opt-in observation for E2E tests (`?test=1`, manual simulation clock) and real-time profiling
 * (`?profile=1`). Neither mode can assign positions, health, score or cooldowns.
 */
export class SessionInstrumentation {
  readonly #config: GameConfig;
  readonly #manualClock: boolean;
  readonly #enabled: boolean;
  readonly #samples: number[] = [];
  #entityPeak = 0;

  constructor(config: GameConfig, search: string) {
    const parameters = new URLSearchParams(search);
    this.#config = config;
    this.#manualClock = parameters.get('test') === '1';
    this.#enabled = this.#manualClock || parameters.get('profile') === '1';
  }

  /** Test mode stops real-time advancement; only `advance` moves the simulation clock. */
  get manualClock(): boolean {
    return this.#manualClock;
  }
  get frames(): readonly number[] {
    return this.#samples;
  }
  get entityPeak(): number {
    return this.#entityPeak;
  }

  /** Records a rendered frame interval after the configured warmup, within the bounded sample budget. */
  sampleFrame(deltaSeconds: number, activeSeconds: number): void {
    if (!this.#enabled || deltaSeconds <= 0 || activeSeconds <= this.#config.runtime.profileWarmupSeconds)
      return;
    this.#samples.push(deltaSeconds * 1000);
    if (this.#samples.length > this.#config.runtime.maxFrameSamples) this.#samples.shift();
  }

  trackEntities(count: number): void {
    this.#entityPeak = Math.max(this.#entityPeak, count);
  }

  install(session: InstrumentedSession): void {
    if (!this.#enabled) return;
    delete window.pirateMetrics;
    window.pirateTest = {
      observe: (includeFrames) => session.observe(includeFrames ?? false),
      ...(this.#manualClock
        ? {
            advance: (seconds: number) => {
              if (!Number.isFinite(seconds) || seconds < 0 || seconds > this.#config.runtime.maxTestAdvance)
                throw new Error('Invalid test clock advance.');
              session.advance(seconds);
            },
          }
        : {}),
    };
  }

  recordMetrics(metrics: CompletedMetrics): void {
    if (!this.#enabled) return;
    window.pirateMetrics = { ...metrics, frames: [...this.#samples], entityPeak: this.#entityPeak };
  }

  uninstall(): void {
    if (this.#enabled) delete window.pirateTest;
  }
}
