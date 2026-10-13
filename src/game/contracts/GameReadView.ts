import type { GameManager } from '../runtime/GameManager';

/** Renderer dependency excludes step, damage, pause, resume and disposal commands. */
export type GameReadView = Pick<
  GameManager,
  'config' | 'player' | 'enemies' | 'projectiles' | 'effects' | 'presentation'
>;
