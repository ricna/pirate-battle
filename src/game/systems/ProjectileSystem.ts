import { Allegiance } from '../domain';
import type { ProjectileProfile } from '../configuration/types';
import type { ProjectileFactory } from '../factories/ProjectileFactory';
import type { Projectile, ProjectileReadView } from '../entities/Projectile';
import type { Ship } from '../entities/Ship';
import type { ICollisionWorld } from '../core/CollisionWorld';
import { segmentCircle } from '../geometry';
import type { Point } from '../geometry';

export interface IProjectileEmitter {
  readonly available: number;
  emit(origin: Readonly<Point>, angle: number, owner: Allegiance, profile: ProjectileProfile): boolean;
}
export class ProjectileSystem implements IProjectileEmitter {
  readonly #factory: ProjectileFactory; #active: Projectile[] = []; #view: readonly Projectile[] = Object.freeze([]);
  #readView: readonly ProjectileReadView[] = Object.freeze([]);
  constructor(factory: ProjectileFactory) { this.#factory = factory; }
  get projectiles(): readonly Projectile[] { return this.#view; }
  get readView(): readonly ProjectileReadView[] { return this.#readView; }
  #publish(): void { this.#view = Object.freeze([...this.#active]); this.#readView = Object.freeze(this.#active.map((p) => p.view)); }
  get available(): number { return this.#factory.available; }
  emit(origin: Readonly<Point>, angle: number, owner: Allegiance, profile: ProjectileProfile): boolean {
    const p = this.#factory.create(origin, angle, owner, profile); if (!p) return false;
    this.#active.push(p); this.#publish(); return true;
  }
  update(dt: number, player: Ship, enemies: readonly Ship[], world: ICollisionWorld,
    damage: (ship: Ship, amount: number, credited: boolean) => void, impact: (point: Point) => void): void {
    let changed = false;
    this.#active = this.#active.filter((p) => {
      let keep = player.alive;
      if (keep) {
        const next = p.nextPosition(dt);
        let first = world.obstacleHit(p, next, p.radius); let victim: Ship | null = null;
        for (const ship of p.owner === Allegiance.Player ? enemies : [player]) {
          if (!ship.alive) continue;
          const t = segmentCircle(p, next, ship, ship.radius + p.radius);
          if (t !== null && t < first) { first = t; victim = ship; }
        }
        if (first !== Infinity) {
          if (victim) damage(victim, p.damage, p.owner === Allegiance.Player);
          else impact({ x: p.x + (next.x - p.x) * first, y: p.y + (next.y - p.y) * first });
          keep = false;
        } else { p.advance(next, dt); keep = !p.expired && world.isFree(p, 0); }
      }
      if (!keep) { this.#factory.release(p); changed = true; }
      return keep;
    });
    if (changed) this.#publish();
  }
  statistics() { return this.#factory.statistics(); }
  dispose(): void { this.#active.length = 0; this.#publish(); this.#factory.dispose(); }
}
