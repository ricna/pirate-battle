import type { PresentationProfile } from '../configuration/PresentationConfig';
import type { ShipReadView } from '../entities/Ship';
import type { Point } from '../math/Geometry';

interface SternSample extends Point {
  readonly at: number;
  /** Speed as a fraction of the ship's maximum when sampled. */
  readonly strength: number;
}

export interface ShipTrailView {
  readonly shipId: number;
  /** Path from the stern (newest) to the tail (oldest) in logical world pixels. */
  readonly points: readonly Point[];
  readonly alpha: number;
}

/**
 * Bounded stern history for the owner-authored ship trail. Cosmetic only: it reads ship views, advances on
 * the presentation clock (so pause freezes it) and never affects movement, collision, damage or score.
 */
export class ShipTrailSystem {
  readonly #settings: PresentationProfile['shipTrail'];
  readonly #trails = new Map<number, SternSample[]>();
  #view: readonly ShipTrailView[] = Object.freeze([]);
  #omitted = 0;

  constructor(settings: PresentationProfile['shipTrail']) {
    this.#settings = settings;
  }

  get trails(): readonly ShipTrailView[] {
    return this.#view;
  }

  /** Samples moving ships at the authored interval and expires samples older than the trail lifetime. */
  update(time: number, ships: readonly ShipReadView[]): void {
    const settings = this.#settings;
    const sterns = new Map<number, Point>();
    for (const ship of ships) {
      if (!ship.alive) continue;
      const stern = this.#stern(ship);
      sterns.set(ship.id, stern);
      const strength = Math.min(1, ship.speed / ship.profile.movement.maxSpeed);
      if (strength < settings.minimumSpeedRatio) continue;
      let samples = this.#trails.get(ship.id);
      if (!samples) {
        // Bounded cosmetic degradation: beyond the authored budget a trail is omitted, never allocated.
        if (this.#trails.size >= settings.pool.maxCapacity) {
          this.#omitted++;
          continue;
        }
        samples = [];
        this.#trails.set(ship.id, samples);
      }
      const newest = samples.at(-1);
      if (!newest || time - newest.at >= settings.sampleSeconds)
        samples.push(Object.freeze({ ...stern, at: time, strength }));
    }
    for (const [shipId, samples] of this.#trails) {
      while (samples[0] && time - samples[0].at >= settings.lifetime) samples.shift();
      if (!samples.length) this.#trails.delete(shipId);
    }
    this.#publish(time, sterns);
  }

  statistics() {
    return { active: this.#trails.size, capacity: this.#settings.pool.maxCapacity, omitted: this.#omitted };
  }

  dispose(): void {
    this.#trails.clear();
    this.#view = Object.freeze([]);
  }

  #stern(ship: ShipReadView): Point {
    const distance = ship.profile.visual.height * this.#settings.sternRatio;
    return { x: ship.x - Math.sin(ship.angle) * distance, y: ship.y + Math.cos(ship.angle) * distance };
  }

  /** A live ship's current stern leads the path, so the trail stays attached between samples. */
  #publish(time: number, sterns: ReadonlyMap<number, Point>): void {
    const views: ShipTrailView[] = [];
    for (const [shipId, samples] of this.#trails) {
      const newest = samples.at(-1);
      if (!newest) continue;
      const stern = sterns.get(shipId);
      const history = samples.map(({ x, y }) => Object.freeze({ x, y })).reverse();
      const points = Object.freeze(stern ? [Object.freeze({ ...stern }), ...history] : history);
      if (points.length < 2) continue;
      const freshness = Math.max(0, 1 - (time - newest.at) / this.#settings.lifetime);
      views.push(
        Object.freeze({ shipId, points, alpha: this.#settings.alpha * newest.strength * freshness }),
      );
    }
    this.#view = Object.freeze(views);
  }
}
