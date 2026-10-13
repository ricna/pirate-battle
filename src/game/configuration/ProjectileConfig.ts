import { freezeStaticConfiguration } from '../core/Immutable';
import type { ProjectileProfile } from './types';

export class ProjectileConfig {
  private constructor() {}
  static readonly PlayerFront: ProjectileProfile = {
    id: 'player-front-ball', damage: 25, radius: 5, lifetime: 1.6,
    initialSpeed: 780, maxSpeed: 780, acceleration: 0, deceleration: 0,
    sprite: 'ship_parts/cannon_ball', width: 12, height: 12,
  };
  static readonly PlayerBroadside: ProjectileProfile = { ...ProjectileConfig.PlayerFront, id: 'player-broadside-ball', damage: 22 };
  static readonly Enemy: ProjectileProfile = { ...ProjectileConfig.PlayerFront, id: 'enemy-ball', damage: 12, initialSpeed: 340, maxSpeed: 340 };
}
freezeStaticConfiguration(ProjectileConfig);
