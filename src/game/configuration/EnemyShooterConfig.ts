import { freezeStaticConfiguration } from '../core/Immutable';
import { Action, Allegiance, GameEvent, ShipKind } from '../contracts/GameDomain';
import { ProjectileConfig } from './ProjectileConfig';
import { ShipVisualConfig } from './ShipVisualConfig';
import type { ShipProfile } from '../contracts/GameConfig';

export class EnemyShooterConfig {
  private constructor() {}
  static readonly Default: ShipProfile = {
    id: ShipKind.Shooter, allegiance: Allegiance.Enemy, health: 65, radius: 30, hullRadius: 66,
    movement: { initialSpeed: 0, maxSpeed: 100, acceleration: 1000, deceleration: 1600, turnSpeed: 2.1 },
    weapons: [{ id: Action.Front, angleOffset: 0, muzzleOffset: 58, longitudinalOffsets: [0], cooldown: 2.2,
      event: GameEvent.EnemyShot, projectile: ProjectileConfig.Enemy }],
    visual: ShipVisualConfig.Shooter,
    ai: {
      routeInterval: 0.75, waypointArrival: 40, movementCone: 1.2, firingCone: 0.18, range: 580, ramDamage: 0,
      lookAhead: 150, avoidanceStep: 0.3, turningSpeedRatio: 0.3,
      separationDistance: 170, separationWeight: 1.2,
      stuckSeconds: 1, stuckDistance: 20, recoverySeconds: 0.9, headingResponse: 6,
    },
  };
}
freezeStaticConfiguration(EnemyShooterConfig);
