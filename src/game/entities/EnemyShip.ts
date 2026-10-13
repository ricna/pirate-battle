import type { ICollisionWorld } from '../core/CollisionWorld';
import type { AiProfile, ShipProfile } from '../configuration/types';
import { angleDifference, angleTo, distance } from '../geometry';
import type { Point } from '../geometry';
import type { Action } from '../domain';
import { Ship } from './Ship';

export interface EnemyContext {
  readonly target: Ship; readonly world: ICollisionWorld; readonly elapsed: number; readonly dt: number;
  fire(ship: EnemyShip, action: Action): void;
  damage(ship: Ship, amount: number, credited: boolean): void;
}
export abstract class EnemyShip extends Ship {
  readonly #ai: AiProfile; #routeAt = 0; #route: Point[] = [];
  constructor(id: number, point: Readonly<Point>, angle: number, profile: ShipProfile) {
    super(id, point, angle, profile);
    if (!this.profile.ai) throw new Error(`Enemy ${profile.id} requires an AI profile.`);
    this.#ai = this.profile.ai;
  }
  protected get ai(): AiProfile { return this.#ai; }
  protected follow(context: EnemyContext, stopInRange: boolean): { sight: boolean; inRange: boolean; turn: number } {
    const { target, world, dt, elapsed } = context;
    const sight = world.isVisible(this, target, this.radius);
    let waypoint: Point = target;
    if (!sight) {
      if (elapsed >= this.#routeAt) { this.#route = world.route(this, target, this.radius); this.#routeAt = elapsed + this.#ai.routeInterval; }
      while (this.#route.length && distance(this, this.#route[0]!) < this.#ai.waypointArrival) this.#route.shift();
      waypoint = this.#route[0] ?? this;
    }
    const turn = angleDifference(angleTo(this, waypoint), this.angle);
    const inRange = sight && distance(this, target) <= this.#ai.range;
    this.steer(turn, dt);
    this.sail(!(stopInRange && inRange) && Math.abs(turn) < this.#ai.movementCone, dt, world);
    return { sight, inRange, turn };
  }
  abstract update(context: EnemyContext): void;
}
