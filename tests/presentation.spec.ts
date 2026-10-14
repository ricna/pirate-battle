import { OptionsConfig } from '../src/application/configuration/OptionsConfig';
import { expect, test } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { AudioConfig } from '../src/game/configuration/AudioConfig';

import { GameConfigFactory } from '../src/game/configuration/GameConfigFactory';
import { ParticleKind } from '../src/game/configuration/PresentationConfig';
import { CollisionWorld } from '../src/game/core/CollisionWorld';
import { CrewSystem } from '../src/game/systems/CrewSystem';
import { EntityIdSequence } from '../src/game/core/EntityIdSequence';
import { PresentationSystem } from '../src/game/presentation/PresentationSystem';
import { FeedbackKind } from '../src/game/contracts/FeedbackEvent';
import { Allegiance, Action } from '../src/game/contracts/GameDomain';
import { GameManager } from '../src/game/runtime/GameManager';
import type { LoadedMap } from '../src/game/assets/TiledMapLoader';
import { PlayerShip } from '../src/game/entities/PlayerShip';
import type { FeedbackEvent } from '../src/game/contracts/FeedbackEvent';

function map(): LoadedMap {
  const json = JSON.parse(readFileSync('assets/maps/arena_00.tmj', 'utf8'));
  return {
    width: json.width,
    height: json.height,
    tileWidth: json.tilewidth,
    tileHeight: json.tileheight,
    layers: [],
    tilesets: [],
    colliders: json.layers.find((layer: { name: string }) => layer.name === 'collisions').objects,
  };
}

test('sinking emits 2–5 crew once, exercises six variants, remains on water and expires', () => {
  const config = GameConfigFactory.create(OptionsConfig.Default);
  const world = new CollisionWorld(map(), config);
  const ids = new EntityIdSequence();
  const crew = new CrewSystem(config, world, ids);
  const presentation = new PresentationSystem(config, world, crew.readView, ids);
  const sprites = new Set<string>();
  for (let shipId = 0; shipId < 24; shipId++) {
    const event = {
      kind: FeedbackKind.Sunk,
      shipId,
      allegiance: Allegiance.Enemy,
      point: config.playerSpawn,
      angle: 0,
      visual: config.player.visual,
    } as const;
    crew.accept(event);
    crew.accept(event);
    presentation.accept(event);
    presentation.accept(event);
    const emission = presentation.crewEmissions.find((crew) => crew.shipId === shipId)!;
    expect(emission.count).toBeGreaterThanOrEqual(2);
    expect(emission.count).toBeLessThanOrEqual(5);
    expect(presentation.crewEmissions.filter((crew) => crew.shipId === shipId)).toHaveLength(1);
    expect(
      presentation.particles.filter(
        (particle) => particle.kind === ParticleKind.Crew && particle.sourceShipId === shipId,
      ),
    ).toHaveLength(emission.count);
    for (const sprite of emission.sprites) sprites.add(sprite);
    crew.update(0.6);
    presentation.update(0.6);
    for (const particle of presentation.particles.filter((particle) => particle.kind === ParticleKind.Crew)) {
      expect(world.isFree(particle, particle.profile.waterRadius)).toBe(true);
      expect(particle.age).toBeGreaterThan(0.45);
    }
    crew.update(1.4);
    presentation.update(1.4);
  }
  expect([...sprites].sort()).toEqual([...config.presentation.profiles[ParticleKind.Crew].sprites].sort());
  expect(presentation.statistics().crew.exhausted).toBe(0);
  crew.update(11);
  presentation.update(11);
  expect(presentation.particles).toHaveLength(0);
  expect(presentation.statistics().crew.active).toBe(0);
  crew.dispose();
  presentation.dispose();
  expect(presentation.statistics().crew.capacity).toBe(0);
});

test('cosmetic events never modify combat, read ports omit commands and pause freezes all presentation', () => {
  const config = GameConfigFactory.create(OptionsConfig.Default);
  const game = new GameManager(config, map());
  for (let step = 0; step < 30; step++) game.step(config.fixedStep, new Set([Action.Forward, Action.Front]));
  expect(game.presentation.particles.some((particle) => String(particle.kind) === 'wake')).toBe(false);
  expect(game.presentation.particles.some((particle) => particle.kind === ParticleKind.Trail)).toBe(true);
  expect(Object.isFrozen(game.presentation)).toBe(true);
  expect('accept' in game.presentation).toBe(false);
  expect(game.score).toBe(0);
  expect(game.player.health).toBe(config.player.health);
  game.pause();
  const before = JSON.stringify({ time: game.presentation.time, particles: game.presentation.particles });
  game.step(4, new Set([Action.Forward]));
  game.advancePresentation(4);
  expect(JSON.stringify({ time: game.presentation.time, particles: game.presentation.particles })).toBe(
    before,
  );
  game.dispose();
  expect(game.presentation.particles).toHaveLength(0);
});

