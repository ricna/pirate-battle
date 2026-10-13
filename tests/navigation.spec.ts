import { freezeConfiguration } from '../src/game/core/Immutable';
import { OptionsConfig } from '../src/application/configuration/OptionsConfig';
import { GameConfigFactory } from '../src/game/configuration/GameConfigFactory';
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';


import { CollisionWorld } from '../src/game/core/CollisionWorld';
import { ShipKind } from '../src/game/contracts/GameDomain';
import { distance } from '../src/game/math/Geometry';
import type { Point } from '../src/game/math/Geometry';
import { GameManager } from '../src/game/runtime/GameManager';
import type { LoadedMap } from '../src/game/assets/TiledMapLoader';

// Domain-only fixture: real authored map geometry; no rendering or substitute runtime assets.
function map(): LoadedMap {
  const json = JSON.parse(readFileSync('assets/maps/arena_00.tmj', 'utf8')) as {
    width: number; height: number; tilewidth: number; tileheight: number;
    layers: { name: string; objects?: LoadedMap['colliders'] }[];
  };
  return { width: json.width, height: json.height, tileWidth: json.tilewidth, tileHeight: json.tileheight,
    layers: [], tilesets: [], colliders: json.layers.find((layer) => layer.name === 'collisions')!.objects! };
}

// Just above the bottom-left island: the player fits, but this grid cell is blocked for an inflated enemy radius.
const coastHuggingPlayer: Point = { x: 250, y: 739 };
// Top centre: the central island hides the coast-hugging player from here.
const hiddenSpawn: Point = { x: 1024, y: 64 };

test('a route to a target inside a blocked navigation cell ends at the nearest reachable water', () => {
  const config = GameConfigFactory.create(OptionsConfig.Default);
  const world = new CollisionWorld(map(), config);
  const radius = config.enemies[ShipKind.Chaser]!.radius;
  expect(world.isVisible(hiddenSpawn, coastHuggingPlayer, radius)).toBe(false);
  const route = world.route(hiddenSpawn, coastHuggingPlayer, radius);
  expect(route.length).toBeGreaterThan(0);
  expect(distance(route.at(-1)!, coastHuggingPlayer)).toBeLessThan(map().tileWidth * 1.5);
  let previous: Point = hiddenSpawn;
  for (const corner of route) {
    expect(world.isNavigable(previous, corner, radius)).toBe(true);
    previous = corner;
  }
});

for (const kind of [ShipKind.Chaser, ShipKind.Shooter]) {
  test(`a hidden ${kind} reaches a player hugging a coast instead of sailing away`, () => {
    const base = GameConfigFactory.create(OptionsConfig.Default);
    const config = freezeConfiguration({ ...base, playerSpawn: coastHuggingPlayer, spawnPoints: [hiddenSpawn],
      spawning: { ...base.spawning, maxCount: 1, initialSequence: [kind] } });
    const simulation = new GameManager(config, map());
    const seconds = 25;
    for (let step = 0; step < seconds / config.fixedStep && simulation.player.health === config.player.health; step++) {
      simulation.step(config.fixedStep, new Set());
    }
    expect(simulation.player.health).toBeLessThan(config.player.health);
    simulation.dispose();
  });
}

test('a crowded seeded battle keeps enemies sailing instead of pinned to coasts or each other', () => {
  const base = GameConfigFactory.create({ ...OptionsConfig.Default, sessionSeconds: 180, spawnSeconds: 2 });
  // Authored-profile edit only: a resilient player keeps the full enemy cap on the water for the whole sample.
  const config = freezeConfiguration({ ...base, player: { ...base.player, health: 1e6 } });
  const simulation = new GameManager(config, map());
  const windowSeconds = 2;
  const minimumProgress = 25;
  const samples = new Map<number, { point: Point; elapsed: number }[]>();
  let observed = 0;
  let pinned = 0;
  for (let step = 0; step < 90 / config.fixedStep; step++) {
    simulation.step(config.fixedStep, new Set());
    for (const enemy of simulation.enemies) {
      const history = samples.get(enemy.id) ?? [];
      history.push({ point: { x: enemy.x, y: enemy.y }, elapsed: simulation.elapsed });
      while (history[0]!.elapsed < simulation.elapsed - windowSeconds) history.shift();
      samples.set(enemy.id, history);
      if (simulation.elapsed - history[0]!.elapsed < windowSeconds - config.fixedStep) continue;
      // A Shooter holding position inside its firing range is intentionally stationary.
      const holding = enemy.profile.ai!.range > 0 && distance(enemy, simulation.player) <= enemy.profile.ai!.range;
      if (holding) continue;
      observed++;
      if (distance(enemy, history[0]!.point) < minimumProgress) pinned++;
    }
  }
  expect(simulation.enemies.length).toBe(config.spawning.maxCount);
  expect(pinned / observed).toBeLessThan(0.15);
  simulation.dispose();
});
