import type { GameConfig } from './GameConfig';
import type { GameManager, Snapshot } from '../runtime/GameManager';
import type { ArenaRenderer } from '../rendering/ArenaRenderer';
import type { AudioManager } from '../audio/AudioManager';

/** Detached observations only; instrumentation cannot write combat state. */
export interface GameObservation {
  snapshot: Snapshot;
  player: ReturnType<GameManager['observation']>['player'];
  enemies: ReturnType<GameManager['observation']>['enemies'];
  projectiles: ReturnType<GameManager['observation']>['projectiles'];
  pools: ReturnType<GameManager['poolStatistics']>;
  renderPools: ReturnType<ArenaRenderer['poolStatistics']>;
  effects: number;
  config: GameConfig;
  colliders: GameManager['map']['colliders'];
  frames: number[];
  entityPeak: number;
  terminal: {
    elapsed: number;
    resultRevealing: boolean;
  };
  presentation: {
    labels: GameManager['presentation']['labels'];
    particles: GameManager['presentation']['particles'];
    crew: GameManager['presentation']['crewEmissions'];
    pools: ReturnType<GameManager['presentation']['statistics']>;
    time: number;
    reducedMotion: boolean;
  };
  audio: ReturnType<AudioManager['observation']>;
}

declare global {
  interface Window {
    pirateTest?: {
      observe: (includeFrames?: boolean) => GameObservation;
      advance?: (seconds: number) => void;
    };
    pirateMetrics?: {
      frames: number[];
      entityPeak: number;
      elapsed: number;
      score: number;
      reason: string | null;
      audio: ReturnType<AudioManager['observation']>;
      presentationPools: ReturnType<GameManager['presentation']['statistics']>;
    };
  }
}
