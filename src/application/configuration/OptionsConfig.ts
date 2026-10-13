import { freezeStaticConfiguration } from '../../game/core/Immutable';
import type { Options } from './Options';

export class OptionsConfig {
  private constructor() {}
  static readonly Default: Readonly<Options> = {
    sessionSeconds: 120,
    spawnSeconds: 5,
    sound: true,
    volume: 0.5,
    musicVolume: 1,
  };
  static readonly Limits = { session: [60, 180], spawn: [2, 10], volume: [0, 1] } as const;
  static readonly Steps = { session: 10, spawn: 0.2, volume: 0.1 };

  static isValid(value: unknown): value is Options {
    if (!value || typeof value !== 'object') return false;
    const options = value as Options;
    const within = (number: number, limits: readonly [number, number]) =>
      Number.isFinite(number) && number >= limits[0] && number <= limits[1];
    return (
      within(options.sessionSeconds, OptionsConfig.Limits.session) &&
      within(options.spawnSeconds, OptionsConfig.Limits.spawn) &&
      typeof options.sound === 'boolean' &&
      within(options.volume, OptionsConfig.Limits.volume) &&
      within(options.musicVolume, OptionsConfig.Limits.volume)
    );
  }

  /** Only the documented legacy schema acquires the new preference. Invalid data is rejected. */
  static restore(value: unknown): Options | null {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const migrated = Object.hasOwn(value, 'musicVolume')
      ? value
      : { ...value, musicVolume: OptionsConfig.Default.musicVolume };
    return OptionsConfig.isValid(migrated) ? { ...migrated } : null;
  }
}
freezeStaticConfiguration(OptionsConfig);
