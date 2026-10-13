import { PlayerShip } from '../entities/PlayerShip';
import type { EnemyShip } from '../entities/EnemyShip';
import type { GameConfig, ShipProfile } from '../configuration/types';
import type { Point } from '../geometry';
import { freezeConfiguration } from '../core/Immutable';

export interface EnemyRegistration {
  readonly profile: ShipProfile;
  readonly constructor: new (id: number, point: Readonly<Point>, angle: number, profile: ShipProfile) => EnemyShip;
}
export interface IShipFactory {
  createPlayer(id: number): PlayerShip;
  createEnemy(profileId: string, id: number, point: Readonly<Point>, angle: number): EnemyShip;
}
export class ShipFactory implements IShipFactory {
  readonly #config: GameConfig; readonly #constructors = new Map<string, EnemyRegistration['constructor']>();
  constructor(config: GameConfig, registrations: readonly EnemyRegistration[]) {
    this.#config = freezeConfiguration(structuredClone(config));
    for (const registration of registrations) {
      if (this.#constructors.has(registration.profile.id)) throw new Error('Duplicate enemy factory registration.');
      this.#constructors.set(registration.profile.id, registration.constructor);
    }
    for (const id of Object.keys(config.enemies)) if (!this.#constructors.has(id)) throw new Error(`Missing factory for enemy ${id}.`);
  }
  createPlayer(id: number): PlayerShip { return new PlayerShip(id, this.#config.playerSpawn, this.#config.player); }
  createEnemy(profileId: string, id: number, point: Readonly<Point>, angle: number): EnemyShip {
    const constructor = this.#constructors.get(profileId); const profile = this.#config.enemies[profileId];
    if (!constructor || !profile) throw new Error(`Enemy ${profileId} is not registered.`);
    return new constructor(id, point, angle, profile);
  }
}
