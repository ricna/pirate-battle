import { freezeStaticConfiguration } from '../core/Immutable';
import { EffectKind, ShipKind } from '../domain';

// Edit source defaults here. Options are deliberately limited to the challenge's public settings.
export class GameDefaults {
  private constructor() {}
  static readonly Options = { sessionSeconds: 120, spawnSeconds: 5, sound: true, volume: 0.5 };
  static readonly Limits = { session: [60, 180], spawn: [2, 10], volume: [0, 1] } as const;
  static readonly OptionSteps = { session: 1, spawn: 0.5, volume: 0.05 };
  static readonly Version = 'arena_00-v1/balance-v2';
  static readonly Seed = 20261012;
  static readonly FixedStep = 1 / 60;
  static readonly PlayerSpawn = { x: 1024, y: 960 };
  static readonly SpawnPoints = [{ x: 64, y: 64 }, { x: 1024, y: 64 }, { x: 1984, y: 64 },
    { x: 1984, y: 576 }, { x: 1984, y: 1088 }, { x: 1024, y: 1088 }, { x: 64, y: 1088 }, { x: 64, y: 576 }];
  static readonly Spawning = { maxCount: 28, safeDistance: 440, separationRadii: 3,
    initialSequence: [ShipKind.Chaser, ShipKind.Shooter],
    weights: [{ profileId: ShipKind.Shooter, weight: 0.5 }, { profileId: ShipKind.Chaser, weight: 0.5 }] };
  static readonly Pools = {
    projectiles: { initialCapacity: 32, growthSize: 16, maxCapacity: 192 },
    effects: { initialCapacity: 16, growthSize: 16, maxCapacity: 256 },
  };
  static readonly Effects = {
    [EffectKind.Muzzle]: { duration: 0.15, size: 27, fade: 0.7, sprites: ['effects/explosion_1'] },
    [EffectKind.Impact]: { duration: 0.2, size: 35, fade: 0.7, sprites: ['effects/explosion_1'] },
    [EffectKind.Explosion]: { duration: 0.6, size: 90, fade: 0.7, sprites: ['effects/explosion_1', 'effects/explosion_2', 'effects/explosion_3'] },
  };
  static readonly Rules = { pointsPerKill: 1, lowHealthRatio: 0.3, timeWarning: 10,
    clockTolerance: 1e-8, geometryTolerance: 1e-9, navigationInflation: 0.15, movementStepRadiusRatio: 0.5 };
  static readonly Random = { multiplier: 1664525, increment: 1013904223, modulus: 4294967296 };
  static readonly Runtime = { maxFrameSeconds: 0.25, hudIntervalMs: 250, maxResolution: 2,
    profileWarmupSeconds: 5, maxFrameSamples: 20000, mapProgressWeight: 0.6,
    background: '#123744', maxTestAdvance: 180 };
}
freezeStaticConfiguration(GameDefaults);