test('reduced motion removes shake/drift, keeps damage/score signals and prevents duplicate rewards', () => {
  const config = GameConfigFactory.create(OptionsConfig.Default);
  const world = new CollisionWorld(map(), config);
  const ids = new EntityIdSequence();
  const crew = new CrewSystem(config, world, ids);
  const presentation = new PresentationSystem(config, world, crew.readView, ids);
  presentation.setReducedMotion(true);
  presentation.accept({
    kind: FeedbackKind.Damage,
    shipId: 1,
    allegiance: Allegiance.Player,
    point: config.playerSpawn,
    amount: 25,
  });
  const score = { kind: FeedbackKind.Score, shipId: 2, point: config.playerSpawn, points: 1 } as const;
  presentation.accept(score);
  presentation.accept(score);
  expect(presentation.labels.filter((label) => label.text === '+1')).toHaveLength(1);
  expect(presentation.labels.some((label) => label.text === '-25')).toBe(true);
  expect(presentation.shake()).toEqual({ x: 0, y: 0 });
  const positions = presentation.particles.map((particle) => ({
    id: particle.id,
    x: particle.x,
    y: particle.y,
  }));
  presentation.update(0.1);
  expect(
    presentation.particles.map((particle) => ({ id: particle.id, x: particle.x, y: particle.y })),
  ).toEqual(positions);
  expect(presentation.shipFeedback(1)).not.toBeNull();
  presentation.dispose();
});

test('configuration rejects budgets that would silently omit required survivors', () => {
  const config = GameConfigFactory.create(OptionsConfig.Default);
  expect(() =>
    GameConfigFactory.validate({
      ...config,
      presentation: {
        ...config.presentation,
        crewPool: { initialCapacity: 1, growthSize: 1, maxCapacity: 5 },
      },
    }),
  ).toThrow(/Crew capacity/);
});
test('victory timing rejects a fade longer than its terminal window', () => {
  const config = GameConfigFactory.create(OptionsConfig.Default);
  for (const victory of [
    { seconds: 0, fadeOutSeconds: 2 },
    { seconds: 4, fadeOutSeconds: 0 },
    { seconds: 4, fadeOutSeconds: 5 },
  ]) {
    expect(() =>
      GameConfigFactory.validate({ ...config, presentation: { ...config.presentation, victory } }),
    ).toThrow(/presentation|Victory fade/);
  }
});

test('audio catalog maps supplied WAVs and the owner-selected death cue without substitutes', () => {
  const supplied = readdirSync('assets/sounds')
    .filter((file) => file.endsWith('.wav'))
    .map((file) => file.slice(0, -4))
    .sort();
  expect(supplied).toHaveLength(27);
  const active = supplied.filter((name) => name !== 'game_over');
  active.push('extra/576054__istudeny__pirat-battle');
  expect([...AudioConfig.requiredSounds()].sort()).toEqual(active.sort());
});

test('each survivor heals once, leaves the pool, and combines rapid rescues into a green label without score', () => {
  const config = GameConfigFactory.create(OptionsConfig.Default);
  const world = new CollisionWorld(map(), config);
  const ids = new EntityIdSequence();
  const crew = new CrewSystem(config, world, ids);
  const presentation = new PresentationSystem(config, world, crew.readView, ids);
  const player = new PlayerShip(ids.next(), config.playerSpawn, config.player);
  const sunk = {
    kind: FeedbackKind.Sunk,
    shipId: ids.next(),
    allegiance: Allegiance.Enemy,
    point: config.playerSpawn,
    angle: 0,
    visual: config.player.visual,
  } as const;
  crew.accept(sunk);
  const count = crew.readView.particles.length;
  expect(count).toBeGreaterThanOrEqual(2);
  expect(crew.readView.particles.every((person) => person.radius === config.crew.radius)).toBe(true);
  expect(Object.isFrozen(crew.readView.particles[0])).toBe(true);
  expect('rescue' in crew.readView).toBe(false);
  const feedback: FeedbackEvent[] = [];
  const emit = (event: FeedbackEvent) => {
    feedback.push(event);
    presentation.accept(event);
  };
  crew.rescue(player, config.playerSpawn, emit);
  expect(feedback).toHaveLength(0);
  expect(crew.readView.particles).toHaveLength(count);
  player.applyDamage(count + 3);
  crew.rescue(player, config.playerSpawn, emit);
  expect(player.health).toBe(player.maxHealth - 3);
  expect(feedback).toHaveLength(count);
  expect(new Set(feedback.map((event) => event.kind === FeedbackKind.Rescue && event.crewId)).size).toBe(
    count,
  );
  expect(presentation.labels).toHaveLength(1);
  expect(presentation.labels[0]).toMatchObject({ text: `+${count}`, color: 0x68ef83 });
  expect(presentation.scorePulse).toBe(false);
  expect(crew.readView.statistics().active).toBe(0);
  crew.rescue(player, config.playerSpawn, emit);
  expect(feedback).toHaveLength(count);
  crew.accept({ ...sunk, shipId: ids.next() });
  expect(
    crew.readView.particles.every((person) => person.age === 0 && person.sourceShipId !== sunk.shipId),
  ).toBe(true);
  player.applyDamage(player.health);
  crew.rescue(player, config.playerSpawn, emit);
  expect(player.health).toBe(0);
  expect(feedback).toHaveLength(count);
  crew.update(11);
  expect(crew.readView.particles).toHaveLength(0);
  crew.dispose();
  presentation.dispose();
});

