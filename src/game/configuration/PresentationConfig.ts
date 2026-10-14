import { freezeStaticConfiguration } from '../core/Immutable';
import type { PoolProfile } from '../contracts/GameConfig';

export const ParticleKind = {
  Crew: 'crew',
  Debris: 'debris',
  Trail: 'trail',
  Splash: 'splash',
  Wreck: 'wreck',
} as const;
export type ParticleKind = (typeof ParticleKind)[keyof typeof ParticleKind];

export interface ParticleProfile {
  readonly sprites: readonly string[];
  readonly width: number;
  readonly height: number;
  readonly lifetime: number;
  readonly alpha: number;
  readonly fadeStart: number;
  readonly drag: number;
  readonly spin: number;
  readonly bob: number;
  readonly bobFrequency: number;
  readonly settleSeconds: number;
  readonly waterOnly: boolean;
  readonly waterRadius: number;
}

export interface PresentationProfile {
  readonly seedSalt: number;
  readonly eventHistoryCapacity: number;
  readonly particles: PoolProfile;
  readonly crewPool: PoolProfile;
  readonly profiles: Readonly<Record<ParticleKind, ParticleProfile>>;
  readonly crew: {
    readonly minimum: number;
    readonly maximum: number;
    readonly scatterSpeed: number;
    readonly driftSpeed: number;
    readonly foamSprite: string;
    readonly foamScale: number;
    readonly foamPulse: number;
  };
  readonly debris: { readonly hitCount: number; readonly sunkCount: number; readonly speed: number };
  readonly trail: { readonly interval: number; readonly offset: number };
  /** Owner-authored ship trail stretched along each moving ship's recent stern path. */
  readonly shipTrail: {
    readonly sprite: string;
    /** Seconds between stern samples while the ship moves. */
    readonly sampleSeconds: number;
    /** Seconds a stern sample stays in the trail; the trail fades and shortens as samples expire. */
    readonly lifetime: number;
    /** Fraction of the ship's maximum speed below which no new samples are taken. */
    readonly minimumSpeedRatio: number;
    /** Stern distance from the hull centre, as a fraction of the ship's visual length. */
    readonly sternRatio: number;
    /** Trail thickness in logical world pixels. */
    readonly width: number;
    readonly alpha: number;
    /** Fixed vertex count of each rendered rope; the stern path is resampled evenly along its length. */
    readonly ropePoints: number;
    /** Bounded trails; the visual rope pool uses the same capacity. */
    readonly pool: PoolProfile;
  };
  readonly recoil: { readonly distance: number; readonly duration: number };
  readonly damage: {
    readonly flashSeconds: number;
    readonly flashTint: number;
    readonly labelColor: number;
    readonly labelOffsetY: number;
    readonly shakeSeconds: number;
    readonly shakeAmplitude: number;
    readonly ramMultiplier: number;
    readonly shakeFrequency: number;
  };
  readonly score: {
    readonly prefix: string;
    readonly lifetime: number;
    readonly rise: number;
    readonly offsetY: number;
    readonly fadeStart: number;
    readonly fontFamily: string;
    readonly fontSize: number;
    readonly color: number;
    readonly maxCount: number;
    readonly hudSeconds: number;
  };
  readonly terminalSeconds: number;
  readonly victory: { readonly seconds: number; readonly fadeOutSeconds: number };
  readonly rescue: { readonly color: number; readonly offsetY: number; readonly combineSeconds: number };
  readonly terminalFadeInSeconds: number;
  readonly resultFadeSeconds: number;
  readonly resultCountSeconds: number;
  readonly water: {
    readonly layer: string;
    readonly gid: number;
    readonly sprite: string;
    readonly speedX: number;
    readonly speedY: number;
    readonly overscan: number;
  };
}

const particleBase: ParticleProfile = {
  sprites: [],
  width: 24,
  height: 24,
  lifetime: 1,
  alpha: 1,
  fadeStart: 0.5,
  drag: 0,
  spin: 0,
  bob: 0,
  bobFrequency: 1,
  settleSeconds: 0,
  waterOnly: false,
  waterRadius: 2,
};

