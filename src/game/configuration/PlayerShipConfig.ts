import { freezeStaticConfiguration } from '../core/Immutable';
import { Action, Allegiance, GameEvent, ShipKind } from '../domain';
import { ProjectileConfig } from './ProjectileConfig';
import { ShipVisualConfig } from './ShipVisualConfig';
import type { ShipProfile } from './types';

export class PlayerShipConfig {
  private constructor() {}
  static readonly Default: ShipProfile = {
    id: ShipKind.Player, allegiance: Allegiance.Player, health: 100, radius: 34, hullRadius: 66,
    movement: { initialSpeed: 0, maxSpeed: 230, acceleration: 230, deceleration: 115, turnSpeed: 2.6 },
    weapons: [
      { id: Action.Front, angleOffset: 0, muzzleOffset: 58, longitudinalOffsets: [0], cooldown: 0.35,
        event: GameEvent.FrontShot, projectile: ProjectileConfig.PlayerFront },
      { id: Action.Port, angleOffset: -Math.PI / 2, muzzleOffset: 38, longitudinalOffsets: [-22, 0, 22], cooldown: 1.1,
        event: GameEvent.SideShot, projectile: ProjectileConfig.PlayerBroadside },
      { id: Action.Starboard, angleOffset: Math.PI / 2, muzzleOffset: 38, longitudinalOffsets: [-22, 0, 22], cooldown: 1.1,
        event: GameEvent.SideShot, projectile: ProjectileConfig.PlayerBroadside },
    ],
    visual: ShipVisualConfig.Player, ai: null,
  };
}
freezeStaticConfiguration(PlayerShipConfig);
