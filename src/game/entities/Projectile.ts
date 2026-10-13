import { Entity } from '../core/Entity';
import type { ProjectileProfile } from '../contracts/GameConfig';
import type { Allegiance } from '../contracts/GameDomain';
import type { Point } from '../math/Geometry';
import { freezeConfiguration } from '../core/Immutable';

export interface ProjectileSnapshot extends Point { readonly id: number; readonly vx: number; readonly vy: number;
  readonly owner: Allegiance; readonly damage: number; readonly age: number; readonly speed: number; readonly radius: number }
export interface ProjectileReadView extends ProjectileSnapshot { readonly profile: ProjectileProfile }
/** Pool-owned: activation always resets the entire lease, including identity and profile. */
export class Projectile extends Entity {
  #profile: ProjectileProfile | null = null; #owner: Allegiance | null = null;
  #angle = 0; #speed = 0; #age = 0;
  readonly #view: ProjectileReadView;
  constructor() {
    super(-1, { x: 0, y: 0 });
    this.#view = ((entity) => Object.freeze({ get id() { return entity.id; }, get x() { return entity.x; }, get y() { return entity.y; },
      get vx() { return entity.vx; }, get vy() { return entity.vy; }, get owner() { return entity.owner; },
      get damage() { return entity.damage; }, get age() { return entity.age; }, get speed() { return entity.speed; },
      get radius() { return entity.radius; }, get profile() { return entity.profile; } }))(this);
  }
  get view(): ProjectileReadView { return this.#view; }
  get profile(): ProjectileProfile { if (!this.#profile) throw new Error('Inactive projectile has no profile.'); return this.#profile; }
  get owner(): Allegiance { if (!this.#owner) throw new Error('Inactive projectile has no owner.'); return this.#owner; }
  get age(): number { return this.#age; }
  get speed(): number { return this.#speed; }
  get damage(): number { return this.profile.damage; }
  get radius(): number { return this.profile.radius; }
  get vx(): number { return Math.sin(this.#angle) * this.#speed; }
  get vy(): number { return -Math.cos(this.#angle) * this.#speed; }
  get expired(): boolean { return this.#age >= this.profile.lifetime; }
  activate(id: number, origin: Readonly<Point>, angle: number, owner: Allegiance, profile: ProjectileProfile): void {
    if (this.#profile) throw new Error('Projectile is already active.');
    this.resetIdentity(id, origin); this.#profile = Object.isFrozen(profile) ? profile : freezeConfiguration(structuredClone(profile)); this.#owner = owner;
    this.#angle = angle; this.#speed = profile.initialSpeed; this.#age = 0;
  }
  nextPosition(dt: number): Point {
    const p = this.profile;
    this.#speed = Math.max(0, Math.min(p.maxSpeed, this.#speed + (p.acceleration - p.deceleration) * dt));
    return { x: this.x + this.vx * dt, y: this.y + this.vy * dt };
  }
  advance(next: Readonly<Point>, dt: number): void { this.setPosition(next); this.#age += dt; }
  reset(): void { this.#profile = null; this.#owner = null; this.#angle = this.#speed = this.#age = 0;
    this.resetIdentity(-1, { x: 0, y: 0 }); }
  snapshot(): ProjectileSnapshot { return { id: this.id, x: this.x, y: this.y, vx: this.vx, vy: this.vy,
    owner: this.owner, damage: this.damage, age: this.age, speed: this.#speed, radius: this.radius }; }
}
