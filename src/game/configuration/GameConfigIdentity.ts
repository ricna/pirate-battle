import type { GameConfig } from '../contracts/GameConfig';

/** Stable ranking group for the entire frozen gameplay snapshot (not a security hash). */
export class GameConfigIdentity {
  private constructor() {}
  static key(config: GameConfig): string {
    let hash = 2166136261;
    for (const character of JSON.stringify(config))
      hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
    return `${config.version}|${config.seed}|${config.sessionSeconds}|${config.spawnSeconds}|${hash.toString(36)}`;
  }
}
