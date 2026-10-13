import { freezeStaticConfiguration } from '../core/Immutable';
import { Allegiance, ShipKind } from '../domain';
import { ShipVisualConfig } from './ShipVisualConfig';
import type { ShipProfile } from './types';

export class EnemyChaserConfig {
  private constructor() {}
  static readonly Default: ShipProfile = {
    id: ShipKind.Chaser, allegiance: Allegiance.Enemy, health: 40, radius: 30, hullRadius: 66,
    movement: { initialSpeed: 0, maxSpeed: 125, acceleration: 1200, deceleration: 1800, turnSpeed: 2.1 },
    weapons: [], visual: ShipVisualConfig.Chaser,
    ai: {
      routeInterval: 0.75, waypointArrival: 40, movementCone: 1.2, firingCone: 0.18, range: 0, ramDamage: 25,
      lookAhead: 150, avoidanceStep: 0.3, turningSpeedRatio: 0.3,
      separationDistance: 170, separationWeight: 1.2,
      stuckSeconds: 1, stuckDistance: 20, recoverySeconds: 0.9, headingResponse: 6,
    },
  };
}
freezeStaticConfiguration(EnemyChaserConfig);
