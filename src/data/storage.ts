import { DEFAULT_OPTIONS, validOptions } from '../game/config';
import type { Options } from '../game/config';
export let storageWarning: string | null = null;
export function readStored<T>(key: string, validate: (value: unknown) => value is T, initial: T): T {
  try { const raw = localStorage.getItem(`pirate.${key}`); if (!raw) return initial;
    const value: unknown = JSON.parse(raw); if (validate(value)) return value;
    storageWarning = 'Some stored data was invalid and could not be restored.';
  } catch { storageWarning = 'Local storage is unavailable. Progress cannot survive a refresh.'; }
  return initial;
}
export function writeStored(key: string, value: unknown) {
  try { localStorage.setItem(`pirate.${key}`, JSON.stringify(value)); }
  catch { storageWarning = 'Local storage could not save your progress.'; }
}
export const loadOptions = () => readStored<Options>('options', validOptions, DEFAULT_OPTIONS);
export function playerIdentity() {
  const id = readStored('player', (v): v is string => typeof v === 'string' && v.length > 0, '');
  if (id) return id;
  const created = crypto.randomUUID(); writeStored('player', created); return created;
}