export class PresentationConfig {
  private constructor() {}

  static readonly Default: PresentationProfile = {
    seedSalt: 0x5f3759df,
    eventHistoryCapacity: 64,
    particles: { initialCapacity: 96, growthSize: 64, maxCapacity: 512 },
    crewPool: { initialCapacity: 32, growthSize: 32, maxCapacity: 352 },
    profiles: {
      [ParticleKind.Crew]: {
        ...particleBase,
        sprites: [
          'ship_parts/crew_1',
          'ship_parts/crew_2',
          'ship_parts/crew_3',
          'ship_parts/crew_4',
          'ship_parts/crew_5',
          'ship_parts/crew_6',
        ],
        width: 28,
        height: 28,
        lifetime: 10,
        fadeStart: 0.8,
        settleSeconds: 0.4,
        bob: 1.8,
        bobFrequency: 1.3,
        waterOnly: true,
        waterRadius: 16,
      },
      [ParticleKind.Debris]: {
        ...particleBase,
        sprites: ['ship_parts/wood_1', 'ship_parts/wood_2', 'ship_parts/wood_3', 'ship_parts/wood_4'],
        width: 26,
        height: 12,
        lifetime: 1.8,
        drag: 3,
        spin: 4,
        waterOnly: true,
      },
      [ParticleKind.Trail]: {
        ...particleBase,
        sprites: ['authored/projectile_trail'],
        width: 4,
        height: 52,
        lifetime: 0.13,
        alpha: 0.7,
        fadeStart: 0,
      },
      [ParticleKind.Splash]: {
        ...particleBase,
        sprites: ['authored/water_splash'],
        width: 45,
        height: 45,
        lifetime: 0.45,
        fadeStart: 0.1,
      },
      [ParticleKind.Wreck]: {
        ...particleBase,
        sprites: ['ships/ship_19', 'ships/ship_20', 'ships/ship_21'],
        width: 67,
        height: 113,
        lifetime: 2.4,
        fadeStart: 0.2,
        waterOnly: true,
      },
    },
    crew: {
      minimum: 2,
      maximum: 5,
      scatterSpeed: 90,
      driftSpeed: 2.2,
      foamSprite: 'authored/foam_ring',
      foamScale: 1.8,
      foamPulse: 0.05,
    },
    debris: { hitCount: 4, sunkCount: 10, speed: 160 },
    trail: { interval: 0.05, offset: 29 },
    shipTrail: {
      sprite: 'authored/ship_trail',
      sampleSeconds: 0.05,
      lifetime: 0.9,
      minimumSpeedRatio: 0.15,
      sternRatio: 0.4,
      width: 26,
      alpha: 0.9,
      ropePoints: 16,
      pool: { initialCapacity: 8, growthSize: 8, maxCapacity: 64 },
    },
    recoil: { distance: 5, duration: 0.14 },
    damage: {
      flashSeconds: 0.16,
      flashTint: 0xffa26b,
      labelColor: 0xffc9a3,
      labelOffsetY: -28,
      shakeSeconds: 0.25,
      shakeAmplitude: 4,
      ramMultiplier: 1.6,
      shakeFrequency: 48,
    },
    score: {
      prefix: '+',
      lifetime: 0.9,
      rise: 48,
      offsetY: -74,
      fadeStart: 0.45,
      fontFamily: 'Georgia',
      fontSize: 32,
      color: 0xffdf7c,
      maxCount: 32,
      hudSeconds: 0.45,
    },
    terminalSeconds: 3,
    victory: { seconds: 4, fadeOutSeconds: 2 },
    rescue: { color: 0x68ef83, offsetY: -28, combineSeconds: 0.35 },
    terminalFadeInSeconds: 1,
    resultFadeSeconds: 1,
    resultCountSeconds: 0.7,
    water: { layer: 'water', gid: 73, sprite: 'tiles/tile_73', speedX: 2.5, speedY: 1.5, overscan: 12 },
  };
}

freezeStaticConfiguration(PresentationConfig);
