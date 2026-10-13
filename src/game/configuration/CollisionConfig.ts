import { freezeStaticConfiguration } from '../core/Immutable';

export interface CollisionProfile {
  readonly separation: number;
  readonly slideIterations: number;
  readonly minimumImpactSpeed: number;
  readonly impactCooldown: number;
}

export class CollisionConfig {
  private constructor() {}

  static readonly Default: CollisionProfile = {
    separation: 0.01,
    slideIterations: 4,
    minimumImpactSpeed: 20,
    impactCooldown: 0.65,
  };
}

freezeStaticConfiguration(CollisionConfig);
