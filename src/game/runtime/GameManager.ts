import { freezeConfiguration } from '../core/Immutable';
import type { GameConfig } from '../contracts/GameConfig';

import type { LoadedMap } from '../assets/TiledMapLoader';
import { EffectKind, EndReason, GameEvent, MatchStatus } from '../contracts/GameDomain';
import type { Action } from '../contracts/GameDomain';
import { EntityIdSequence } from '../core/EntityIdSequence';
import { ContactKind, ShipCollisionWorld } from '../core/ShipCollisionWorld';
import { ShipFactory } from '../factories/ShipFactory';
import type { IShipFactory } from '../factories/ShipFactory';
import { FactoryConfig } from '../configuration/FactoryConfig';
import { GameConfigFactory } from '../configuration/GameConfigFactory';
import { ProjectileFactory } from '../factories/ProjectileFactory';
import { ProjectileSystem } from '../systems/ProjectileSystem';
import { EffectSystem } from '../systems/EffectSystem';
import { SpawnSystem } from '../systems/SpawnSystem';
import { WeaponController } from '../systems/WeaponController';
import { MatchState } from '../systems/MatchState';
import { DamageSystem } from '../systems/DamageSystem';
import type { PlayerShip } from '../entities/PlayerShip';
import { EnemyShip } from '../entities/EnemyShip';
import type { Ship as ShipEntity, ShipReadView } from '../entities/Ship';
import type { ProjectileReadView } from '../entities/Projectile';
import type { EffectReadView } from '../entities/Effect';
import { PresentationSystem } from '../presentation/PresentationSystem';
import type { PresentationReadView } from '../presentation/PresentationSystem';
import { FeedbackKind, ImpactKind } from '../contracts/FeedbackEvent';
import { CrewSystem } from '../systems/CrewSystem';
import { MatchStatistics } from '../systems/MatchStatistics';
import type { StatisticsSnapshot } from '../systems/MatchStatistics';
import type { GameReadView } from '../contracts/GameReadView';

export type { Action, EndReason, GameEvent } from '../contracts/GameDomain';
// Read ports deliberately exclude gameplay commands from UI/rendering consumers.
export type Ship = ShipReadView;
export type Projectile = ProjectileReadView;
export type Effect = EffectReadView;
export interface Snapshot {
  readonly status: MatchStatus;
  readonly elapsed: number;
  readonly remaining: number;
  readonly score: number;
  readonly health: number;
  readonly maxHealth: number;
  readonly enemies: number;
  readonly reason: EndReason | null;
  readonly statistics: StatisticsSnapshot;
  readonly weapons: ReturnType<WeaponController['readiness']>;
  readonly scorePulse: boolean;
}

