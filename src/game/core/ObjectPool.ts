import type { PoolProfile } from '../contracts/GameConfig';

export interface PoolStatistics { readonly capacity: number; readonly active: number; readonly available: number; readonly peak: number; readonly exhausted: number }
/** Bounded, lazily growing pool. Foreign/double releases are programming errors. */
export class ObjectPool<T extends object> {
  readonly #settings: PoolProfile;
  readonly #create: () => T;
  readonly #reset: (item: T) => void;
  readonly #available: T[] = [];
  readonly #owned = new Set<T>();
  readonly #leased = new Set<T>();
  #peak = 0; #exhausted = 0;
  constructor(settings: PoolProfile, create: () => T, reset: (item: T) => void) {
    this.#settings = Object.freeze({ ...settings }); this.#create = create; this.#reset = reset;
    if (!Number.isInteger(settings.initialCapacity) || settings.initialCapacity < 0
      || !Number.isInteger(settings.growthSize) || settings.growthSize <= 0
      || !Number.isInteger(settings.maxCapacity) || settings.maxCapacity <= 0
      || settings.initialCapacity > settings.maxCapacity) throw new Error('Invalid pool capacity configuration.');
    this.#grow(settings.initialCapacity);
  }
  #grow(count: number) {
    for (let i = 0; i < count; i++) { const item = this.#create();
      if (this.#owned.has(item)) throw new Error('A pool factory must create a distinct object.');
      this.#owned.add(item); this.#available.push(item); }
  }
  get available(): number { return this.#available.length + this.#settings.maxCapacity - this.#owned.size; }
  acquire(): T | null {
    if (!this.#available.length) this.#grow(Math.min(this.#settings.growthSize, this.#settings.maxCapacity - this.#owned.size));
    const item = this.#available.pop();
    if (!item) { this.#exhausted++; return null; }
    this.#leased.add(item); this.#peak = Math.max(this.#peak, this.#leased.size); return item;
  }
  release(item: T): void {
    if (!this.#leased.delete(item)) throw new Error('Cannot release an inactive or foreign pooled object.');
    this.#reset(item); this.#available.push(item);
  }
  releaseAll(): void { for (const item of this.#leased) this.release(item); }
  statistics(): PoolStatistics { return Object.freeze({ capacity: this.#owned.size, active: this.#leased.size,
    available: this.#available.length, peak: this.#peak, exhausted: this.#exhausted }); }
  dispose(destroy: (item: T) => void): void {
    this.releaseAll(); for (const item of this.#owned) destroy(item); this.#owned.clear(); this.#available.length = 0;
  }
}
