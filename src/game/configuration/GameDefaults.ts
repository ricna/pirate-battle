import { freezeStaticConfiguration } from '../core/Immutable';
import { EffectKind, ShipKind } from '../contracts/GameDomain';

// Edit source defaults here. Options are deliberately limited to the challenge's public settings.
export class GameDefaults {
  private constructor() {}
  static readonly Version = 'arena_00-v1/balance-v8';
  static readonly Seed = 20261012;
  static readonly FixedStep = 1 / 60;
  static readonly PlayerSpawn = { x: 1024, y: 960 };
  // Clockwise around the arena border, then open-water channels between the islands.
  static readonly SpawnPoints = [
    { x: 64, y: 64 },
    { x: 384, y: 64 },
    { x: 704, y: 64 },
    { x: 1024, y: 64 },
    { x: 1344, y: 64 },
    { x: 1984, y: 64 },
    { x: 1984, y: 320 },
    { x: 1984, y: 576 },
    { x: 1984, y: 832 },
    { x: 1984, y: 1088 },
    { x: 1504, y: 1088 },
    { x: 1024, y: 1088 },
    { x: 544, y: 1088 },
    { x: 64, y: 1088 },
    { x: 64, y: 768 },
    { x: 64, y: 448 },
    { x: 384, y: 400 },
    { x: 1024, y: 300 },
    { x: 1480, y: 200 },
    { x: 1728, y: 700 },
    { x: 700, y: 720 },
  ];
  static readonly Spawning = {
    /** Enemies already sailing when the battle starts. */
    initialCount: 3,
    /** Enemies sunk, by any cause, that call in one immediate extra enemy on top of the interval spawns. */
    sunkEnemiesPerReinforcement: 1,
    maxCount: 28,
    safeDistance: 440,
    hullSeparation: 1.25,
    /** A spawn picks at random among this many safe points farthest from the player. */
    farthestPointChoices: 4,
    /** The most recently used points a spawn may not reuse, so enemies never queue from one place. */
    recentPointsExcluded: 2,
    initialSequence: [ShipKind.Chaser, ShipKind.Shooter],
    weights: [
      { profileId: ShipKind.Shooter, weight: 0.5 },
      { profileId: ShipKind.Chaser, weight: 0.5 },
    ],
  };
  static readonly Pools = {
    projectiles: { initialCapacity: 32, growthSize: 16, maxCapacity: 192 },
    effects: { initialCapacity: 16, growthSize: 16, maxCapacity: 256 },
  };
  static readonly Effects = {
    [EffectKind.Muzzle]: { duration: 0.15, size: 27, fade: 0.7, sprites: ['effects/explosion_1'] },
    [EffectKind.Impact]: { duration: 0.2, size: 35, fade: 0.7, sprites: ['effects/explosion_1'] },
    [EffectKind.Explosion]: {
      duration: 0.6,
      size: 90,
      fade: 0.7,
      sprites: ['effects/explosion_1', 'effects/explosion_2', 'effects/explosion_3'],
    },
  };
  static readonly Rules = {
    pointsPerKill: 1,
    lowHealthRatio: 0.3,
    timeWarning: 10,
    clockTolerance: 1e-8,
    geometryTolerance: 1e-9,
    navigationInflation: 0.15,
    movementStepRadiusRatio: 0.5,
  };
  static readonly Random = { multiplier: 1664525, increment: 1013904223, modulus: 4294967296 };
  static readonly Runtime = {
    maxFrameSeconds: 0.25,
    hudIntervalMs: 250,
    maxResolution: 2,
    staticMapResolution: 1,
    profileWarmupSeconds: 5,
    maxFrameSamples: 20000,
    mapProgressWeight: 0.6,
    background: '#123744',
    maxTestAdvance: 180,
  };
}
freezeStaticConfiguration(GameDefaults);
