import { Allegiance, EffectKind, GameEvent } from '../domain';
import type { Ship } from '../entities/Ship';
import type { GameConfig } from '../configuration/types';
import type { EffectSystem } from './EffectSystem';
import type { MatchState } from './MatchState';

export class DamageSystem {
  readonly #config: GameConfig; readonly #effects: EffectSystem; readonly #match: MatchState;
  readonly #emit: (event: GameEvent) => void; #warnedHealth = false;
  constructor(config: GameConfig, effects: EffectSystem, match: MatchState, emit: (event: GameEvent) => void) {
    this.#config = config; this.#effects = effects; this.#match = match; this.#emit = emit;
  }
  apply(ship: Ship, amount: number, credited: boolean): void {
    if (!ship.alive) return;
    const killed = ship.applyDamage(amount); this.#emit(GameEvent.Impact); this.#effects.emit(ship, EffectKind.Impact);
    if (killed) {
      this.#effects.emit(ship, EffectKind.Explosion); this.#emit(GameEvent.Explosion);
      if (ship.allegiance === Allegiance.Enemy && credited) { this.#match.awardKill(); this.#emit(GameEvent.Score); }
    }
    if (ship.allegiance === Allegiance.Player && ship.health <= ship.maxHealth * this.#config.rules.lowHealthRatio && !this.#warnedHealth) {
      this.#warnedHealth = true; this.#emit(GameEvent.LowHealth);
    }
  }
}
