import type { GameConfig } from '../contracts/GameConfig';
import type { Point } from '../math/Geometry';
import { distance } from '../math/Geometry';
import type { Ship } from '../entities/Ship';

/**
 * Enemies come from three sources: the opening fleet, the configured interval and one reinforcement per
 * `sunkEnemiesPerReinforcement` sinkings. The opening fleet and reinforcements are owed, so they wait for a
 * safe point; an interval spawn without one is skipped.
 */
export class SpawnSystem {
  readonly #config: GameConfig;
  #state: number;
  #nextSpawn: number;
  #count = 0;
  #owed: number;
  #sunkSinceReinforcement = 0;
  /** Indices of the latest spawn points, oldest first. */
  readonly #recentPoints: number[] = [];
  /** The profile is rolled after the point, so spacing assumes the largest registered hull. */
  readonly #largestHull: number;
  constructor(config: GameConfig) {
    this.#config = config;
    this.#state = config.seed;
    this.#nextSpawn = config.spawnSeconds;
    this.#owed = config.spawning.initialCount;
    this.#largestHull = Math.max(...Object.values(config.enemies).map((profile) => profile.hullRadius));
  }
  #random(): number {
    const random = this.#config.random;
    this.#state = (Math.imul(random.multiplier, this.#state) + random.increment) >>> 0;
    return this.#state / random.modulus;
  }
  /** Counts an enemy sunk by any cause towards its reinforcement. */
  enemySunk(): void {
    this.#sunkSinceReinforcement++;
    if (this.#sunkSinceReinforcement < this.#config.spawning.sunkEnemiesPerReinforcement) return;
    this.#sunkSinceReinforcement = 0;
    this.#owed++;
  }
  update(
    elapsed: number,
    player: Ship,
    enemies: readonly Ship[],
    create: (id: string, point: Readonly<Point>) => void,
  ): void {
    while (this.#owed > 0 && this.#spawn(player, enemies, create)) this.#owed--;
    while (elapsed + this.#config.rules.clockTolerance >= this.#nextSpawn) {
      this.#nextSpawn += this.#config.spawnSeconds;
      this.#spawn(player, enemies, create);
    }
  }
  #spawn(
    player: Ship,
    enemies: readonly Ship[],
    create: (id: string, point: Readonly<Point>) => void,
  ): boolean {
    if (enemies.length >= this.#config.spawning.maxCount) return false;
    const index = this.#choosePoint(player, enemies);
    if (index === null) return false;
    this.#remember(index);
    create(this.#chooseProfile(), this.#config.spawnPoints[index]!);
    this.#count++;
    return true;
  }
  /** A random choice among the farthest safe points keeps pressure away from the player without a fixed lane. */
  #choosePoint(player: Ship, enemies: readonly Ship[]): number | null {
    const spawning = this.#config.spawning;
    const candidates = this.#config.spawnPoints
      .map((point, index) => ({ index, range: distance(point, player), point }))
      .filter(
        ({ index, range, point }) =>
          range >= spawning.safeDistance &&
          !this.#recentPoints.includes(index) &&
          !enemies.some(
            (e) => distance(e, point) < (e.hullRadius + this.#largestHull) * spawning.hullSeparation,
          ),
      )
      .sort((a, b) => b.range - a.range)
      .slice(0, spawning.farthestPointChoices);
    if (!candidates.length) return null;
    return candidates[Math.floor(this.#random() * candidates.length)]!.index;
  }
  #remember(index: number): void {
    this.#recentPoints.push(index);
    if (this.#recentPoints.length > this.#config.spawning.recentPointsExcluded) this.#recentPoints.shift();
  }
  #chooseProfile(): string {
    const scripted = this.#config.spawning.initialSequence[this.#count];
    if (scripted) return scripted;
    const weights = this.#config.spawning.weights;
    const total = weights.reduce((sum, w) => sum + w.weight, 0);
    let roll = this.#random() * total;
    for (const weight of weights) {
      roll -= weight.weight;
      if (roll < 0) return weight.profileId;
    }
    return weights.at(-1)!.profileId;
  }
}
