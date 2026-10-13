// Stable serialized identifiers. Runtime rules use these symbols rather than string literals.
export const Action = {
  Forward: 'forward',
  Left: 'left',
  Right: 'right',
  Front: 'front',
  Port: 'port',
  Starboard: 'starboard',
} as const;
export type Action = (typeof Action)[keyof typeof Action];
export const Allegiance = { Player: 'player', Enemy: 'enemy' } as const;
export type Allegiance = (typeof Allegiance)[keyof typeof Allegiance];
export const ShipKind = { Player: 'player', Chaser: 'chaser', Shooter: 'shooter' } as const;
export const MatchStatus = { Playing: 'playing', Paused: 'paused', Ended: 'ended' } as const;
export type MatchStatus = (typeof MatchStatus)[keyof typeof MatchStatus];
export const EndReason = { Time: 'time', Death: 'death' } as const;
export type EndReason = (typeof EndReason)[keyof typeof EndReason];
export const GameEvent = {
  FrontShot: 'front-shot',
  SideShot: 'side-shot',
  EnemyShot: 'enemy-shot',
  Impact: 'impact',
  Explosion: 'explosion',
  Score: 'score',
  LowHealth: 'low-health',
  TimeWarning: 'time-warning',
  WaterImpact: 'water-impact',
  ShipCollision: 'ship-collision',
  Sinking: 'sinking',
  CoastImpact: 'coast-impact',
} as const;
export type GameEvent = (typeof GameEvent)[keyof typeof GameEvent];
export const EffectKind = { Muzzle: 'muzzle', Impact: 'impact', Explosion: 'explosion' } as const;
export type EffectKind = (typeof EffectKind)[keyof typeof EffectKind];
