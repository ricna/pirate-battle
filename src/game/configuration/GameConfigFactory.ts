import { Allegiance } from '../contracts/GameDomain';
import type { EnemyRegistration } from '../factories/ShipFactory';
import { FactoryConfig } from './FactoryConfig';
import { GameDefaults } from './GameDefaults';
import { PlayerShipConfig } from './PlayerShipConfig';
import { CollisionConfig } from './CollisionConfig';
import { CrewConfig } from './CrewConfig';
import { PresentationConfig, ParticleKind } from './PresentationConfig';
import type { GameConfig, ShipProfile } from '../contracts/GameConfig';
import { freezeConfiguration } from '../core/Immutable';

import type { Options } from '../../application/configuration/Options';
import { OptionsConfig } from '../../application/configuration/OptionsConfig';

function finite(value: number, label: string, minimum = 0): void {
  if (!Number.isFinite(value) || value < minimum) throw new Error(`Invalid configuration: ${label}.`);
}
function positive(value: number, label: string): void {
  finite(value, label);
  if (value === 0) throw new Error(`Configuration ${label} must be positive.`);
}
function movement(
  profile: { initialSpeed: number; maxSpeed: number; acceleration: number; deceleration: number },
  label: string,
): void {
  finite(profile.initialSpeed, label);
  positive(profile.maxSpeed, label);
  finite(profile.acceleration, label);
  finite(profile.deceleration, label);
  if (profile.initialSpeed > profile.maxSpeed)
    throw new Error(`${label} initial speed exceeds maximum speed.`);
}
function stages(items: readonly { minimumHealthRatio: number; sprite: string }[], label: string): void {
  if (!items.length || items.at(-1)!.minimumHealthRatio !== 0)
    throw new Error(`${label} requires a final zero threshold.`);
  let previous = Infinity;
  for (const item of items) {
    finite(item.minimumHealthRatio, label);
    if (item.minimumHealthRatio > 1 || item.minimumHealthRatio >= previous || !item.sprite)
      throw new Error(`Invalid ${label} order or sprite.`);
    previous = item.minimumHealthRatio;
  }
}
function validateShip(profile: ShipProfile): void {
  if (!profile.id) throw new Error('A ship profile requires an ID.');
  positive(profile.health, profile.id);
  positive(profile.radius, profile.id);
  movement(profile.movement, profile.id);
  positive(profile.movement.acceleration, `${profile.id} acceleration`);
  positive(profile.movement.deceleration, `${profile.id} deceleration`);
  positive(profile.movement.turnSpeed, profile.id);
  const ids = new Set<string>();
  for (const weapon of profile.weapons) {
    if (ids.has(weapon.id)) throw new Error(`Duplicate weapon mount on ${profile.id}.`);
    ids.add(weapon.id);
    positive(weapon.cooldown, weapon.id);
    finite(weapon.muzzleOffset, weapon.id);
    finite(Math.abs(weapon.angleOffset), weapon.id);
    if (!weapon.longitudinalOffsets.length || !weapon.longitudinalOffsets.every(Number.isFinite))
      throw new Error(`Invalid barrels on ${profile.id}.`);
    const projectile = weapon.projectile;
    movement(projectile, projectile.id);
    positive(projectile.damage, projectile.id);
    positive(projectile.radius, projectile.id);
    positive(projectile.lifetime, projectile.id);
    positive(projectile.width, projectile.id);
    positive(projectile.height, projectile.id);
    if (!projectile.sprite) throw new Error('A projectile requires an authored sprite.');
  }
  const visual = profile.visual;
  positive(profile.hullRadius, `${profile.id} hull radius`);
  if (profile.hullRadius <= visual.width / 2)
    throw new Error(`Hull radius must exceed half of ${profile.id}'s configured sprite width.`);
  if (!visual.wreckSprite) throw new Error(`Missing wreck sprite for ${profile.id}.`);
  stages(visual.damageStages, profile.id);
  stages(visual.healthFills, profile.id);
  for (const value of [
    visual.width,
    visual.height,
    visual.healthScale,
    visual.fireWidth,
    visual.fireHeight,
    visual.fireFramesPerSecond,
  ])
    positive(value, profile.id);
  finite(Math.abs(visual.angleOffset), profile.id);
  finite(Math.abs(visual.healthOffsetY), profile.id);
  finite(visual.fireThreshold, profile.id);
  if (
    visual.fireThreshold > 1 ||
    !visual.healthFrame ||
    !visual.fireSprites.length ||
    visual.fireSprites.some((s) => !s)
  )
    throw new Error(`Invalid visuals for ${profile.id}.`);
  if (profile.ai) {
    const ai = profile.ai;
    for (const value of [
      ai.routeInterval,
      ai.waypointArrival,
      ai.movementCone,
      ai.firingCone,
      ai.lookAhead,
      ai.avoidanceStep,
      ai.separationDistance,
      ai.stuckSeconds,
      ai.stuckDistance,
      ai.recoverySeconds,
      ai.headingResponse,
    ])
      positive(value, profile.id);
    finite(ai.range, profile.id);
    finite(ai.ramDamage, profile.id);
    finite(ai.separationWeight, profile.id);
    if (ai.turningSpeedRatio <= 0 || ai.turningSpeedRatio > 1)
      throw new Error(`Turning speed ratio of ${profile.id} must be in (0, 1].`);
    if (ai.avoidanceStep > Math.PI)
      throw new Error(`Avoidance step of ${profile.id} must not exceed a half turn.`);
  }
}
/** Fleet sizes come first because pool budgets are derived from them. */
function spawnCounts(config: GameConfig): void {
  const spawning = config.spawning;
  if (!Number.isInteger(spawning.maxCount) || spawning.maxCount <= 0)
    throw new Error('Invalid enemy capacity.');
  if (
    !Number.isInteger(spawning.initialCount) ||
    spawning.initialCount < 0 ||
    spawning.initialCount > spawning.maxCount
  )
    throw new Error('The opening fleet must be a whole number of enemies within the enemy capacity.');
  if (!Number.isInteger(spawning.sunkEnemiesPerReinforcement) || spawning.sunkEnemiesPerReinforcement <= 0)
    throw new Error('Sunk enemies per reinforcement must be a positive integer.');
  if (!Number.isInteger(spawning.farthestPointChoices) || spawning.farthestPointChoices <= 0)
    throw new Error('Farthest spawn point choices must be a positive integer.');
  if (
    !Number.isInteger(spawning.recentPointsExcluded) ||
    spawning.recentPointsExcluded < 0 ||
    spawning.recentPointsExcluded >= config.spawnPoints.length
  )
    throw new Error('Recently used spawn points must leave at least one authored point available.');
}
export class GameConfigFactory {
  private constructor() {}
  static create(
    options: Options,
    registrations: readonly EnemyRegistration[] = FactoryConfig.Enemies,
  ): GameConfig {
    if (!OptionsConfig.isValid(options)) throw new Error('Invalid game options.');
    const enemies: Record<string, ShipProfile> = Object.create(null) as Record<string, ShipProfile>;
    for (const { profile } of registrations) {
      if (Object.hasOwn(enemies, profile.id)) throw new Error('Duplicate enemy profile ID.');
      enemies[profile.id] = profile;
    }
    const config: GameConfig = structuredClone({
      version: GameDefaults.Version,
      seed: GameDefaults.Seed,
      fixedStep: GameDefaults.FixedStep,
      sessionSeconds: options.sessionSeconds,
      spawnSeconds: options.spawnSeconds,
      player: PlayerShipConfig.Default,
      playerSpawn: GameDefaults.PlayerSpawn,
      enemies,
      spawning: GameDefaults.Spawning,
      spawnPoints: GameDefaults.SpawnPoints,
      pools: GameDefaults.Pools,
      effects: GameDefaults.Effects,
      rules: GameDefaults.Rules,
      collision: CollisionConfig.Default,
      presentation: PresentationConfig.Default,
      crew: CrewConfig.Default,
      random: GameDefaults.Random,
      runtime: GameDefaults.Runtime,
    });
    GameConfigFactory.validate(config);
    return freezeConfiguration(config);
  }
  static validate(config: GameConfig): void {
    spawnCounts(config);
    positive(config.crew.radius, 'crew collider radius');
    positive(config.crew.healthPerRescue, 'crew rescue health');
    if (!Number.isInteger(config.crew.healthPerRescue) || !Number.isInteger(config.crew.seedSalt))
      throw new Error('Crew rescue health and seed salt must be integers.');
    const presentation = config.presentation;
    positive(presentation.rescue.combineSeconds, 'rescue label grouping interval');
    if (presentation.rescue.combineSeconds >= presentation.score.lifetime)
      throw new Error('Rescue grouping interval must be shorter than the floating label lifetime.');
    if (config.crew.radius > presentation.profiles[ParticleKind.Crew].waterRadius)
      throw new Error('Crew collider must fit inside its authored water clearance.');
    if (
      !Number.isInteger(presentation.rescue.color) ||
      presentation.rescue.color < 0 ||
      presentation.rescue.color > 0xffffff ||
      !Number.isFinite(presentation.rescue.offsetY)
    )
      throw new Error('Invalid crew rescue label settings.');
    finite(presentation.crew.foamPulse, 'foam pulse');
    if (presentation.crew.foamPulse >= 1 || !presentation.score.fontFamily)
      throw new Error('Invalid foam pulse or feedback font.');
    for (const profile of [config.player, ...Object.values(config.enemies)]) {
      if (profile.radius < presentation.profiles[ParticleKind.Crew].waterRadius)
        throw new Error('Ship radius must allow the authored crew clearance at a coastal sinking.');
    }
    for (const [kind, profile] of Object.entries(presentation.profiles)) {
      for (const value of [
        profile.width,
        profile.height,
        profile.lifetime,
        profile.bobFrequency,
        profile.waterRadius,
      ])
        positive(value, `${kind} presentation`);
      for (const value of [
        profile.alpha,
        profile.fadeStart,
        profile.drag,
        profile.bob,
        profile.settleSeconds,
      ])
        finite(value, `${kind} presentation`);
      if (
        profile.alpha > 1 ||
        profile.fadeStart >= 1 ||
        profile.settleSeconds > profile.lifetime ||
        !Number.isFinite(profile.spin) ||
        !profile.sprites.length ||
        profile.sprites.some((sprite) => !sprite)
      )
        throw new Error(`Invalid ${kind} presentation profile.`);
    }
    const shipTrail = presentation.shipTrail;
    for (const value of [shipTrail.sampleSeconds, shipTrail.lifetime, shipTrail.width, shipTrail.alpha])
      positive(value, 'ship trail settings');
    finite(shipTrail.sternRatio, 'ship trail stern ratio');
    finite(shipTrail.minimumSpeedRatio, 'ship trail minimum speed ratio');
    if (
      !shipTrail.sprite ||
      shipTrail.alpha > 1 ||
      shipTrail.minimumSpeedRatio >= 1 ||
      shipTrail.lifetime <= shipTrail.sampleSeconds ||
      !Number.isInteger(shipTrail.ropePoints) ||
      shipTrail.ropePoints < 2
    )
      throw new Error('Invalid ship trail settings.');
    // Every live ship (enemy cap plus the player) must be able to show its trail.
    if (shipTrail.pool.maxCapacity < config.spawning.maxCount + 1)
      throw new Error('Ship trail capacity must cover every live ship.');
    for (const pool of [presentation.particles, presentation.crewPool, shipTrail.pool]) {
      if (
        ![pool.initialCapacity, pool.growthSize, pool.maxCapacity].every(Number.isInteger) ||
        pool.initialCapacity < 0 ||
        pool.growthSize <= 0 ||
        pool.maxCapacity <= 0 ||
        pool.initialCapacity > pool.maxCapacity
      )
        throw new Error('Invalid presentation pool.');
    }
    if (presentation.crew.minimum !== 2 || presentation.crew.maximum !== 5)
      throw new Error('Every sinking must emit 2–5 crew.');
    // Sinkings while survivors still float: the whole live fleet, the interval spawns and one generation of
    // the reinforcements those sinkings call in.
    const fleetSinkings =
      config.spawning.maxCount +
      Math.ceil(presentation.profiles[ParticleKind.Crew].lifetime / config.spawnSeconds) +
      1;
    const reinforcementSinkings = Math.ceil(fleetSinkings / config.spawning.sunkEnemiesPerReinforcement);
    const requiredCrew = presentation.crew.maximum * (fleetSinkings + reinforcementSinkings);
    if (presentation.crewPool.maxCapacity < requiredCrew)
      throw new Error(
        `Crew capacity requires at least ${requiredCrew} slots for this spawn/lifetime budget.`,
      );
    for (const value of [
      presentation.eventHistoryCapacity,
      presentation.debris.hitCount,
      presentation.debris.sunkCount,
      presentation.score.maxCount,
    ]) {
      if (!Number.isInteger(value) || value <= 0)
        throw new Error('Presentation counts must be positive integers.');
    }
    for (const value of [
      presentation.crew.scatterSpeed,
      presentation.crew.driftSpeed,
      presentation.crew.foamScale,
      presentation.debris.speed,
      presentation.trail.interval,
      presentation.trail.offset,
      presentation.recoil.distance,
      presentation.recoil.duration,
      presentation.damage.flashSeconds,
      presentation.damage.shakeSeconds,
      presentation.damage.shakeAmplitude,
      presentation.damage.ramMultiplier,
      presentation.damage.shakeFrequency,
      presentation.score.lifetime,
      presentation.score.rise,
      presentation.score.fontSize,
      presentation.score.hudSeconds,
      presentation.terminalSeconds,
      presentation.victory.seconds,
      presentation.victory.fadeOutSeconds,
      presentation.terminalFadeInSeconds,
      presentation.resultFadeSeconds,
      presentation.resultCountSeconds,
      presentation.water.overscan,
    ])
      positive(value, 'presentation settings');
    if (presentation.victory.fadeOutSeconds > presentation.victory.seconds)
      throw new Error('Victory fade must fit inside the terminal presentation window.');
    if (
      !presentation.crew.foamSprite ||
      !presentation.score.prefix ||
      !presentation.water.sprite ||
      !presentation.water.layer ||
      !Number.isInteger(presentation.water.gid) ||
      presentation.water.gid <= 0 ||
      !Number.isInteger(presentation.seedSalt) ||
      !Number.isFinite(presentation.water.speedX) ||
      !Number.isFinite(presentation.water.speedY)
    )
      throw new Error('Invalid presentation references or timing.');
    finite(presentation.score.fadeStart, 'label fade');
    if (
      presentation.score.fadeStart >= 1 ||
      !Number.isFinite(presentation.score.offsetY) ||
      !Number.isFinite(presentation.damage.labelOffsetY)
    )
      throw new Error('Invalid floating-label settings.');
    positive(config.collision.separation, 'collision separation');
    positive(config.collision.minimumImpactSpeed, 'impact speed');
    positive(config.collision.impactCooldown, 'impact cooldown');
    if (!Number.isInteger(config.collision.slideIterations) || config.collision.slideIterations <= 0) {
      throw new Error('Collision slide iterations must be a positive integer.');
    }
    for (const allegiance of Object.values(Allegiance)) {
      const damage = config.collision.islandImpactDamage[allegiance];
      if (!Number.isInteger(damage) || damage < 0)
        throw new Error(`Island impact damage for ${allegiance} must be a non-negative integer.`);
    }
    validateShip(config.player);
    if (!config.player.weapons.length) throw new Error('The player requires at least one authored weapon.');
    if (config.player.allegiance !== Allegiance.Player || config.player.ai)
      throw new Error('Invalid player profile.');
    for (const [id, profile] of Object.entries(config.enemies)) {
      validateShip(profile);
      if (id !== profile.id || profile.allegiance !== Allegiance.Enemy || !profile.ai)
        throw new Error('Invalid enemy profile.');
    }
    positive(config.fixedStep, 'fixed step');
    positive(config.sessionSeconds, 'session');
    positive(config.spawnSeconds, 'spawn interval');
    if (config.fixedStep > config.sessionSeconds) throw new Error('Fixed step exceeds session duration.');
    if (!Number.isInteger(config.seed) || config.seed < 0 || config.seed >= config.random.modulus)
      throw new Error('Invalid seed.');
    positive(config.spawning.safeDistance, 'safe spawn distance');
    if (!Number.isFinite(config.spawning.hullSeparation) || config.spawning.hullSeparation < 1) {
      throw new Error('Spawn hull separation must keep new hulls from overlapping (at least 1).');
    }
    const largestEnemyHull = Math.max(...Object.values(config.enemies).map((profile) => profile.hullRadius));
    if (config.spawning.safeDistance < config.player.hullRadius + largestEnemyHull) {
      throw new Error('Safe spawn distance must keep a new enemy hull clear of the player hull.');
    }
    if (
      !config.spawnPoints.length ||
      ![config.playerSpawn, ...config.spawnPoints].every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
    )
      throw new Error('Invalid spawn points.');
    if (!config.spawning.weights.length) throw new Error('Enemy spawn weights are required.');
    for (const weight of config.spawning.weights) {
      positive(weight.weight, 'spawn weight');
      if (!Object.hasOwn(config.enemies, weight.profileId))
        throw new Error('Spawn weight references an unregistered enemy.');
    }
    for (const id of config.spawning.initialSequence)
      if (!Object.hasOwn(config.enemies, id))
        throw new Error('Initial spawn references an unregistered enemy.');
    for (const pool of Object.values(config.pools)) {
      if (
        ![pool.initialCapacity, pool.growthSize, pool.maxCapacity].every(Number.isInteger) ||
        pool.initialCapacity < 0 ||
        pool.growthSize <= 0 ||
        pool.maxCapacity <= 0 ||
        pool.initialCapacity > pool.maxCapacity
      )
        throw new Error('Invalid pool settings.');
    }
    const largestSalvo = Math.max(
      ...[config.player, ...Object.values(config.enemies)].flatMap((p) =>
        p.weapons.map((w) => w.longitudinalOffsets.length),
      ),
    );
    if (config.pools.projectiles.maxCapacity < largestSalvo)
      throw new Error('Projectile pool cannot hold the largest salvo.');
    for (const effect of Object.values(config.effects)) {
      positive(effect.duration, 'effect lifetime');
      positive(effect.size, 'effect size');
      finite(effect.fade, 'effect fade');
      if (effect.fade > 1 || !effect.sprites.length || effect.sprites.some((s) => !s))
        throw new Error('Invalid effect configuration.');
    }
    for (const value of Object.values(config.rules)) finite(value, 'match rules');
    if (!Number.isInteger(config.rules.pointsPerKill) || config.rules.lowHealthRatio > 1)
      throw new Error('Invalid score or health threshold.');
    positive(config.rules.clockTolerance, 'clock tolerance');
    positive(config.rules.geometryTolerance, 'geometry tolerance');
    positive(config.rules.movementStepRadiusRatio, 'movement collision substep');
    if (config.rules.movementStepRadiusRatio > 1)
      throw new Error('Movement collision substep must not exceed the ship radius.');
    for (const value of [
      config.runtime.maxFrameSeconds,
      config.runtime.hudIntervalMs,
      config.runtime.maxResolution,
      config.runtime.maxFrameSamples,
      config.runtime.maxTestAdvance,
    ])
      positive(value, 'runtime settings');
    finite(config.runtime.profileWarmupSeconds, 'profiling warmup');
    finite(config.runtime.mapProgressWeight, 'map progress weight');
    if (!Number.isInteger(config.runtime.staticMapResolution) || config.runtime.staticMapResolution <= 0)
      throw new Error('Static map resolution must be a positive integer to preserve whole-pixel tile edges.');
    if (config.runtime.mapProgressWeight > 1) throw new Error('Invalid map progress weight.');
    for (const value of Object.values(config.random)) positive(value, 'random settings');
    if (
      config.random.modulus !== 2 ** 32 ||
      !Number.isInteger(config.random.multiplier) ||
      !Number.isInteger(config.random.increment)
    )
      throw new Error('The seeded generator requires unsigned 32-bit integer settings.');
  }
}
