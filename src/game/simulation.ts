import type { GameConfig } from './config';

export type Action = 'forward' | 'left' | 'right';
export type SessionStatus = 'running' | 'paused' | 'finished';
export interface GameSnapshot {
  status: SessionStatus;
  elapsed: number;
  remaining: number;
  player: { x: number; y: number; angle: number; health: number };
}

export class Simulation {
  readonly config: GameConfig;
  readonly player: GameSnapshot['player'];
  status: SessionStatus = 'running';
  elapsed = 0;

  constructor(config: GameConfig) {
    this.config = structuredClone(config);
    this.player = { x: config.player.x, y: config.player.y, angle: 0, health: config.player.health };
  }

  step(dt: number, input: ReadonlySet<Action>) {
    if (this.status !== 'running') return;
    const activeDt = Math.min(dt, this.config.sessionSeconds - this.elapsed);
    const turn = Number(input.has('right')) - Number(input.has('left'));
    this.player.angle = (this.player.angle + turn * this.config.player.turnSpeed * activeDt) % (2 * Math.PI);
    if (input.has('forward')) {
      const distance = this.config.player.speed * activeDt;
      const x = this.player.x + Math.sin(this.player.angle) * distance;
      const y = this.player.y - Math.cos(this.player.angle) * distance;
      // Resolve axes separately so a ship can slide along an obstacle's edge.
      if (this.canOccupy(x, this.player.y)) this.player.x = x;
      if (this.canOccupy(this.player.x, y)) this.player.y = y;
    }
    this.elapsed += activeDt;
    if (this.elapsed >= this.config.sessionSeconds) this.status = 'finished';
  }

  private canOccupy(x: number, y: number) {
    const { arena, player } = this.config;
    const r = player.radius;
    if (x < r || y < r || x > arena.width - r || y > arena.height - r) return false;
    return !arena.islands.some((island) => {
      const width = (island.tiles[0]?.length ?? 0) * island.size;
      const height = island.tiles.length * island.size;
      const closestX = Math.max(island.x, Math.min(x, island.x + width));
      const closestY = Math.max(island.y, Math.min(y, island.y + height));
      return (x - closestX) ** 2 + (y - closestY) ** 2 <= r ** 2;
    });
  }

  snapshot(): GameSnapshot {
    return {
      status: this.status,
      elapsed: this.elapsed,
      remaining: Math.max(0, this.config.sessionSeconds - this.elapsed),
      player: { ...this.player },
    };
  }
}