/** Match aggregate: coordinates systems; concrete enemy behaviour belongs to subclasses. */
export class GameManager {
  readonly #readView: GameReadView;
  readonly #config: GameConfig;
  readonly #map: LoadedMap;
  readonly #world: ShipCollisionWorld;
  readonly #ids = new EntityIdSequence();
  readonly #factory: IShipFactory;
  readonly #player: PlayerShip;
  readonly #match: MatchState;
  readonly #projectiles: ProjectileSystem;
  readonly #effects: EffectSystem;
  readonly #spawning: SpawnSystem;
  readonly #damage: DamageSystem;
  readonly #weapons = new Map<number, WeaponController>();
  readonly #enemies: EnemyShip[] = [];
  #enemyView: readonly Ship[] = Object.freeze([]);
  /** Player and enemy read views, refreshed with the fleet, for presentation that follows every ship. */
  #shipViews: readonly Ship[] = Object.freeze([]);
  #events: GameEvent[] = [];
  #warnedTime = false;
  #disposed = false;
  readonly #contactAt = new Map<string, number>();
  readonly #presentation: PresentationSystem;
  readonly #crew: CrewSystem;
  readonly #statistics = new MatchStatistics();
  constructor(config: GameConfig, map: LoadedMap, factory?: IShipFactory) {
    this.#readView = createReadView(this);
    GameConfigFactory.validate(config);
    this.#config = freezeConfiguration(structuredClone(config));
    this.#map = map;
    this.#world = new ShipCollisionWorld(map, this.#config);
    this.#factory = factory ?? new ShipFactory(this.#config, FactoryConfig.Enemies);
    this.#match = new MatchState(this.#config);
    this.#spawning = new SpawnSystem(this.#config);
    this.#projectiles = new ProjectileSystem(
      new ProjectileFactory(this.#config.pools.projectiles, this.#ids),
    );
    this.#effects = new EffectSystem(this.#config, this.#ids);
    this.#crew = new CrewSystem(this.#config, this.#world, this.#ids);
    this.#presentation = new PresentationSystem(this.#config, this.#world, this.#crew.readView, this.#ids);
    this.#damage = new DamageSystem(
      this.#config,
      this.#effects,
      this.#match,
      (event) => this.#events.push(event),
      (event) => {
        this.#crew.accept(event);
        this.#presentation.accept(event);
      },
      this.#statistics,
    );
    this.#player = this.#factory.createPlayer(this.#ids.next());
    if (!this.#world.isFree(this.#player, this.#player.radius))
      throw new Error('Authored player spawn is obstructed.');
    for (const profile of Object.values(this.#config.enemies))
      for (const point of this.#config.spawnPoints)
        if (!this.#world.isFree(point, profile.radius))
          throw new Error(`Authored spawn is obstructed for ${profile.id}.`);
    this.#weapons.set(this.#player.id, this.#createWeapons(this.#player));
    this.#publishFleet();
  }
  get config(): GameConfig {
    return this.#config;
  }
  get readView(): GameReadView {
    return this.#readView;
  }
  get map(): LoadedMap {
    return this.#map;
  }
  get width(): number {
    return this.#world.width;
  }
  get height(): number {
    return this.#world.height;
  }
  get player(): Ship {
    return this.#player.view;
  }
  get enemies(): readonly Ship[] {
    return this.#enemyView;
  }
  get projectiles(): readonly Projectile[] {
    return this.#projectiles.readView;
  }
  get effects(): readonly Effect[] {
    return this.#effects.readView;
  }
  get presentation(): PresentationReadView {
    return this.#presentation.readView;
  }
  setReducedMotion(value: boolean): void {
    this.#presentation.setReducedMotion(value);
  }
  advancePresentation(dt: number): void {
    if (this.#disposed || this.status !== MatchStatus.Ended) return;
    this.#effects.update(dt);
    this.#crew.update(dt);
    this.#presentation.update(dt);
  }
  get status(): MatchStatus {
    return this.#match.status;
  }
  get elapsed(): number {
    return this.#match.elapsed;
  }
  get score(): number {
    return this.#match.score;
  }
  get reason(): EndReason | null {
    return this.#match.reason;
  }
  #publishFleet(): void {
    this.#enemyView = Object.freeze(this.#enemies.map((enemy) => enemy.view));
    this.#shipViews = Object.freeze([this.#player.view, ...this.#enemyView]);
  }
  /** Each significant island collision costs authored hull health; it is never a credited kill. */
  #damageOnIsland(shipId: number): void {
    const ship =
      shipId === this.#player.id ? this.#player : this.#enemies.find((enemy) => enemy.id === shipId);
    if (!ship?.alive) return;
    const damage = this.#config.collision.islandImpactDamage[ship.allegiance];
    if (damage > 0) this.#damage.apply(ship, damage, false);
  }
  #createWeapons(ship: ShipEntity): WeaponController {
    return new WeaponController(ship, this.#projectiles, this.#config.rules.clockTolerance);
  }
  #fire(ship: ShipEntity, action: Action): void {
    const weapon = this.#weapons.get(ship.id);
    if (!weapon) throw new Error('A ship requires its weapon controller.');
    weapon.tryFire(action, this.elapsed, (origin, angle, mount) => {
      this.#effects.emit(origin, EffectKind.Muzzle, angle);
      this.#events.push(mount.event);
      this.#statistics.fired(ship.allegiance, mount.longitudinalOffsets.length);
      this.#presentation.accept({
        kind: FeedbackKind.Shot,
        shipId: ship.id,
        allegiance: ship.allegiance,
        point: { ...origin },
        angle,
        weapon: mount.id,
      });
    });
  }
  pause(): void {
    this.#match.pause();
  }
  resume(): void {
    if (!this.#disposed) this.#match.resume();
  }
  step(dt: number, input: ReadonlySet<Action>): void {
    if (this.#disposed || this.status !== MatchStatus.Playing) return;
    dt = this.#match.advance(dt);
    if (!dt) return;
    const playerStart = { x: this.#player.x, y: this.#player.y };
    this.#crew.update(dt);
    this.#world.setBodies([this.#player, ...this.#enemies]);
    this.#player.update(dt, input, this.#world);
    this.#crew.rescue(this.#player, playerStart, (event) => this.#presentation.accept(event));
    for (const mount of this.#config.player.weapons)
      if (input.has(mount.id)) this.#fire(this.#player, mount.id);
    this.#spawning.update(this.elapsed, this.#player, this.#enemies, (profileId, point) => {
      const profile = this.#config.enemies[profileId];
      if (!profile) throw new Error(`Spawn references unregistered enemy ${profileId}.`);
      const heading = EnemyShip.spawnHeading(this.#world, point, this.#player, profile.radius);
      const ship = this.#factory.createEnemy(profileId, this.#ids.next(), point, heading);
      this.#enemies.push(ship);
      this.#weapons.set(ship.id, this.#createWeapons(ship));
      this.#publishFleet();
    });
    this.#world.setBodies([this.#player, ...this.#enemies]);
    for (const enemy of this.#enemies)
      enemy.update({
        target: this.#player,
        world: this.#world,
        elapsed: this.elapsed,
        dt,
        fleet: this.#enemyView,
        fire: (ship, action) => this.#fire(ship, action),
        damage: (ship, amount, credited) => this.#damage.apply(ship, amount, credited),
        event: (event) => this.#events.push(event),
      });
    for (const [key, elapsed] of this.#contactAt) {
      if (this.elapsed > elapsed + this.#config.collision.impactCooldown) this.#contactAt.delete(key);
    }
    for (const contact of this.#world.drainContacts()) {
      const ids =
        contact.targetId === null
          ? [contact.sourceId]
          : [contact.sourceId, contact.targetId].sort((a, b) => a - b);
      const key = `${contact.kind}:${ids.join(':')}`;
      if (
        contact.speed < this.#config.collision.minimumImpactSpeed ||
        this.elapsed < (this.#contactAt.get(key) ?? -Infinity) + this.#config.collision.impactCooldown
      )
        continue;
      this.#contactAt.set(key, this.elapsed);
      if (!this.#events.includes(GameEvent.ShipCollision)) this.#events.push(GameEvent.ShipCollision);
      this.#effects.emit(contact.point, EffectKind.Impact);
      this.#presentation.accept({ kind: FeedbackKind.Contact, contact, playerId: this.#player.id });
      if (contact.kind === ContactKind.Island) this.#damageOnIsland(contact.sourceId);
    }
    if (!this.#player.alive) {
      this.#match.finish(EndReason.Death);
      return;
    }
    this.#projectiles.update(
      dt,
      this.#player,
      this.#enemies,
      this.#world,
      (ship, amount, credited) => this.#damage.apply(ship, amount, credited),
      (point, impact) => {
        this.#events.push(impact === ImpactKind.Water ? GameEvent.WaterImpact : GameEvent.CoastImpact);
        this.#presentation.accept({ kind: FeedbackKind.ProjectileImpact, point, impact });
      },
    );
    let removed = false;
    for (let i = this.#enemies.length - 1; i >= 0; i--)
      if (!this.#enemies[i]!.alive) {
        this.#weapons.delete(this.#enemies[i]!.id);
        this.#enemies.splice(i, 1);
        removed = true;
      }
    if (removed) this.#publishFleet();
    this.#effects.update(dt);
    this.#presentation.update(dt, this.#projectiles.readView, this.#shipViews);
    if (this.#match.remaining <= this.#config.rules.timeWarning && !this.#warnedTime) {
      this.#warnedTime = true;
      this.#events.push(GameEvent.TimeWarning);
    }
    if (!this.#player.alive || this.#match.remaining <= this.#config.rules.clockTolerance)
      this.#match.finish(this.#player.alive ? EndReason.Time : EndReason.Death);
  }
  drainEvents(): GameEvent[] {
    const events = this.#events;
    this.#events = [];
    return events;
  }
  snapshot(): Snapshot {
    return {
      status: this.status,
      elapsed: this.elapsed,
      remaining: this.#match.remaining,
      score: this.score,
      health: this.#player.health,
      maxHealth: this.#player.maxHealth,
      enemies: this.#enemies.length,
      reason: this.reason,
      statistics: this.#statistics.snapshot(this.#player.health),
      weapons: this.#weapons.get(this.#player.id)!.readiness(this.elapsed),
      scorePulse: this.#presentation.scorePulse,
    };
  }
  observation() {
    return {
      player: this.#player.snapshot(),
      enemies: this.#enemies.map((e) => e.snapshot()),
      projectiles: this.#projectiles.projectiles.map((p) => p.snapshot()),
    };
  }
  poolStatistics() {
    return { projectiles: this.#projectiles.statistics(), effects: this.#effects.statistics() };
  }
  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#projectiles.dispose();
    this.#effects.dispose();
    this.#weapons.clear();
    this.#enemies.length = 0;
    this.#enemyView = Object.freeze([]);
    this.#shipViews = Object.freeze([]);
    this.#events.length = 0;
    this.#contactAt.clear();
    this.#world.setBodies([]);
    this.#world.drainContacts();
    this.#crew.dispose();
    this.#presentation.dispose();
  }
}

function createReadView(owner: GameManager): GameReadView {
  return Object.freeze({
    get config() {
      return owner.config;
    },
    get player() {
      return owner.player;
    },
    get enemies() {
      return owner.enemies;
    },
    get projectiles() {
      return owner.projectiles;
    },
    get effects() {
      return owner.effects;
    },
    get presentation() {
      return owner.presentation;
    },
  });
}
