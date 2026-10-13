import { ObjectPool } from '../core/ObjectPool';
import { EntityIdSequence } from '../core/EntityIdSequence';
import type { ICollisionWorld } from '../core/CollisionWorld';
import type { GameConfig, ShipVisualProfile } from '../contracts/GameConfig';
import { ParticleKind } from '../configuration/PresentationConfig';
import type { ParticleProfile } from '../configuration/PresentationConfig';
import { Allegiance } from '../contracts/GameDomain';
import type { ProjectileReadView } from '../entities/Projectile';
import type { Point } from '../math/Geometry';
import { FeedbackKind } from '../contracts/FeedbackEvent';
import type { FeedbackEvent } from '../contracts/FeedbackEvent';
import { CosmeticRandom } from './CosmeticRandom';
import { VisualParticle } from './VisualParticle';
import type { ParticleReadView } from './VisualParticle';

export interface ShipFeedback {
  readonly damageAt: number;
  readonly shotAt: number;
  readonly shotAngle: number;
}
export interface FloatingScore extends Point { readonly id: number; readonly age: number; readonly alpha: number; readonly text: string; readonly color: number }
export interface CrewEmission { readonly shipId: number; readonly count: number; readonly at: number; readonly sprites: readonly string[] }
export interface PresentationReadView {
  readonly time: number;
  readonly particles: readonly ParticleReadView[];
  readonly labels: readonly FloatingScore[];
  readonly crewEmissions: readonly CrewEmission[];
  readonly scorePulse: boolean;
  readonly reducedMotion: boolean;
  shipFeedback(id: number): ShipFeedback | null;
  shake(): Point;
  statistics(): ReturnType<PresentationSystem['statistics']>;
}
interface ParticleEmission {
  readonly angle?: number;
  readonly speed?: number;
  readonly sprite?: string;
  readonly profile?: ParticleProfile;
  readonly sourceShipId?: number;
}

/** Bounded cosmetic simulation. It reads world geometry; it has no damage/score/movement commands. */
export class PresentationSystem {
  readonly #config: GameConfig;
  readonly #world: ICollisionWorld;
  readonly #random: CosmeticRandom;
  readonly #ids = new EntityIdSequence();
  readonly #pool: ObjectPool<VisualParticle>;
  readonly #crewPool: ObjectPool<VisualParticle>;
  readonly #feedback = new Map<number, ShipFeedback>();
  readonly #trailAt = new Map<number, number>();
  readonly #sunkIds = new Set<number>();
  readonly #scoredIds = new Set<number>();
  #active: VisualParticle[] = [];
  #view: readonly ParticleReadView[] = Object.freeze([]);
  #labels: readonly (Point & { readonly id: number; readonly at: number; readonly text: string; readonly color: number })[] = [];
  #crews: readonly CrewEmission[] = [];
  #time = 0;
  #shakeAt = -Infinity;
  #shakeStrength = 0;
  #scoreAt = -Infinity;
  #reducedMotion = false;
  #disposed = false;
  readonly #readView: PresentationReadView;