test('rescue detects a moving hull crossing crew and clamps healing to maximum health', () => {
  const config = GameConfigFactory.create(OptionsConfig.Default);
  const world = new CollisionWorld(map(), config);
  const ids = new EntityIdSequence();
  const crew = new CrewSystem(config, world, ids);
  const start = { x: 512, y: 1080 };
  const point = { x: 512, y: 960 };
  const player = new PlayerShip(ids.next(), start, {
    ...config.player,
    movement: { ...config.player.movement, initialSpeed: 230 },
  });
  crew.accept({
    kind: FeedbackKind.Sunk,
    shipId: ids.next(),
    allegiance: Allegiance.Enemy,
    point,
    angle: 0,
    visual: config.player.visual,
  });
  const count = crew.readView.particles.length;
  player.applyDamage(1);
  player.update(1, new Set([Action.Forward]), world);
  expect(Math.abs(player.y - point.y)).toBeGreaterThan(player.hullRadius + config.crew.radius);
  const feedback: FeedbackEvent[] = [];
  crew.rescue(player, start, (event) => feedback.push(event));
  expect(player.health).toBe(player.maxHealth);
  expect(feedback).toHaveLength(1);
  expect(crew.readView.particles).toHaveLength(count - 1);
  crew.dispose();
});

test('rescue profiles are validated and presentation settings never move pickup locations', () => {
  const config = GameConfigFactory.create(OptionsConfig.Default);
  expect(() => GameConfigFactory.validate({ ...config, crew: { ...config.crew, radius: 0 } })).toThrow();
  expect(() =>
    GameConfigFactory.validate({ ...config, crew: { ...config.crew, healthPerRescue: 0.5 } }),
  ).toThrow();
  const world = new CollisionWorld(map(), config);
  const ids = new EntityIdSequence();
  const crew = new CrewSystem(config, world, ids);
  const presentation = new PresentationSystem(config, world, crew.readView, ids);
  const point = config.playerSpawn;
  crew.accept({
    kind: FeedbackKind.Sunk,
    shipId: ids.next(),
    allegiance: Allegiance.Enemy,
    point,
    angle: 0,
    visual: config.player.visual,
  });
  presentation.setReducedMotion(true);
  crew.update(0.1);
  expect(crew.readView.particles.some((person) => person.x !== point.x || person.y !== point.y)).toBe(true);
  const player = new PlayerShip(ids.next(), point, config.player);
  player.applyDamage(10);
  crew.rescue(player, point, (event) => presentation.accept(event));
  expect(presentation.labels).toHaveLength(1);
  expect(presentation.labels[0]!.text).toMatch(/^\+[2-5]$/);
  expect(presentation.shake()).toEqual({ x: 0, y: 0 });
  crew.dispose();
  presentation.dispose();
});

test('rapid rescue feedback updates the same label, restarts its lifetime and splits after the interval', () => {
  const config = GameConfigFactory.create(OptionsConfig.Default);
  const world = new CollisionWorld(map(), config);
  const ids = new EntityIdSequence();
  const crew = new CrewSystem(config, world, ids);
  const presentation = new PresentationSystem(config, world, crew.readView, ids);
  const rescue = (crewId: number) =>
    presentation.accept({ kind: FeedbackKind.Rescue, crewId, point: config.playerSpawn, amount: 1 });
  rescue(1);
  const id = presentation.labels[0]!.id;
  expect(presentation.labels[0]!.text).toBe('+1');
  presentation.update(0.2);
  rescue(2);
  expect(presentation.labels).toHaveLength(1);
  expect(presentation.labels[0]).toMatchObject({ id, text: '+2', age: 0, alpha: 1 });
  presentation.update(0.2);
  rescue(3);
  expect(presentation.labels[0]).toMatchObject({ id, text: '+3', age: 0 });
  presentation.update(config.presentation.rescue.combineSeconds + config.fixedStep);
  rescue(4);
  expect(presentation.labels.map((label) => label.text)).toEqual(['+3', '+1']);
  expect(presentation.labels[1]!.id).not.toBe(id);
  presentation.update(config.presentation.score.lifetime + config.fixedStep);
  expect(presentation.labels).toHaveLength(0);
  rescue(5);
  expect(presentation.labels[0]!.text).toBe('+1');
  crew.dispose();
  presentation.dispose();
});
