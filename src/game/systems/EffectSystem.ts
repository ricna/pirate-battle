import { ObjectPool } from '../core/ObjectPool';
import type { EntityIdSequence } from '../core/EntityIdSequence';
import { Effect } from '../entities/Effect';
import type { EffectReadView } from '../entities/Effect';
import type { EffectKind } from '../contracts/GameDomain';
import type { GameConfig } from '../contracts/GameConfig';
import type { Point } from '../math/Geometry';

export class EffectSystem {
  readonly #pool: ObjectPool<Effect>; readonly #config: GameConfig; readonly #ids: EntityIdSequence;
  #active: Effect[] = []; #view: readonly Effect[] = Object.freeze([]);
  #readView: readonly EffectReadView[] = Object.freeze([]);
  constructor(config: GameConfig, ids: EntityIdSequence) {
    this.#config = config; this.#ids = ids; this.#pool = new ObjectPool(config.pools.effects, () => new Effect(), (e) => e.reset());
  }
  get effects(): readonly Effect[] { return this.#view; }
  get readView(): readonly EffectReadView[] { return this.#readView; }
  #publish(): void { this.#view = Object.freeze([...this.#active]); this.#readView = Object.freeze(this.#active.map((e) => e.view)); }
  emit(point: Point, kind: EffectKind, angle = 0): void {
    const effect = this.#pool.acquire(); if (!effect) return; // Configured visual budget: damage/score still apply.
    effect.activate(this.#ids.next(), point, kind, this.#config.effects[kind], angle);
    this.#active.push(effect); this.#publish();
  }
  update(dt: number): void {
    let changed = false;
    this.#active = this.#active.filter((e) => { e.update(dt); if (!e.expired) return true;
      this.#pool.release(e); changed = true; return false; });
    if (changed) this.#publish();
  }
  statistics() { return this.#pool.statistics(); }
  dispose(): void { this.#active.length = 0; this.#publish(); this.#pool.dispose((e) => e.reset()); }
}
