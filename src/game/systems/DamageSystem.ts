import { Allegiance, EffectKind, GameEvent } from '../domain';
import type { Ship } from '../entities/Ship';
import type { GameConfig } from '../configuration/types';
import type { EffectSystem } from './EffectSystem';
import type { MatchState } from './MatchState';
import { FeedbackKind } from '../presentation/events';
import type { FeedbackEvent } from '../presentation/events';
import type { MatchStatistics } from './MatchStatistics';

export class DamageSystem {
  readonly #config: GameConfig; readonly #effects: EffectSystem; readonly #match: MatchState;
  readonly #emit: (event: GameEvent) => void; #warnedHealth = false;
  readonly #feedback: (event: FeedbackEvent) => void;
  readonly #statistics: MatchStatistics;
  constructor(config: GameConfig, effects: EffectSystem, match: MatchState, emit: (event: GameEvent) => void,
    feedback: (event: FeedbackEvent) => void, statistics: MatchStatistics) {
    this.#config = config; this.#effects = effects; this.#match = match; this.#emit = emit;
    this.#feedback = feedback; this.#statistics = statistics;
  }
  apply(ship: Ship, amount: number, credited: boolean): void {
    if (!ship.alive) return;
    const received = Math.min(amount, ship.health);
    const killed = ship.applyDamage(amount); this.#emit(GameEvent.Impact); this.#effects.emit(ship, EffectKind.Impact);
    this.#statistics.damaged(ship.allegiance, received, credited, killed);
    const point = { x: ship.x, y: ship.y };
    this.#feedback({ kind: FeedbackKind.Damage, shipId: ship.id, allegiance: ship.allegiance, point, amount: received });
    if (killed) {
      this.#effects.emit(ship, EffectKind.Explosion); this.#emit(GameEvent.Explosion);
      this.#emit(GameEvent.Sinking);
      this.#feedback({ kind: FeedbackKind.Sunk, shipId: ship.id, allegiance: ship.allegiance, point, angle: ship.angle, visual: ship.profile.visual });
      if (ship.allegiance === Allegiance.Enemy && credited) {
        this.#match.awardKill(); this.#emit(GameEvent.Score);
        this.#feedback({ kind: FeedbackKind.Score, shipId: ship.id, point, points: this.#config.rules.pointsPerKill });
      }
    }
    if (ship.allegiance === Allegiance.Player && ship.health <= ship.maxHealth * this.#config.rules.lowHealthRatio && !this.#warnedHealth) {
      this.#warnedHealth = true; this.#emit(GameEvent.LowHealth);
    }
  }
}
