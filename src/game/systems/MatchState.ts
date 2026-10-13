import { EndReason, MatchStatus } from '../contracts/GameDomain';
import type { GameConfig } from '../contracts/GameConfig';

export class MatchState {
  readonly #config: GameConfig; #status: MatchStatus = MatchStatus.Playing;
  #elapsed = 0; #score = 0; #reason: EndReason | null = null;
  constructor(config: GameConfig) { this.#config = config; }
  get status(): MatchStatus { return this.#status; }
  get elapsed(): number { return this.#elapsed; }
  get score(): number { return this.#score; }
  get reason(): EndReason | null { return this.#reason; }
  get remaining(): number { return Math.max(0, this.#config.sessionSeconds - this.#elapsed); }
  advance(dt: number): number {
    if (!Number.isFinite(dt) || dt < 0) throw new Error('GameManager step must be finite and non-negative.');
    if (this.#status !== MatchStatus.Playing) return 0;
    const budget = Math.min(dt, this.remaining); this.#elapsed += budget; return budget;
  }
  awardKill(): void { if (this.#status === MatchStatus.Playing) this.#score += this.#config.rules.pointsPerKill; }
  pause(): void { if (this.#status === MatchStatus.Playing) this.#status = MatchStatus.Paused; }
  resume(): void { if (this.#status === MatchStatus.Paused) this.#status = MatchStatus.Playing; }
  finish(reason: EndReason): void { if (this.#status === MatchStatus.Ended) return; this.#reason = reason; this.#status = MatchStatus.Ended; }
}
