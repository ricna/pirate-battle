import { freezeConfiguration } from '../src/game/core/Immutable';
import { OptionsConfig } from '../src/application/configuration/OptionsConfig';
import { GameConfigIdentity } from '../src/game/configuration/GameConfigIdentity';
import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';

import { GameConfigFactory } from '../src/game/configuration/GameConfigFactory';
import { FactoryConfig } from '../src/game/configuration/FactoryConfig';
import { ProjectileConfig } from '../src/game/configuration/ProjectileConfig';
import { EnemyChaserConfig } from '../src/game/configuration/EnemyChaserConfig';
import { ObjectPool } from '../src/game/core/ObjectPool';
import { EntityIdSequence } from '../src/game/core/EntityIdSequence';
import { CollisionWorld } from '../src/game/core/CollisionWorld';
import { ShipFactory } from '../src/game/factories/ShipFactory';
import { ProjectileFactory } from '../src/game/factories/ProjectileFactory';
import { ProjectileSystem } from '../src/game/systems/ProjectileSystem';
import { WeaponController } from '../src/game/systems/WeaponController';
import { EnemyShip } from '../src/game/entities/EnemyShip';
import type { EnemyContext } from '../src/game/entities/EnemyShip';
import { Action, Allegiance } from '../src/game/contracts/GameDomain';
import { GameManager } from '../src/game/runtime/GameManager';
import type { LoadedMap } from '../src/game/assets/TiledMapLoader';
import { GameDefaults } from '../src/game/configuration/GameDefaults';

