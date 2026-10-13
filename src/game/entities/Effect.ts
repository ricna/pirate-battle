import { Entity } from '../core/Entity';
import type { EffectProfile } from '../contracts/GameConfig';
import type { EffectKind } from '../contracts/GameDomain';
import type { Point } from '../math/Geometry';
export interface EffectReadView extends Point { readonly id: number; readonly kind: EffectKind;
  readonly profile: EffectProfile; readonly angle: number; readonly age: number; readonly duration: number }

export class Effect extends Entity {
  #kind: EffectKind | null = null; #profile: EffectProfile | null = null; #angle = 0; #age = 0;
  readonly #view: EffectReadView;
  constructor() { super(-1, { x: 0, y: 0 });
    this.#view = ((entity) => Object.freeze({ get id() { return entity.id; }, get x() { return entity.x; }, get y() { return entity.y; },
      get kind() { return entity.kind; }, get profile() { return entity.profile; }, get angle() { return entity.angle; },
      get age() { return entity.age; }, get duration() { return entity.duration; } }))(this);
  }
  get view(): EffectReadView { return this.#view; }
  get kind(): EffectKind { if (!this.#kind) throw new Error('Inactive effect.'); return this.#kind; }
  get profile(): EffectProfile { if (!this.#profile) throw new Error('Inactive effect.'); return this.#profile; }
  get angle(): number { return this.#angle; }
  get age(): number { return this.#age; }
  get duration(): number { return this.profile.duration; }
  get expired(): boolean { return this.#age >= this.duration; }
  activate(id: number, point: Point, kind: EffectKind, profile: EffectProfile, angle: number): void {
    if (this.#profile) throw new Error('Effect is already active.');
    this.resetIdentity(id, point); this.#kind = kind; this.#profile = profile; this.#angle = angle; this.#age = 0;
  }
  update(dt: number): void { this.#age += dt; }
  reset(): void { this.resetIdentity(-1, { x: 0, y: 0 }); this.#kind = null; this.#profile = null; this.#angle = this.#age = 0; }
}
