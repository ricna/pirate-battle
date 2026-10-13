/** Persisted application preferences, separate from gameplay snapshots. */
export interface Options {
  sessionSeconds: number;
  spawnSeconds: number;
  sound: boolean;
  volume: number;
  musicVolume: number;
}
