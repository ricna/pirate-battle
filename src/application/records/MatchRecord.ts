import type { GameConfig } from '../../game/contracts/GameConfig';

import type { EndReason } from '../../game/runtime/GameManager';
import type { StatisticsSnapshot } from '../../game/systems/MatchStatistics';
export interface MatchRecord {
  id: string;
  playerId: string;
  playerName: string;
  date: string;
  score: number;
  duration: number;
  reason: EndReason;
  config: GameConfig;
  statistics?: StatisticsSnapshot;
}
export interface Page<T> {
  items: T[];
  page: number;
  totalPages: number;
  total: number;
}
export interface RankedMatch extends MatchRecord {
  rank: number;
}
function isStatistics(value: unknown): value is StatisticsSnapshot {
  if (!value || typeof value !== 'object') return false;
  const statistics = value as StatisticsSnapshot;
  return (
    [statistics.cannonballsFired, statistics.cannonballHits, statistics.enemiesSunk].every(
      (number) => Number.isInteger(number) && number >= 0,
    ) &&
    [statistics.damageReceived, statistics.healthRemaining].every(
      (number) => Number.isFinite(number) && number >= 0,
    ) &&
    statistics.cannonballHits <= statistics.cannonballsFired &&
    statistics.enemiesSunk <= statistics.cannonballHits
  );
}
export function isMatch(value: unknown): value is MatchRecord {
  if (!value || typeof value !== 'object') return false;
  const v = value as MatchRecord;
  return (
    typeof v.id === 'string' &&
    typeof v.playerId === 'string' &&
    typeof v.playerName === 'string' &&
    typeof v.date === 'string' &&
    Number.isFinite(Date.parse(v.date)) &&
    Number.isInteger(v.score) &&
    v.score >= 0 &&
    Number.isFinite(v.duration) &&
    v.duration >= 0 &&
    (v.reason === 'time' || v.reason === 'death') &&
    (v.statistics === undefined || isStatistics(v.statistics)) &&
    !!v.config &&
    typeof v.config.version === 'string' &&
    Number.isFinite(v.config.sessionSeconds) &&
    Number.isFinite(v.config.spawnSeconds) &&
    Number.isFinite(v.config.seed)
  );
}
export const isMatchList = (v: unknown): v is MatchRecord[] => Array.isArray(v) && v.every(isMatch);
