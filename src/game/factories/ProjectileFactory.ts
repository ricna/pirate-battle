import { Projectile } from '../entities/Projectile';
import { ObjectPool } from '../core/ObjectPool';
import type { PoolProfile, ProjectileProfile } from '../contracts/GameConfig';
import type { Allegiance } from '../contracts/GameDomain';
import type { Point } from '../math/Geometry';
import type { EntityIdSequence } from '../core/EntityIdSequence';

export class ProjectileFactory {
  readonly #pool: ObjectPool<Projectile>; readonly #ids: EntityIdSequence;
  constructor(settings: PoolProfile, ids: EntityIdSequence) {
    this.#ids = ids; this.#pool = new ObjectPool(settings, () => new Projectile(), (p) => p.reset());
  }
  get available(): number { return this.#pool.available; }
  create(origin: Readonly<Point>, angle: number, owner: Allegiance, profile: ProjectileProfile): Projectile | null {
    const projectile = this.#pool.acquire();
    if (projectile) projectile.activate(this.#ids.next(), origin, angle, owner, profile);
    return projectile;
  }
  release(projectile: Projectile): void { this.#pool.release(projectile); }
  statistics() { return this.#pool.statistics(); }
  dispose(): void { this.#pool.dispose((p) => p.reset()); }
}
