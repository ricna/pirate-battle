import { OptionsConfig } from '../src/application/configuration/OptionsConfig';
import { GameConfigFactory } from '../src/game/configuration/GameConfigFactory';
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

import { ShipCollisionWorld, ContactKind } from '../src/game/core/ShipCollisionWorld';
import { PlayerShip } from '../src/game/entities/PlayerShip';
import { EnemyShip } from '../src/game/entities/EnemyShip';
import type { EnemyContext } from '../src/game/entities/EnemyShip';
import { EnemyShooterConfig } from '../src/game/configuration/EnemyShooterConfig';
import { EnemyChaser } from '../src/game/entities/EnemyChaser';
import { EnemyChaserConfig } from '../src/game/configuration/EnemyChaserConfig';
import { Action, GameEvent } from '../src/game/contracts/GameDomain';
import { GameManager } from '../src/game/runtime/GameManager';
import { distance } from '../src/game/math/Geometry';
import type { LoadedMap } from '../src/game/assets/TiledMapLoader';

function map(): LoadedMap {
  const json = JSON.parse(readFileSync('assets/maps/arena_00.tmj', 'utf8'));
  return { width: json.width, height: json.height, tileWidth: json.tilewidth, tileHeight: json.tileheight,
    layers: [], tilesets: [], colliders: json.layers.find((layer: { name: string }) => layer.name === 'collisions').objects };
}

test('swept hull contact prevents high-speed crossing and permits departure', () => {
  const config = GameConfigFactory.create(OptionsConfig.Default);
  const world = new ShipCollisionWorld(map(), config);
  const player = new PlayerShip(1, { x: 1280, y: 900 }, config.player);
  const obstacle = new PlayerShip(2, { x: 1280, y: 700 }, config.player);
  world.setBodies([player, obstacle]);
  const stopped = world.move(player, player.radius, 0, 1500);
  expect(distance(stopped, obstacle)).toBeGreaterThanOrEqual(player.hullRadius + obstacle.hullRadius);
  expect(stopped.y).toBeGreaterThan(obstacle.y);
  expect(world.drainContacts().some((contact) => contact.kind === ContactKind.Hull)).toBe(true);
  const departing = new PlayerShip(3, stopped, config.player);
  world.setBodies([departing, obstacle]);
  const escaped = world.move(departing, departing.radius, Math.PI, 50);
  expect(escaped.y).toBeGreaterThan(stopped.y);
  expect(world.isFree(escaped, departing.radius)).toBe(true);
});

test('opposing enemy hulls remain separated throughout motion', () => {
  class SailingEnemy extends EnemyShip {
    override update(context: EnemyContext): void { this.sail(true, context.dt, context.world); }
  }
  const config = GameConfigFactory.create(OptionsConfig.Default);
  const world = new ShipCollisionWorld(map(), config);
  const first = new SailingEnemy(1, { x: 1280, y: 900 }, 0, EnemyShooterConfig.Default);
  const second = new SailingEnemy(2, { x: 1280, y: 700 }, Math.PI, EnemyShooterConfig.Default);
  const target = new PlayerShip(0, config.playerSpawn, config.player);
  world.setBodies([first, second]);
  for (let step = 0; step < 180; step++) {
    const context = { target, world, dt: config.fixedStep, elapsed: step * config.fixedStep, fleet: [first.view, second.view],
      fire() {}, damage() {}, event() {} };
    first.update(context); second.update(context);
    expect(distance(first, second)).toBeGreaterThanOrEqual(first.hullRadius + second.hullRadius);
  }
  expect(first.y).toBeGreaterThan(second.y);
  expect(first.speed).toBeLessThan(config.collision.minimumImpactSpeed);
});

test('Chaser ram triggers on hull contact once without a credited kill', () => {
  const config = GameConfigFactory.create(OptionsConfig.Default);
  const world = new ShipCollisionWorld(map(), config);
  const player = new PlayerShip(0, { x: 1280, y: 700 }, config.player);
  const chaser = new EnemyChaser(1, { x: 1280, y: 900 }, 0, EnemyChaserConfig.Default);
  world.setBodies([player, chaser]);
  let damage = 0;
  const events: GameEvent[] = [];
  for (let step = 0; step < 180; step++) {
    chaser.update({ target: player, world, elapsed: step * config.fixedStep, dt: config.fixedStep, fleet: [chaser.view],
      fire() {}, damage: (ship, amount, credited) => { expect(credited).toBe(false); ship.applyDamage(amount); damage++; },
      event: (event) => events.push(event) });
  }
  expect(chaser.alive).toBe(false);
  expect(player.health).toBe(config.player.health - EnemyChaserConfig.Default.ai!.ramDamage);
  expect(damage).toBe(2);
  expect(events.filter((event) => event === GameEvent.ShipCollision)).toHaveLength(1);
});

test('island contact dissipates speed and does not spam impacts while held', () => {
  const config = GameConfigFactory.create(OptionsConfig.Default);
  const game = new GameManager(config, map());
  const events: GameEvent[] = [];
  for (let step = 0; step < 180; step++) {
    game.step(config.fixedStep, new Set([Action.Forward]));
    events.push(...game.drainEvents());
  }
  expect(game.player.speed).toBeLessThan(config.collision.minimumImpactSpeed);
  expect(events.filter((event) => event === GameEvent.ShipCollision)).toHaveLength(1);
  expect(game.player.health).toBe(config.player.health);
  game.dispose();
});
