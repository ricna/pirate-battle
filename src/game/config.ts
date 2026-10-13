// Compatibility entry point for UI/data consumers; authored defaults live in configuration/.
import { GameDefaults } from './configuration/GameDefaults';
import { GameConfigFactory, freezeConfiguration } from './configuration/GameConfigFactory';
export { validOptions } from './configuration/GameConfigFactory';
export type { Options } from './configuration/GameConfigFactory';
export type { GameConfig } from './configuration/types';
import type { Options } from './configuration/GameConfigFactory';
import type { GameConfig } from './configuration/types';
export const DEFAULT_OPTIONS = freezeConfiguration(structuredClone(GameDefaults.Options));
export const LIMITS = GameDefaults.Limits;
export const createGameConfig = (options: Options): GameConfig => GameConfigFactory.create(options);
export function configurationKey(config: GameConfig): string {
  // FNV-1a identifies the full serialized snapshot, including client-edited balance profiles.
  let hash = 2166136261;
  for (const character of JSON.stringify(config)) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
  return `${config.version}|${config.seed}|${config.sessionSeconds}|${config.spawnSeconds}|${hash.toString(36)}`;
}
