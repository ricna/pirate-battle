import type { GameConfig } from '../game/config';
import type { EndReason } from '../game/simulation';
import { readStored } from './storage';
export interface MatchRecord { id: string; playerId: string; playerName: string; date: string;
  score: number; duration: number; reason: EndReason; config: GameConfig }
export interface Page<T> { items: T[]; page: number; totalPages: number; total: number }
export interface RankedMatch extends MatchRecord { rank: number }
export function isMatch(value: unknown): value is MatchRecord {
  if (!value || typeof value !== 'object') return false;
  const v = value as MatchRecord;
  return typeof v.id === 'string' && typeof v.playerId === 'string' && typeof v.playerName === 'string'
    && typeof v.date === 'string' && Number.isFinite(Date.parse(v.date)) && Number.isInteger(v.score) && v.score >= 0
    && Number.isFinite(v.duration) && v.duration >= 0 && (v.reason === 'time' || v.reason === 'death')
    && !!v.config && typeof v.config.version === 'string' && Number.isFinite(v.config.sessionSeconds)
    && Number.isFinite(v.config.spawnSeconds) && Number.isFinite(v.config.seed);
}
export const isMatchList = (v: unknown): v is MatchRecord[] => Array.isArray(v) && v.every(isMatch);
export const pendingMatches = () => readStored('pending', isMatchList, []);
export const lastMatch = () => readStored<MatchRecord | null>('last', (v): v is MatchRecord | null => v === null || isMatch(v), null);
