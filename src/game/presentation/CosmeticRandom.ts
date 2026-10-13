/** Dedicated seeded presentation stream; never consumes the spawn/combat random sequence. */
export class CosmeticRandom {
  #state: number;
  readonly #settings: Readonly<{ multiplier: number; increment: number; modulus: number }>;

  constructor(seed: number, settings: Readonly<{ multiplier: number; increment: number; modulus: number }>) {
    this.#state = seed >>> 0;
    this.#settings = settings;
  }

  next(): number {
    this.#state = (Math.imul(this.#state, this.#settings.multiplier) + this.#settings.increment) >>> 0;
    return this.#state / this.#settings.modulus;
  }

  between(minimum: number, maximum: number): number {
    return minimum + this.next() * (maximum - minimum);
  }
}
