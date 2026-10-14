import { EndReason } from '../contracts/GameDomain';
import type { PresentationProfile } from '../configuration/PresentationConfig';

export interface TerminalStep {
  /** Presentation seconds actually consumed; never beyond the end of the window. */
  readonly consumed: number;
  readonly revealedNow: boolean;
  readonly completedNow: boolean;
}

/**
 * Timeline after combat ends. Death shows destruction before the result crossfade; time expiry shows the
 * victory message, then reveals results. The clock is advanced by the session, so pause/hidden-tab
 * suspension and test-clock advancement apply to the presentation exactly as to gameplay.
 */
export class TerminalSequence {
  readonly #victory: boolean;
  readonly #revealSeconds: number;
  readonly #totalSeconds: number;
  readonly #tolerance: number;
  #elapsed = 0;
  #revealed = false;
  #complete = false;

  constructor(reason: EndReason, presentation: PresentationProfile, tolerance: number) {
    this.#victory = reason === EndReason.Time;
    this.#revealSeconds = this.#victory ? presentation.victory.seconds : presentation.terminalSeconds;
    this.#totalSeconds = this.#revealSeconds + (this.#victory ? 0 : presentation.resultFadeSeconds);
    this.#tolerance = tolerance;
  }

  get victory(): boolean {
    return this.#victory;
  }
  get elapsed(): number {
    return this.#elapsed;
  }
  get revealed(): boolean {
    return this.#revealed;
  }
  get complete(): boolean {
    return this.#complete;
  }

  advance(seconds: number): TerminalStep {
    if (this.#complete) return { consumed: 0, revealedNow: false, completedNow: false };
    const consumed = Math.min(seconds, this.#totalSeconds - this.#elapsed);
    this.#elapsed += consumed;
    const revealedNow = !this.#revealed && this.#elapsed + this.#tolerance >= this.#revealSeconds;
    if (revealedNow) this.#revealed = true;
    const completedNow = this.#elapsed + this.#tolerance >= this.#totalSeconds;
    if (completedNow) this.#complete = true;
    return { consumed, revealedNow, completedNow };
  }
}