// Domain-only fixture: real authored map geometry; no rendering or substitute runtime assets.
function map(): LoadedMap {
  const json = JSON.parse(readFileSync('assets/maps/arena_00.tmj', 'utf8')) as {
    width: number; height: number; tilewidth: number; tileheight: number;
    layers: { name: string; objects?: LoadedMap['colliders'] }[];
  };
  return { width: json.width, height: json.height, tileWidth: json.tilewidth, tileHeight: json.tileheight,
    layers: [], tilesets: [], colliders: json.layers.find((layer) => layer.name === 'collisions')!.objects! };
}
test('configuration snapshots reject invalid profiles and identify edited balance', () => {
  const options = { ...OptionsConfig.Default }; const original = GameConfigFactory.create(options); options.sessionSeconds = 60;
  expect(original.sessionSeconds).toBe(OptionsConfig.Default.sessionSeconds);
  expect(Object.isFrozen(original.player.movement)).toBe(true);
  expect(Object.isFrozen(GameDefaults)).toBe(true); expect(Object.isFrozen(GameDefaults.SpawnPoints)).toBe(true);
  expect(Reflect.set(GameDefaults, 'FixedStep', 999)).toBe(false);
  expect(() => Reflect.set(original.player.movement, 'maxSpeed', 999)).not.toThrow();
  expect(original.player.movement.maxSpeed).toBe(230);
  const edited = { ...original, playerSpawn: { x: 1280, y: 1080 }, player: { ...original.player, movement: { ...original.player.movement, maxSpeed: 320 } } };
  expect(GameConfigIdentity.key(edited)).not.toBe(GameConfigIdentity.key(original));
  const changedGame = new GameManager(edited, map()); changedGame.step(2, new Set([Action.Forward]));
  expect(changedGame.player.speed).toBe(320); changedGame.dispose();
  expect(() => GameConfigFactory.validate({ ...edited, player: { ...edited.player, radius: -1 } })).toThrow();
  expect(() => GameConfigFactory.validate({ ...edited, player: { ...edited.player,
    visual: { ...edited.player.visual, damageStages: [] } } })).toThrow();
  expect(() => GameConfigFactory.validate({ ...edited, pools: { ...edited.pools,
    projectiles: { initialCapacity: 0, growthSize: 1, maxCapacity: 2 } } })).toThrow();
});
test('pool grows within its cap, rejects foreign/double returns and resets leases', () => {
  const pool = new ObjectPool({ initialCapacity: 1, growthSize: 2, maxCapacity: 3 }, () => ({ state: 0 }), (o) => { o.state = 0; });
  const first = pool.acquire()!; first.state = 42; const second = pool.acquire()!; const third = pool.acquire()!;
  expect(pool.acquire()).toBeNull(); expect(pool.statistics()).toMatchObject({ capacity: 3, active: 3, peak: 3, exhausted: 1 });
  pool.release(first); const reused = pool.acquire()!; expect(reused).toBe(first); expect(reused.state).toBe(0);
  pool.release(reused); expect(() => pool.release(reused)).toThrow(); expect(() => pool.release({ state: 0 })).toThrow();
  pool.release(second); pool.release(third); expect(pool.statistics().active).toBe(0);
});
test('reused projectiles reset ownership, damage, velocity, age and activation ID', () => {
  const factory = new ProjectileFactory({ initialCapacity: 1, growthSize: 1, maxCapacity: 1 }, new EntityIdSequence());
  const first = factory.create({ x: 100, y: 200 }, 0, Allegiance.Player, ProjectileConfig.PlayerFront)!;
  const id = first.id; first.advance(first.nextPosition(0.5), 0.5); factory.release(first);
  expect(() => first.profile).toThrow();
  const next = factory.create({ x: 300, y: 400 }, Math.PI / 2, Allegiance.Enemy, ProjectileConfig.Enemy)!;
  expect(next).toBe(first); expect(next.id).not.toBe(id); expect(next.snapshot()).toMatchObject({ x: 300, y: 400,
    owner: Allegiance.Enemy, damage: 12, age: 0, speed: 340, radius: 5 }); expect(next.vx).toBeCloseTo(340);
  factory.release(next); factory.dispose(); expect(factory.statistics().capacity).toBe(0);
});
test('weapons defer a complete broadside when capacity is insufficient without consuming cooldown', () => {
  const config = GameConfigFactory.create(OptionsConfig.Default); const factory = new ShipFactory(config, FactoryConfig.Enemies);
  const player = factory.createPlayer(0); const projectiles = new ProjectileSystem(new ProjectileFactory({ initialCapacity: 1,
    growthSize: 1, maxCapacity: 3 }, new EntityIdSequence()));
  const weapons = new WeaponController(player, projectiles, config.rules.clockTolerance); let shots = 0;
  const fired = () => { shots++; };
  expect(weapons.tryFire(Action.Front, 0, fired)).toBe(true);
  expect(weapons.tryFire(Action.Port, 0, fired)).toBe(false); expect(projectiles.projectiles).toHaveLength(1); expect(shots).toBe(1);
  projectiles.update(2, player, [], new CollisionWorld(map(), config), () => {}, () => {});
  expect(weapons.tryFire(Action.Port, 0, fired)).toBe(true); expect(projectiles.projectiles).toHaveLength(3);
  expect(weapons.tryFire(Action.Port, 0.1, fired)).toBe(false); expect(shots).toBe(2); projectiles.dispose();
});
test('custom enemy registration selects its subclass without editing GameManager or rendering', () => {
  class Patrol extends EnemyShip {
    override update(context: EnemyContext): void { this.sail(true, context.dt, context.world); }
  }
  const profile = { ...EnemyChaserConfig.Default, id: 'test-patrol' };
  const registrations = [...FactoryConfig.Enemies, { profile, constructor: Patrol }];
  const original = GameConfigFactory.create(OptionsConfig.Default, registrations);
  const config = freezeConfiguration({ ...original, spawning: { ...original.spawning, initialSequence: [profile.id] } });
  const simulation = new GameManager(config, map(), new ShipFactory(config, registrations));
  for (let step = 0; step < 300; step++) simulation.step(config.fixedStep, new Set());
  expect(simulation.enemies[0]!.kind).toBe(profile.id); expect(simulation.enemies[0]!.speed).toBeGreaterThan(0);
  simulation.dispose(); expect(simulation.enemies).toHaveLength(0); expect(simulation.poolStatistics().projectiles.capacity).toBe(0);
});
test('read ports cannot mutate private state; acceleration, braking, pause and disposal obey the lifecycle', () => {
  const config = GameConfigFactory.create(OptionsConfig.Default); const simulation = new GameManager(config, map());
  const geometry = map(); const island = geometry.colliders.find((c) => c.id === 8)!;
  const fastMove = new CollisionWorld(geometry, config).move(config.playerSpawn, config.player.radius, 0, 2000);
  expect(fastMove.y).toBeGreaterThanOrEqual(island.y + island.height + config.player.radius);
  expect(Object.isFrozen(simulation.readView)).toBe(true);
  for (const command of ['step', 'pause', 'resume', 'dispose', 'advancePresentation']) expect(command in simulation.readView).toBe(false);
  expect(simulation.readView.player).toBe(simulation.player);
  expect(Object.isFrozen(simulation.player)).toBe(true); expect('applyDamage' in simulation.player).toBe(false);
  expect(Reflect.set(simulation.player, 'health', 0)).toBe(false); expect(Reflect.set(simulation.player, 'x', 0)).toBe(false);
  expect(simulation.player.health).toBe(config.player.health);
  simulation.step(config.fixedStep, new Set([Action.Forward]));
  expect(simulation.player.speed).toBeCloseTo(config.player.movement.acceleration * config.fixedStep);
  const accelerationSteps = Math.ceil(config.player.movement.maxSpeed / config.player.movement.acceleration / config.fixedStep);
  for (let step = 0; step < accelerationSteps; step++) simulation.step(config.fixedStep, new Set([Action.Forward]));
  expect(simulation.player.speed).toBe(config.player.movement.maxSpeed);
  simulation.pause(); const frozen = simulation.observation(); simulation.step(1, new Set([Action.Forward]));
  expect(simulation.observation()).toEqual(frozen); simulation.resume();
  simulation.step(config.fixedStep, new Set());
  expect(simulation.player.speed).toBeGreaterThan(0); expect(simulation.player.speed).toBeLessThan(config.player.movement.maxSpeed);
  const brakingSteps = Math.ceil(config.player.movement.maxSpeed / config.player.movement.deceleration / config.fixedStep);
  for (let step = 0; step < brakingSteps; step++) simulation.step(config.fixedStep, new Set());
  expect(simulation.player.speed).toBe(0);
  simulation.step(config.fixedStep, new Set([Action.Port])); expect(simulation.poolStatistics().projectiles.active).toBe(3);
  simulation.dispose(); simulation.dispose(); expect(simulation.poolStatistics().projectiles.active).toBe(0);
  const elapsed = simulation.elapsed; simulation.step(1, new Set()); expect(simulation.elapsed).toBe(elapsed);
});
test('projectile acceleration and deceleration remain configured across different leases', () => {
  const factory = new ProjectileFactory({ initialCapacity: 1, growthSize: 1, maxCapacity: 1 }, new EntityIdSequence());
  const accelerating = { ...ProjectileConfig.PlayerFront, initialSpeed: 100, maxSpeed: 200, acceleration: 100, deceleration: 0 };
  const p = factory.create({ x: 0, y: 0 }, 0, Allegiance.Player, accelerating)!;
  p.advance(p.nextPosition(0.5), 0.5); expect(p.speed).toBe(150);
  p.advance(p.nextPosition(1), 1); expect(p.speed).toBe(200); factory.release(p);
  const braking = factory.create({ x: 0, y: 0 }, 0, Allegiance.Player, { ...accelerating, acceleration: 0, deceleration: 100 })!;
  braking.advance(braking.nextPosition(0.5), 0.5); expect(braking.speed).toBe(50); factory.dispose();
});
