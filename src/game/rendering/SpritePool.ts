import { Container, Sprite, Texture } from 'pixi.js';
import { ObjectPool } from '../core/ObjectPool';
import type { PoolProfile } from '../contracts/GameConfig';

/** Authored texture required. Sprites stay attached and hidden while inactive. */
export class SpritePool {
  readonly #pool: ObjectPool<Sprite>;
  constructor(layer: Container, settings: PoolProfile, texture: Texture) {
    this.#pool = new ObjectPool(settings, () => {
      const sprite = new Sprite(texture); sprite.anchor.set(0.5); sprite.visible = false; layer.addChild(sprite); return sprite;
    }, (sprite) => { sprite.visible = false; sprite.position.set(0); sprite.rotation = 0;
      sprite.alpha = 1; sprite.scale.set(1); sprite.tint = 0xffffff; });
  }
  acquire(texture: Texture): Sprite {
    const sprite = this.#pool.acquire(); if (!sprite) throw new Error('Rendering pool capacity does not match its entity pool.');
    sprite.texture = texture; sprite.visible = true; return sprite;
  }
  release(sprite: Sprite): void { this.#pool.release(sprite); }
  statistics() { return this.#pool.statistics(); }
  dispose(): void { this.#pool.dispose((sprite) => sprite.destroy()); }
}
