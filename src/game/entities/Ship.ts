import { Entity } from '../core/Entity';
import type { ICollisionWorld } from '../core/CollisionWorld';
import type { ShipProfile } from '../contracts/GameConfig';
import type { Allegiance } from '../contracts/GameDomain';
import type { Point } from '../math/Geometry';
import { freezeConfiguration } from '../core/Immutable';

export interface ShipSnapshot extends Point {
  readonly id: number;
  readonly kind: string;
  readonly angle: number;
  readonly health: number;
  readonly maxHealth: number;
  readonly radius: number;
  readonly hullRadius: number;
  readonly alive: boolean;
  readonly speed: number;
}
export interface ShipReadView extends ShipSnapshot {
  readonly profile: ShipProfile;
  readonly allegiance: Allegiance;
}
export abstract class Ship extends Entity {
  readonly #profile: ShipProfile;
  readonly #view: ShipReadView;
  #angle: number;
  #health: number;
  #speed: number;
  protected constructor(id: number, position: Readonly<Point>, angle: number, profile: ShipProfile) {
    super(id, position);
    this.#profile = freezeConfiguration(structuredClone(profile));
    this.#angle = angle;
    this.#health = profile.health;
    this.#speed = profile.movement.initialSpeed;

    this.#view = ((entity) =>
      Object.freeze({
        get id() {
          return entity.id;
        },
        get x() {
          return entity.x;
        },
        get y() {
          return entity.y;
        },
        get kind() {
          return entity.kind;
        },
        get angle() {
          return entity.angle;
        },
        get health() {
          return entity.health;
        },
        get maxHealth() {
          return entity.maxHealth;
        },
        get radius() {
          return entity.radius;
        },
        get hullRadius() {
          return entity.hullRadius;
        },
        get alive() {
          return entity.alive;
        },
        get speed() {
          return entity.speed;
        },
        get profile() {
          return entity.profile;
        },
        get allegiance() {
          return entity.allegiance;
        },
      }))(this);
  }
  get view(): ShipReadView {
    return this.#view;
  }
  get profile(): ShipProfile {
    return this.#profile;
  }
  get kind(): string {
    return this.#profile.id;
  }
  get allegiance(): Allegiance {
    return this.#profile.allegiance;
  }
  get angle(): number {
    return this.#angle;
  }
  get health(): number {
    return this.#health;
  }
  get maxHealth(): number {
    return this.#profile.health;
  }
  get radius(): number {
    return this.#profile.radius;
  }
  get hullRadius(): number {
    return this.#profile.hullRadius;
  }
  get alive(): boolean {
    return this.#health > 0;
  }
  get speed(): number {
    return this.#speed;
  }
  applyDamage(amount: number): boolean {
    if (!Number.isFinite(amount) || amount < 0) throw new Error('Damage must be finite and non-negative.');
    if (!this.alive) return false;
    this.#health = Math.max(0, this.#health - amount);
    return !this.alive;
  }
  restoreHealth(amount: number): number {
    if (!Number.isFinite(amount) || amount < 0) throw new Error('Healing must be finite and non-negative.');
    if (!this.alive) return 0;
    const restored = Math.min(amount, this.maxHealth - this.#health);
    this.#health += restored;
    return restored;
  }
  protected steer(turn: number, dt: number): void {
    const maximum = this.#profile.movement.turnSpeed * dt;
    this.#angle += Math.max(-maximum, Math.min(maximum, turn));
  }
  protected sail(throttle: boolean, dt: number, world: ICollisionWorld): void {
    this.cruise(throttle ? this.#profile.movement.maxSpeed : 0, dt, world);
  }
  /** Accelerates or brakes towards `targetSpeed` using this profile's own rates, then moves. */
  protected cruise(targetSpeed: number, dt: number, world: ICollisionWorld): void {
    const movement = this.#profile.movement;
    const target = Math.max(0, Math.min(movement.maxSpeed, targetSpeed));
    this.#speed =
      this.#speed < target
        ? Math.min(target, this.#speed + movement.acceleration * dt)
        : Math.max(target, this.#speed - movement.deceleration * dt);
    const destination = world.move(this, this.radius, this.angle, this.#speed * dt);
    const travelled = Math.hypot(destination.x - this.x, destination.y - this.y);
    // Contact dissipates blocked forward motion; it must not store full speed into a wall.
    if (dt > 0 && travelled + world.contactTolerance < this.#speed * dt) {
      this.#speed = Math.min(this.#speed, travelled / dt);
    }
    this.setPosition(destination);
  }
  snapshot(): ShipSnapshot {
    return {
      id: this.id,
      kind: this.kind,
      x: this.x,
      y: this.y,
      angle: this.angle,
      health: this.health,
      maxHealth: this.maxHealth,
      radius: this.radius,
      hullRadius: this.hullRadius,
      alive: this.alive,
      speed: this.speed,
    };
  }
}