  constructor(config: GameConfig, world: ICollisionWorld) {
    this.#config = config;
    this.#world = world;
    this.#random = new CosmeticRandom(config.seed ^ config.presentation.seedSalt, config.random);
    this.#pool = new ObjectPool(config.presentation.particles, () => new VisualParticle(), (particle) => particle.reset());
    this.#crewPool = new ObjectPool(config.presentation.crewPool, () => new VisualParticle(), (particle) => particle.reset());
    this.#readView = ((system: PresentationSystem) => Object.freeze({
      get time() { return system.time; }, get particles() { return system.particles; },
      get labels() { return system.labels; }, get crewEmissions() { return system.crewEmissions; },
      get scorePulse() { return system.scorePulse; }, get reducedMotion() { return system.reducedMotion; },
      shipFeedback: (id: number) => system.shipFeedback(id), shake: () => system.shake(), statistics: () => system.statistics(),
    }))(this);
  }

  get readView(): PresentationReadView { return this.#readView; }
  get time(): number { return this.#time; }
  get particles(): readonly ParticleReadView[] { return this.#view; }
  get crewEmissions(): readonly CrewEmission[] { return this.#crews; }
  get reducedMotion(): boolean { return this.#reducedMotion; }
  get scorePulse(): boolean { return this.#time - this.#scoreAt < this.#config.presentation.score.hudSeconds; }
  get labels(): readonly FloatingScore[] {
    const profile = this.#config.presentation.score;
    return this.#labels.map((label) => Object.freeze({ id: label.id, x: label.x, text: label.text, color: label.color,
      y: label.y - (this.#reducedMotion ? 0 : (this.#time - label.at) / profile.lifetime * profile.rise),
      age: this.#time - label.at, alpha: Math.max(0, Math.min(1, (1 - (this.#time - label.at) / profile.lifetime) / (1 - profile.fadeStart))) }));
  }

  setReducedMotion(value: boolean): void { this.#reducedMotion = value; }
  shipFeedback(id: number): ShipFeedback | null { return this.#feedback.get(id) ?? null; }
  shake(): Point {
    const profile = this.#config.presentation.damage;
    const age = this.#time - this.#shakeAt;
    if (this.#reducedMotion || age >= profile.shakeSeconds) return { x: 0, y: 0 };
    const amplitude = this.#shakeStrength * (1 - age / profile.shakeSeconds);
    return { x: Math.sin(age * profile.shakeFrequency) * amplitude, y: Math.cos(age * profile.shakeFrequency) * amplitude };
  }

  #emit(kind: ParticleKind, point: Point, options: ParticleEmission = {}): void {
    const profile = options.profile ?? this.#config.presentation.profiles[kind];
    if (profile.waterOnly && !this.#world.isFree(point, profile.waterRadius)) {
      if (kind === ParticleKind.Crew) throw new Error('Crew emission requires validated water clearance.');
      return;
    }
    const pool = kind === ParticleKind.Crew ? this.#crewPool : this.#pool;
    const particle = pool.acquire();
    if (!particle) {
      if (kind === ParticleKind.Crew) throw new Error('Configured crew capacity cannot satisfy the required survivor count.');
      return;
    }
    const selected = options.sprite ?? profile.sprites[Math.floor(this.#random.next() * profile.sprites.length)];
    if (!selected) throw new Error('Presentation requires an explicit authored sprite.');
    const angle = options.angle ?? 0;
    const speed = options.speed ?? 0;
    particle.activate({ id: this.#ids.next(), kind, profile, sprite: selected, point, sourceShipId: options.sourceShipId ?? null,
      angle, vx: Math.sin(angle) * speed, vy: -Math.cos(angle) * speed,
      phase: this.#random.between(0, Math.PI * 2), driftSpeed: this.#config.presentation.crew.driftSpeed });
    this.#active.push(particle);
  }

  #debris(point: Point, count: number, sourceShipId: number): void {
    const speed = this.#config.presentation.debris.speed;
    for (let index = 0; index < count; index++) this.#emit(ParticleKind.Debris, point,
      { angle: this.#random.between(0, Math.PI * 2), speed: this.#random.between(speed / 2, speed), sourceShipId });
  }

  #sunk(shipId: number, point: Point, angle: number, visual: ShipVisualProfile): void {
    if (this.#sunkIds.has(shipId)) return;
    this.#sunkIds.add(shipId);
    const settings = this.#config.presentation;
    const count = Math.floor(this.#random.between(settings.crew.minimum, settings.crew.maximum + 1));
    if (this.#crewPool.available < count) throw new Error('Crew pool must reserve every survivor in a sinking group.');
    const profile = settings.profiles[ParticleKind.Crew];
    const sprites: string[] = [];
    for (let index = 0; index < count; index++) {
      const sprite = profile.sprites[Math.floor(this.#random.next() * profile.sprites.length)]!;
      sprites.push(sprite);
      this.#emit(ParticleKind.Crew, point, { angle: index / count * Math.PI * 2 + this.#random.between(0, Math.PI / count),
        speed: settings.crew.scatterSpeed, sprite, sourceShipId: shipId });
    }
    this.#crews = Object.freeze([...this.#crews, Object.freeze({ shipId, count, at: this.#time, sprites: Object.freeze(sprites) })]
      .slice(-settings.eventHistoryCapacity));
    const wreckSprite = visual.wreckSprite;
    if (!wreckSprite) throw new Error('Sinking requires an authored damage-stage sprite.');
    this.#emit(ParticleKind.Wreck, point, { angle: angle + visual.angleOffset, sprite: wreckSprite, sourceShipId: shipId,
      profile: Object.freeze({ ...settings.profiles[ParticleKind.Wreck], width: visual.width, height: visual.height }) });
    this.#debris(point, settings.debris.sunkCount, shipId);
  }

  accept(event: FeedbackEvent): void {
    if (this.#disposed) return;
    const settings = this.#config.presentation;
    switch (event.kind) {
      case FeedbackKind.Shot: {
        const old = this.#feedback.get(event.shipId);
        this.#feedback.set(event.shipId, Object.freeze({ damageAt: old?.damageAt ?? -Infinity, shotAt: this.#time, shotAngle: event.angle }));
        break;
      }
      case FeedbackKind.Damage: {
        const old = this.#feedback.get(event.shipId);
        this.#feedback.set(event.shipId, Object.freeze({ damageAt: this.#time, shotAt: old?.shotAt ?? -Infinity, shotAngle: old?.shotAngle ?? 0 }));
        this.#debris(event.point, settings.debris.hitCount, event.shipId);
        this.#labels = Object.freeze([...this.#labels, Object.freeze({ ...event.point, id: this.#ids.next(), at: this.#time,
          y: event.point.y + settings.damage.labelOffsetY,
          text: `-${event.amount}`, color: settings.damage.labelColor })].slice(-settings.score.maxCount));
        if (event.allegiance === Allegiance.Player) { this.#shakeAt = this.#time; this.#shakeStrength = settings.damage.shakeAmplitude; }
        break;
      }
      case FeedbackKind.Sunk:
        this.#sunk(event.shipId, event.point, event.angle, event.visual);
        break;
      case FeedbackKind.Score:
        if (this.#scoredIds.has(event.shipId)) break;
        this.#scoredIds.add(event.shipId);
        this.#scoreAt = this.#time;
        this.#labels = Object.freeze([...this.#labels, Object.freeze({ ...event.point, id: this.#ids.next(), at: this.#time,
          y: event.point.y + settings.score.offsetY, text: `${settings.score.prefix}${event.points}`, color: settings.score.color })].slice(-settings.score.maxCount));
        break;
      case FeedbackKind.Contact:
        this.#emit(ParticleKind.Splash, event.contact.point);
        if (event.contact.sourceId === event.playerId || event.contact.targetId === event.playerId) {
          this.#shakeAt = this.#time; this.#shakeStrength = settings.damage.shakeAmplitude * settings.damage.ramMultiplier;
        }
        break;
      case FeedbackKind.ProjectileImpact:
        this.#emit(ParticleKind.Splash, event.point);
        break;
    }
    this.#publish();
  }

  update(dt: number, projectiles: readonly ProjectileReadView[] = []): void {
    if (this.#disposed) return;
    this.#time += dt;
    for (const particle of this.#active) particle.update(dt, this.#world, !this.#reducedMotion);
    this.#active = this.#active.filter((particle) => {
      if (!particle.expired) return true;
      const pool = particle.view.kind === ParticleKind.Crew ? this.#crewPool : this.#pool;
      pool.release(particle);
      return false;
    });
    for (const projectile of projectiles) {
      if (this.#time < (this.#trailAt.get(projectile.id) ?? -Infinity) + this.#config.presentation.trail.interval) continue;
      this.#trailAt.set(projectile.id, this.#time);
      const angle = Math.atan2(projectile.vx, -projectile.vy);
      const offset = this.#config.presentation.trail.offset;
      this.#emit(ParticleKind.Trail, { x: projectile.x - Math.sin(angle) * offset, y: projectile.y + Math.cos(angle) * offset }, { angle });
    }
    const projectileIds = new Set(projectiles.map((projectile) => projectile.id));
    for (const id of this.#trailAt.keys()) if (!projectileIds.has(id)) this.#trailAt.delete(id);
    const longestFeedback = Math.max(this.#config.presentation.damage.flashSeconds, this.#config.presentation.recoil.duration);
    for (const [id, feedback] of this.#feedback) if (this.#time > Math.max(feedback.damageAt, feedback.shotAt) + longestFeedback) this.#feedback.delete(id);
    this.#labels = this.#labels.filter((label) => this.#time - label.at < this.#config.presentation.score.lifetime);
    this.#crews = this.#crews.filter((crew) => this.#time - crew.at < this.#config.presentation.profiles[ParticleKind.Crew].lifetime);
    this.#publish();
  }

  #publish(): void { this.#view = Object.freeze(this.#active.map((particle) => particle.view)); }
  statistics() { return { particles: this.#pool.statistics(), crew: this.#crewPool.statistics() }; }
  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#active.length = 0;
    this.#pool.dispose((particle) => particle.reset());
    this.#crewPool.dispose((particle) => particle.reset());
    this.#feedback.clear(); this.#trailAt.clear();
    this.#sunkIds.clear(); this.#scoredIds.clear();
    this.#labels = []; this.#crews = []; this.#publish();
  }
}
