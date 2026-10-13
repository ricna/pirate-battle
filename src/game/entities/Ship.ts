import { Entity } from '../core/Entity';
import type { ICollisionWorld } from '../core/CollisionWorld';
import type { ShipProfile } from '../configuration/types';
import type { Allegiance } from '../domain';
import type { Point } from '../geometry';
import { freezeConfiguration } from '../core/Immutable';

export interface ShipSnapshot extends Point {
  readonly id: number; readonly kind: string; readonly angle: number; readonly health: number;
  readonly maxHealth: number; readonly radius: number; readonly alive: boolean; readonly speed: number;
}
export interface ShipReadView extends ShipSnapshot { readonly profile: ShipProfile; readonly allegiance: Allegiance }
export abstract class Ship extends Entity {
  readonly #profile: ShipProfile;
  readonly #view: ShipReadView;
  #angle: number; #health: number; #speed: number;
  protected constructor(id: number, position: Readonly<Point>, angle: number, profile: ShipProfile) {
    super(id, position); this.#profile = freezeConfiguration(structuredClone(profile)); this.#angle = angle;
    this.#health = profile.health; this.#speed = profile.movement.initialSpeed;

    this.#view = ((entity) => Object.freeze({
      get id() { return entity.id; }, get x() { return entity.x; }, get y() { return entity.y; },
      get kind() { return entity.kind; }, get angle() { return entity.angle; }, get health() { return entity.health; },
      get maxHealth() { return entity.maxHealth; }, get radius() { return entity.radius; }, get alive() { return entity.alive; },
      get speed() { return entity.speed; }, get profile() { return entity.profile; }, get allegiance() { return entity.allegiance; },
    }))(this);
  }
  get view(): ShipReadView { return this.#view; }
  get profile(): ShipProfile { return this.#profile; }
  get kind(): string { return this.#profile.id; }
  get allegiance(): Allegiance { return this.#profile.allegiance; }
  get angle(): number { return this.#angle; }
  get health(): number { return this.#health; }
  get maxHealth(): number { return this.#profile.health; }
  get radius(): number { return this.#profile.radius; }
  get alive(): boolean { return this.#health > 0; }
  get speed(): number { return this.#speed; }
  applyDamage(amount: number): boolean {
    if (!Number.isFinite(amount) || amount < 0) throw new Error('Damage must be finite and non-negative.');
    if (!this.alive) return false;
    this.#health = Math.max(0, this.#health - amount); return !this.alive;
  }
  protected steer(turn: number, dt: number): void {
    const maximum = this.#profile.movement.turnSpeed * dt;
    this.#angle += Math.max(-maximum, Math.min(maximum, turn));
  }
  protected sail(throttle: boolean, dt: number, world: ICollisionWorld): void {
    const movement = this.#profile.movement;
    this.#speed = throttle ? Math.min(movement.maxSpeed, this.#speed + movement.acceleration * dt)
      : Math.max(0, this.#speed - movement.deceleration * dt);
    this.setPosition(world.move(this, this.radius, this.angle, this.#speed * dt));
  }
  snapshot(): ShipSnapshot { return { id: this.id, kind: this.kind, x: this.x, y: this.y, angle: this.angle,
    health: this.health, maxHealth: this.maxHealth, radius: this.radius, alive: this.alive, speed: this.speed }; }
}
