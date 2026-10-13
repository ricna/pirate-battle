import { Action } from '../domain';
import type { ICollisionWorld } from '../core/CollisionWorld';
import type { ShipProfile } from '../configuration/types';
import type { Point } from '../geometry';
import { Ship } from './Ship';

export class PlayerShip extends Ship {
  constructor(id: number, position: Readonly<Point>, profile: ShipProfile) { super(id, position, 0, profile); }
  update(dt: number, input: ReadonlySet<Action>, world: ICollisionWorld): void {
    if (!this.alive) return;
    const direction = Number(input.has(Action.Right)) - Number(input.has(Action.Left));
    this.steer(direction * this.profile.movement.turnSpeed * dt, dt);
    this.sail(input.has(Action.Forward), dt, world);
  }
}
