import { Entity } from '../core/Entity';
import type { ICollisionWorld } from '../core/CollisionWorld';
import type { ParticleKind, ParticleProfile } from '../configuration/PresentationConfig';
import type { Point } from '../math/Geometry';

export interface ParticleActivation {
  readonly id: number;
  readonly kind: ParticleKind;
  readonly profile: ParticleProfile;
  readonly sprite: string;
  readonly point: Point;
  readonly angle: number;
  readonly vx: number;
  readonly vy: number;
  readonly phase: number;
  readonly driftSpeed: number;
  readonly sourceShipId: number | null;
}

export interface ParticleReadView extends Point {
  readonly id: number;
  readonly kind: ParticleKind;
  readonly profile: ParticleProfile;
  readonly sprite: string;
  readonly angle: number;
  readonly age: number;
  readonly alpha: number;
  readonly bob: number;
  readonly sourceShipId: number | null;
}

export class VisualParticle extends Entity {
  #activation: ParticleActivation | null = null;
  #vx = 0;
  #vy = 0;
  #angle = 0;
  #age = 0;
  readonly #view: ParticleReadView;

  constructor() {
    super(-1, { x: 0, y: 0 });
    this.#view = ((entity: VisualParticle) => Object.freeze({
      get id() { return entity.id; },
      get sourceShipId() { return entity.activation.sourceShipId; },
      get x() { return entity.x; },
      get y() { return entity.y; },
      get kind() { return entity.activation.kind; },
      get profile() { return entity.activation.profile; },
      get sprite() { return entity.activation.sprite; },
      get angle() { return entity.#angle; },
      get age() { return entity.#age; },
      get alpha() { return entity.alpha; },
      get bob() { return Math.sin(entity.#age * Math.PI * 2 * entity.activation.profile.bobFrequency + entity.activation.phase) * entity.activation.profile.bob; },
    }))(this);
  }

  private get activation(): ParticleActivation {
    if (!this.#activation) throw new Error('Inactive visual particle.');
    return this.#activation;
  }

  get view(): ParticleReadView { return this.#view; }
  get expired(): boolean { return this.#age >= this.activation.profile.lifetime; }
  get alpha(): number {
    const profile = this.activation.profile;
    const progress = this.#age / profile.lifetime;
    return profile.alpha * Math.max(0, Math.min(1, (1 - progress) / (1 - profile.fadeStart)));
  }

  activate(activation: ParticleActivation): void {
    if (this.#activation) throw new Error('Visual particle is already active.');
    this.#activation = Object.freeze({ ...activation, point: Object.freeze({ ...activation.point }) });
    this.resetIdentity(activation.id, activation.point);
    this.#vx = activation.vx;
    this.#vy = activation.vy;
    this.#angle = activation.angle;
    this.#age = 0;
  }

  update(dt: number, world: ICollisionWorld, motion = true): void {
    this.#age += dt;
    const activation = this.activation;
    const profile = activation.profile;
    if (profile.settleSeconds > 0 && this.#age >= profile.settleSeconds) {
      this.#vx = Math.cos(activation.phase) * activation.driftSpeed;
      this.#vy = Math.sin(activation.phase) * activation.driftSpeed;
    } else {
      this.#vx *= Math.exp(-profile.drag * dt);
      this.#vy *= Math.exp(-profile.drag * dt);
    }
    const destination = { x: this.x + this.#vx * dt, y: this.y + this.#vy * dt };
    if (motion && (!profile.waterOnly || world.isFree(destination, profile.waterRadius))) this.setPosition(destination);
    else this.#vx = this.#vy = 0;
    if (motion) this.#angle += profile.spin * dt;
  }

  reset(): void {
    this.#activation = null;
    this.resetIdentity(-1, { x: 0, y: 0 });
    this.#vx = this.#vy = this.#angle = this.#age = 0;
  }
}
