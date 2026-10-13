import type { Action, Allegiance, EffectKind, GameEvent } from './GameDomain';
import type { Point } from '../math/Geometry';
import type { CollisionProfile } from '../configuration/CollisionConfig';
import type { PresentationProfile } from '../configuration/PresentationConfig';

export interface MovementProfile {
  readonly initialSpeed: number; readonly maxSpeed: number;
  readonly acceleration: number; readonly deceleration: number; readonly turnSpeed: number;
}
export interface ProjectileProfile {
  readonly id: string; readonly damage: number; readonly radius: number; readonly lifetime: number;
  readonly initialSpeed: number; readonly maxSpeed: number; readonly acceleration: number; readonly deceleration: number;
  readonly sprite: string; readonly width: number; readonly height: number;
}
export interface WeaponProfile {
  readonly id: Action; readonly angleOffset: number; readonly muzzleOffset: number;
  readonly longitudinalOffsets: readonly number[]; readonly cooldown: number;
  readonly event: GameEvent; readonly projectile: ProjectileProfile;
}
export interface ShipVisualProfile {
  readonly width: number; readonly height: number; readonly angleOffset: number;
  readonly damageStages: readonly { readonly minimumHealthRatio: number; readonly sprite: string }[];
  readonly wreckSprite: string;
  readonly healthFrame: string; readonly healthMetadata: 'health_frame' | 'enemy_health_frame';
  readonly healthScale: number; readonly healthOffsetY: number;
  readonly healthFills: readonly { readonly minimumHealthRatio: number; readonly sprite: string }[];
  readonly fireThreshold: number; readonly fireSprites: readonly string[];
  readonly fireWidth: number; readonly fireHeight: number; readonly fireFramesPerSecond: number;
}
export interface AiProfile {
  readonly routeInterval: number; readonly waypointArrival: number;
  readonly movementCone: number; readonly firingCone: number; readonly range: number; readonly ramDamage: number;
  /** Obstacle probe distance in world pixels. */
  readonly lookAhead: number;
  /** Angular spacing, in radians, between candidate avoidance headings. */
  readonly avoidanceStep: number;
  /** Fraction of maximum speed kept at a turn of `movementCone` or more, and in front of a coast. */
  readonly turningSpeedRatio: number;
  /** Distance in world pixels under which another enemy pushes this heading away. */
  readonly separationDistance: number;
  readonly separationWeight: number;
  /** Progress window in seconds and the minimum travel in world pixels that counts as progress. */
  readonly stuckSeconds: number; readonly stuckDistance: number;
  /** Seconds spent sailing towards open water once stuck, before replanning. */
  readonly recoverySeconds: number;
  /** Rate (1/second) at which the steered heading follows the newly chosen heading. */
  readonly headingResponse: number;
}
export interface ShipProfile {
  readonly id: string; readonly allegiance: Allegiance; readonly health: number; readonly radius: number;
  readonly hullRadius: number;
  readonly movement: MovementProfile; readonly weapons: readonly WeaponProfile[];
  readonly visual: ShipVisualProfile; readonly ai: AiProfile | null;
}
export interface PoolProfile { readonly initialCapacity: number; readonly growthSize: number; readonly maxCapacity: number }
export interface EffectProfile {
  readonly duration: number; readonly size: number; readonly fade: number; readonly sprites: readonly string[];
}
export interface GameConfig {
  readonly version: string; readonly seed: number; readonly fixedStep: number;
  readonly sessionSeconds: number; readonly spawnSeconds: number;
  readonly player: ShipProfile; readonly playerSpawn: Readonly<Point>;
  readonly enemies: Readonly<Record<string, ShipProfile>>;
  readonly spawning: { readonly maxCount: number; readonly safeDistance: number; readonly hullSeparation: number;
    readonly initialSequence: readonly string[]; readonly weights: readonly { readonly profileId: string; readonly weight: number }[] };
  readonly spawnPoints: readonly Readonly<Point>[];
  readonly pools: { readonly projectiles: PoolProfile; readonly effects: PoolProfile };
  readonly collision: CollisionProfile;
  readonly presentation: PresentationProfile;
  readonly effects: Readonly<Record<EffectKind, EffectProfile>>;
  readonly rules: { readonly pointsPerKill: number; readonly lowHealthRatio: number; readonly timeWarning: number;
    readonly clockTolerance: number; readonly geometryTolerance: number; readonly navigationInflation: number; readonly movementStepRadiusRatio: number };
  readonly random: { readonly multiplier: number; readonly increment: number; readonly modulus: number };
  readonly runtime: { readonly maxFrameSeconds: number; readonly hudIntervalMs: number; readonly maxResolution: number;
    readonly staticMapResolution: number;
    readonly profileWarmupSeconds: number; readonly maxFrameSamples: number; readonly mapProgressWeight: number;
    readonly background: string; readonly maxTestAdvance: number };
}
