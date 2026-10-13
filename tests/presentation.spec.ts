import { expect, test } from '@playwright/test';
import { readFileSync, readdirSync } from 'node:fs';
import { AudioConfig } from '../src/game/configuration/AudioConfig';
import { createGameConfig, DEFAULT_OPTIONS } from '../src/game/configuration/GameConfiguration';
import { GameConfigFactory } from '../src/game/configuration/GameConfigFactory';
import { ParticleKind } from '../src/game/configuration/PresentationConfig';
import { CollisionWorld } from '../src/game/core/CollisionWorld';
import { PresentationSystem } from '../src/game/presentation/PresentationSystem';
import { FeedbackKind } from '../src/game/contracts/FeedbackEvent';
import { Allegiance, Action } from '../src/game/contracts/GameDomain';
import { GameManager } from '../src/game/runtime/GameManager';
import type { LoadedMap } from '../src/game/assets/TiledMapLoader';

function map(): LoadedMap {
  const json = JSON.parse(readFileSync('assets/maps/arena_00.tmj', 'utf8'));
  return { width: json.width, height: json.height, tileWidth: json.tilewidth, tileHeight: json.tileheight,
    layers: [], tilesets: [], colliders: json.layers.find((layer: { name: string }) => layer.name === 'collisions').objects };
}

test('sinking emits 2–5 crew once, exercises six variants, remains on water and expires', () => {
  const config = createGameConfig(DEFAULT_OPTIONS);
  const world = new CollisionWorld(map(), config);
  const presentation = new PresentationSystem(config, world);
  const sprites = new Set<string>();
  for (let shipId = 0; shipId < 24; shipId++) {
    const event = { kind: FeedbackKind.Sunk, shipId, allegiance: Allegiance.Enemy,
      point: config.playerSpawn, angle: 0, visual: config.player.visual } as const;
    presentation.accept(event);
    presentation.accept(event);
    const emission = presentation.crewEmissions.find((crew) => crew.shipId === shipId)!;
    expect(emission.count).toBeGreaterThanOrEqual(2);
    expect(emission.count).toBeLessThanOrEqual(5);
    expect(presentation.crewEmissions.filter((crew) => crew.shipId === shipId)).toHaveLength(1);
    expect(presentation.particles.filter((particle) => particle.kind === ParticleKind.Crew && particle.sourceShipId === shipId)).toHaveLength(emission.count);
    for (const sprite of emission.sprites) sprites.add(sprite);
    presentation.update(0.6);
    for (const particle of presentation.particles.filter((particle) => particle.kind === ParticleKind.Crew)) {
      expect(world.isFree(particle, particle.profile.waterRadius)).toBe(true);
      expect(particle.age).toBeGreaterThan(0.45);
    }
    presentation.update(1.4);
  }
  expect([...sprites].sort()).toEqual([...config.presentation.profiles[ParticleKind.Crew].sprites].sort());
  expect(presentation.statistics().crew.exhausted).toBe(0);
  presentation.update(11);
  expect(presentation.particles).toHaveLength(0);
  expect(presentation.statistics().crew.active).toBe(0);
  presentation.dispose();
  expect(presentation.statistics().crew.capacity).toBe(0);
});

test('cosmetic events never modify combat, read ports omit commands and pause freezes all presentation', () => {
  const config = createGameConfig(DEFAULT_OPTIONS);
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
  expect(JSON.stringify({ time: game.presentation.time, particles: game.presentation.particles })).toBe(before);
  game.dispose();
  expect(game.presentation.particles).toHaveLength(0);
});

test('reduced motion removes shake/drift, keeps damage/score signals and prevents duplicate rewards', () => {
  const config = createGameConfig(DEFAULT_OPTIONS);
  const presentation = new PresentationSystem(config, new CollisionWorld(map(), config));
  presentation.setReducedMotion(true);
  presentation.accept({ kind: FeedbackKind.Damage, shipId: 1, allegiance: Allegiance.Player, point: config.playerSpawn, amount: 25 });
  const score = { kind: FeedbackKind.Score, shipId: 2, point: config.playerSpawn, points: 1 } as const;
  presentation.accept(score); presentation.accept(score);
  expect(presentation.labels.filter((label) => label.text === '+1')).toHaveLength(1);
  expect(presentation.labels.some((label) => label.text === '-25')).toBe(true);
  expect(presentation.shake()).toEqual({ x: 0, y: 0 });
  const positions = presentation.particles.map((particle) => ({ id: particle.id, x: particle.x, y: particle.y }));
  presentation.update(0.1);
  expect(presentation.particles.map((particle) => ({ id: particle.id, x: particle.x, y: particle.y }))).toEqual(positions);
  expect(presentation.shipFeedback(1)).not.toBeNull();
  presentation.dispose();
});

test('configuration rejects budgets that would silently omit required survivors', () => {
  const config = createGameConfig(DEFAULT_OPTIONS);
  expect(() => GameConfigFactory.validate({ ...config, presentation: { ...config.presentation,
    crewPool: { initialCapacity: 1, growthSize: 1, maxCapacity: 5 } } })).toThrow(/Crew capacity/);
});
test('audio catalog maps every supplied WAV and no synthesized substitute', () => {
  const supplied = readdirSync('assets/sounds').filter((file) => file.endsWith('.wav')).map((file) => file.slice(0, -4)).sort();
  expect(supplied).toHaveLength(27);
  expect([...AudioConfig.requiredSounds()].sort()).toEqual(supplied);
});
