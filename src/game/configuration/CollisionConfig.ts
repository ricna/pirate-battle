import { freezeStaticConfiguration } from '../core/Immutable';
import { Allegiance } from '../contracts/GameDomain';

export interface CollisionProfile {
  readonly separation: number;
  readonly slideIterations: number;
  readonly minimumImpactSpeed: number;
  readonly impactCooldown: number;
  /**
   * Hull damage for each significant island collision (at least `minimumImpactSpeed`, at most once per
   * `impactCooldown` per ship and island contact). It is never credited as a kill.
   */
  readonly islandImpactDamage: Readonly<Record<Allegiance, number>>;
}

export class CollisionConfig {
  private constructor() {}

  static readonly Default: CollisionProfile = {
    separation: 0.01,
    slideIterations: 4,
    minimumImpactSpeed: 20,
    impactCooldown: 0.65,
    islandImpactDamage: { [Allegiance.Player]: 1, [Allegiance.Enemy]: 0 },
  };
}

freezeStaticConfiguration(CollisionConfig);
