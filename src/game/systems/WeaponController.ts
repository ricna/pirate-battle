import type { WeaponProfile } from '../configuration/types';
import type { Action } from '../domain';
import type { Ship } from '../entities/Ship';
import type { IProjectileEmitter } from './ProjectileSystem';
import type { Point } from '../geometry';

/** Independent mount cooldowns; pool exhaustion defers the complete salvo, never a partial broadside. */
export class WeaponController {
  readonly #ship: Ship; readonly #emitter: IProjectileEmitter; readonly #tolerance: number;
  readonly #cooldowns = new Map<Action, number>(); readonly #mounts = new Map<Action, WeaponProfile>();
  constructor(ship: Ship, emitter: IProjectileEmitter, tolerance: number) {
    this.#ship = ship; this.#emitter = emitter; this.#tolerance = tolerance;
    for (const weapon of ship.profile.weapons) this.#mounts.set(weapon.id, weapon);
  }
  tryFire(action: Action, elapsed: number, fired: (origin: Point, angle: number, weapon: WeaponProfile) => void): boolean {
    const mount = this.#mounts.get(action);
    if (!mount || !this.#ship.alive || elapsed + this.#tolerance < (this.#cooldowns.get(action) ?? 0)
      || this.#emitter.available < mount.longitudinalOffsets.length) return false;
    const angle = this.#ship.angle + mount.angleOffset;
    const origin = { x: this.#ship.x + Math.sin(angle) * mount.muzzleOffset,
      y: this.#ship.y - Math.cos(angle) * mount.muzzleOffset };
    for (const shift of mount.longitudinalOffsets) {
      const success = this.#emitter.emit({ x: origin.x + Math.sin(this.#ship.angle) * shift,
        y: origin.y - Math.cos(this.#ship.angle) * shift }, angle, this.#ship.allegiance, mount.projectile);
      if (!success) throw new Error('Reserved projectile pool capacity was unexpectedly exhausted.');
    }
    this.#cooldowns.set(action, elapsed + mount.cooldown); fired(origin, angle, mount); return true;
  }
  readiness(elapsed: number) {
    return Object.freeze([...this.#mounts.values()].map((mount) => {
      const remaining = Math.max(0, (this.#cooldowns.get(mount.id) ?? 0) - elapsed);
      return Object.freeze({ id: mount.id, ready: remaining <= this.#tolerance,
        remaining, progress: Math.max(0, 1 - remaining / mount.cooldown) });
    }));
  }
}
