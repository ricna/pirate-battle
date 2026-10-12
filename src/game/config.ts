export interface Island {
  x: number;
  y: number;
  size: number;
  tiles: readonly (readonly number[])[];
}

export interface GameConfig {
  arena: { width: number; height: number; islands: readonly Island[] };
  player: { x: number; y: number; radius: number; speed: number; turnSpeed: number; health: number };
  sessionSeconds: number;
  fixedStepSeconds: number;
}

// Positions and speeds use logical pixels; rotation uses radians per second.
export const GAME_CONFIG: GameConfig = {
  arena: {
    width: 1152,
    height: 648,
    islands: [{
      x: 448, y: 160, size: 64,
      tiles: [[6, 7, 8, 9], [22, 23, 24, 25], [38, 39, 40, 41], [54, 55, 56, 57]],
    }],
  },
  player: { x: 576, y: 520, radius: 26, speed: 180, turnSpeed: 2.4, health: 100 },
  sessionSeconds: 120,
  fixedStepSeconds: 1 / 60,
};
