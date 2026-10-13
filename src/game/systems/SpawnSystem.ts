import type { GameConfig } from '../contracts/GameConfig';
import type { Point } from '../math/Geometry';
import { distance } from '../math/Geometry';
import type { Ship } from '../entities/Ship';

export class SpawnSystem {
  readonly #config: GameConfig;
  #state: number;
  #nextSpawn: number;
  #count = 0;
  /** The profile is rolled after the point, so spacing assumes the largest registered hull. */
  readonly #largestHull: number;
  constructor(config: GameConfig) {
    this.#config = config;
    this.#state = config.seed;
    this.#nextSpawn = config.spawnSeconds;
    this.#largestHull = Math.max(...Object.values(config.enemies).map((profile) => profile.hullRadius));
  }
  #random(): number {
    const random = this.#config.random;
    this.#state = (Math.imul(random.multiplier, this.#state) + random.increment) >>> 0;
    return this.#state / random.modulus;
  }
  update(
    elapsed: number,
    player: Ship,
    enemies: readonly Ship[],
    create: (id: string, point: Readonly<Point>) => void,
  ): void {
    while (elapsed + this.#config.rules.clockTolerance >= this.#nextSpawn) {
      this.#nextSpawn += this.#config.spawnSeconds;
      if (enemies.length >= this.#config.spawning.maxCount) continue;
      const valid = this.#config.spawnPoints.filter(
        (p) =>
          distance(p, player) >= this.#config.spawning.safeDistance &&
          !enemies.some(
            (e) => distance(e, p) < (e.hullRadius + this.#largestHull) * this.#config.spawning.hullSeparation,
          ),
      );
      if (!valid.length) continue;
      const point = valid[Math.floor(this.#random() * valid.length)]!;
      let profileId = this.#config.spawning.initialSequence[this.#count];
      if (!profileId) {
        const weights = this.#config.spawning.weights;
        const total = weights.reduce((sum, w) => sum + w.weight, 0);
        let roll = this.#random() * total;
        profileId = weights.at(-1)!.profileId;
        for (const weight of weights) {
          roll -= weight.weight;
          if (roll < 0) {
            profileId = weight.profileId;
            break;
          }
        }
      }
      create(profileId, point);
      this.#count++;
    }
  }
}
