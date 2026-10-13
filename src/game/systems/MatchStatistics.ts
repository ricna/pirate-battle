import { Allegiance } from '../contracts/GameDomain';
import type { Allegiance as ShipAllegiance } from '../contracts/GameDomain';

export interface StatisticsSnapshot {
  readonly cannonballsFired: number;
  readonly cannonballHits: number;
  readonly enemiesSunk: number;
  readonly damageReceived: number;
  readonly healthRemaining: number;
}

export class MatchStatistics {
  #shots = 0;
  #hits = 0;
  #kills = 0;
  #damage = 0;

  fired(allegiance: ShipAllegiance, count: number): void {
    if (allegiance === Allegiance.Player) this.#shots += count;
  }

  damaged(allegiance: ShipAllegiance, amount: number, credited: boolean, killed: boolean): void {
    if (allegiance === Allegiance.Player) this.#damage += amount;
    else if (credited) {
      this.#hits++;
      if (killed) this.#kills++;
    }
  }

  snapshot(health: number): StatisticsSnapshot {
    return Object.freeze({
      cannonballsFired: this.#shots,
      cannonballHits: this.#hits,
      enemiesSunk: this.#kills,
      damageReceived: this.#damage,
      healthRemaining: health,
    });
  }
}
