import { GameConfigIdentity } from '../../game/configuration/GameConfigIdentity';
import { EndReason } from '../../game/contracts/GameDomain';
import type { GameConfig } from '../../game/contracts/GameConfig';
import type { MatchRecord } from '../../application/records/MatchRecord';

const FixtureCaptains = ['Blackbeard', 'Anne Bonny', 'Calico Jack', 'Mary Read'] as const;
/** Fixed UTC dates keep fixture ordering, tie-breaking and screenshots deterministic. */
const FixtureEpoch = { year: 2026, month: 9, day: 10, hour: 12 } as const;
const FixtureScore = { minimum: 3, spread: 11 } as const;
const FixtureDeathDuration = { minimum: 40, spread: 20 } as const;

function fixture(index: number, playerId: string, playerName: string, config: GameConfig): MatchRecord {
  const survived = index % 2 === 1;
  return {
    id: `fixture-${playerId}-${GameConfigIdentity.key(config)}-${index}`,
    playerId,
    playerName,
    date: new Date(
      Date.UTC(FixtureEpoch.year, FixtureEpoch.month, FixtureEpoch.day, FixtureEpoch.hour, index),
    ).toISOString(),
    score: FixtureScore.minimum + (index % FixtureScore.spread),
    duration: survived
      ? config.sessionSeconds
      : FixtureDeathDuration.minimum + (index % FixtureDeathDuration.spread),
    reason: survived ? EndReason.Time : EndReason.Death,
    config,
  };
}

/** Deterministic records representing other captains (ranking) and this player's history (paging demo). */
export class MockFixtures {
  private constructor() {}

  static ranking(count: number, config: GameConfig): MatchRecord[] {
    return Array.from({ length: count }, (_, index) =>
      fixture(index, `fixture-${index}`, FixtureCaptains[index % FixtureCaptains.length]!, config),
    );
  }

  static history(count: number, playerId: string, config: GameConfig): MatchRecord[] {
    return Array.from({ length: count }, (_, index) => fixture(index, playerId, 'You', config));
  }
}
