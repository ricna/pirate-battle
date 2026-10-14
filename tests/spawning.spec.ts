import { freezeConfiguration } from '../src/game/core/Immutable';
import { OptionsConfig } from '../src/application/configuration/OptionsConfig';
import { GameConfigFactory } from '../src/game/configuration/GameConfigFactory';
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

import { PlayerShip } from '../src/game/entities/PlayerShip';
import { distance } from '../src/game/math/Geometry';
import type { Point } from '../src/game/math/Geometry';
import { GameManager } from '../src/game/runtime/GameManager';
import { SpawnSystem } from '../src/game/systems/SpawnSystem';
import type { LoadedMap } from '../src/game/assets/TiledMapLoader';

// Domain-only fixture: real authored map geometry; no rendering or substitute runtime assets.
function map(): LoadedMap {
  const json = JSON.parse(readFileSync('assets/maps/arena_00.tmj', 'utf8')) as {
    width: number;
    height: number;
    tilewidth: number;
    tileheight: number;
    layers: { name: string; objects?: LoadedMap['colliders'] }[];
  };
  return {
    width: json.width,
    height: json.height,
    tileWidth: json.tilewidth,
    tileHeight: json.tileheight,
    layers: [],
    tilesets: [],
    colliders: json.layers.find((layer) => layer.name === 'collisions')!.objects!,
  };
}

for (const sunkEnemiesPerReinforcement of [1, 2]) {
  test(`the opening fleet sails at once and every ${sunkEnemiesPerReinforcement} sunk enemies call in one immediate extra enemy`, () => {
    const base = GameConfigFactory.create({
      ...OptionsConfig.Default,
      sessionSeconds: 180,
      spawnSeconds: 10,
    });
    // Authored-profile edit only: a resilient passive player lets Chaser rams sink enemies for the whole sample.
    const config = freezeConfiguration({
      ...base,
      player: { ...base.player, health: 1e6 },
      spawning: { ...base.spawning, sunkEnemiesPerReinforcement },
    });
    const simulation = new GameManager(config, map());
    const { initialCount } = config.spawning;
    expect(simulation.enemies).toHaveLength(initialCount);
    expect(simulation.enemies.map((enemy) => enemy.kind).slice(0, 2)).toEqual(['chaser', 'shooter']);
    let sunk = 0;
    let fleet = new Set(simulation.enemies.map((enemy) => enemy.id));
    for (let step = 0; step < 60 / config.fixedStep; step++) {
      // A sinking is counted at the end of its step; its reinforcement arrives with the next step.
      const reinforcements = Math.floor(sunk / sunkEnemiesPerReinforcement);
      simulation.step(config.fixedStep, new Set());
      const current = new Set(simulation.enemies.map((enemy) => enemy.id));
      sunk += [...fleet].filter((id) => !current.has(id)).length;
      fleet = current;
      const intervalSpawns = Math.floor(
        (simulation.elapsed + config.rules.clockTolerance) / config.spawnSeconds,
      );
      expect(simulation.enemies.length).toBe(initialCount + intervalSpawns + reinforcements - sunk);
    }
    expect(sunk).toBeGreaterThanOrEqual(2);
    simulation.dispose();
  });
}

test('spawns pick among the farthest safe points and never reuse a recent point', () => {
  const config = GameConfigFactory.create(OptionsConfig.Default);
  const { farthestPointChoices, recentPointsExcluded, safeDistance } = config.spawning;
  const player = new PlayerShip(1, config.playerSpawn, config.player);
  const ranked = config.spawnPoints
    .filter((point) => distance(point, player) >= safeDistance)
    .sort((a, b) => distance(b, player) - distance(a, player));
  const spawning = new SpawnSystem(config);
  const used: Readonly<Point>[] = [];
  for (let interval = 0; interval <= 40; interval++)
    spawning.update(interval * config.spawnSeconds, player, [], (_, point) => used.push(point));
  expect(used).toHaveLength(config.spawning.initialCount + 40);
  used.forEach((point, index) => {
    const recent = used.slice(Math.max(0, index - recentPointsExcluded), index);
    expect(recent).not.toContain(point);
    const farthest = ranked.filter((candidate) => !recent.includes(candidate)).slice(0, farthestPointChoices);
    expect(farthest).toContain(point);
  });
  // Random choice among several far points spreads arrivals instead of queueing them from one place.
  expect(new Set(used).size).toBeGreaterThan(farthestPointChoices);
});

test('spawn balance settings are validated', () => {
  const config = GameConfigFactory.create(OptionsConfig.Default);
  const withSpawning = (spawning: Partial<typeof config.spawning>) => ({
    ...config,
    spawning: { ...config.spawning, ...spawning },
  });
  expect(() => GameConfigFactory.validate(withSpawning({ initialCount: 0 }))).not.toThrow();
  expect(() =>
    GameConfigFactory.validate(withSpawning({ initialCount: config.spawning.maxCount + 1 })),
  ).toThrow(/opening fleet/);
  expect(() => GameConfigFactory.validate(withSpawning({ initialCount: 1.5 }))).toThrow(/opening fleet/);
  expect(() => GameConfigFactory.validate(withSpawning({ sunkEnemiesPerReinforcement: 0 }))).toThrow(
    /per reinforcement/,
  );
  expect(() => GameConfigFactory.validate(withSpawning({ farthestPointChoices: 0 }))).toThrow(
    /point choices/,
  );
  expect(() =>
    GameConfigFactory.validate(withSpawning({ recentPointsExcluded: config.spawnPoints.length })),
  ).toThrow(/Recently used spawn points/);
});
