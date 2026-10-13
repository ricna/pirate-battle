import type { Action, Allegiance, EffectKind, GameEvent } from '../domain';
import type { Point } from '../geometry';

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
  readonly healthFrame: string; readonly healthMetadata: 'health_frame' | 'enemy_health_frame';
  readonly healthScale: number; readonly healthOffsetY: number;
  readonly healthFills: readonly { readonly minimumHealthRatio: number; readonly sprite: string }[];
  readonly fireThreshold: number; readonly fireSprites: readonly string[];
  readonly fireWidth: number; readonly fireHeight: number; readonly fireFramesPerSecond: number;
}
export interface AiProfile {
  readonly routeInterval: number; readonly waypointArrival: number;
  readonly movementCone: number; readonly firingCone: number; readonly range: number; readonly ramDamage: number;
}
export interface ShipProfile {
  readonly id: string; readonly allegiance: Allegiance; readonly health: number; readonly radius: number;
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
  readonly spawning: { readonly maxCount: number; readonly safeDistance: number; readonly separationRadii: number;
    readonly initialSequence: readonly string[]; readonly weights: readonly { readonly profileId: string; readonly weight: number }[] };
  readonly spawnPoints: readonly Readonly<Point>[];
  readonly pools: { readonly projectiles: PoolProfile; readonly effects: PoolProfile };
  readonly effects: Readonly<Record<EffectKind, EffectProfile>>;
  readonly rules: { readonly pointsPerKill: number; readonly lowHealthRatio: number; readonly timeWarning: number;
    readonly clockTolerance: number; readonly geometryTolerance: number; readonly navigationInflation: number; readonly movementStepRadiusRatio: number };
  readonly random: { readonly multiplier: number; readonly increment: number; readonly modulus: number };
  readonly runtime: { readonly maxFrameSeconds: number; readonly hudIntervalMs: number; readonly maxResolution: number;
    readonly staticMapResolution: number;
    readonly profileWarmupSeconds: number; readonly maxFrameSamples: number; readonly mapProgressWeight: number;
    readonly background: string; readonly maxTestAdvance: number };
}
