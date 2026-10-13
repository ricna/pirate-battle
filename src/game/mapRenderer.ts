import { Container, Rectangle, Sprite, Texture } from 'pixi.js';
import type { LoadedMap } from './tiledMap';

export class MapRenderer {
  readonly world = new Container();
  readonly #frames = new Map<number, Texture>();

  constructor(readonly map: LoadedMap) {
    this.world.label = 'authored-arena';
    try {
      for (const layer of map.layers) {
        const container = new Container();
        container.label = layer.name;
        container.visible = layer.visible;
        container.alpha = layer.opacity;
        container.position.set(layer.offsetX, layer.offsetY);
        this.world.addChild(container);

        layer.data.forEach((rawGid, index) => {
          if (rawGid === 0) return;
          const gid = (rawGid & 0x0fffffff) >>> 0;
          const sprite = new Sprite(this.#texture(gid));
          sprite.anchor.set(0.5);
          sprite.position.set(
            (index % layer.width + 0.5) * map.tileWidth,
            (Math.floor(index / layer.width) + 0.5) * map.tileHeight,
          );
          const horizontal = (rawGid & 0x80000000) !== 0;
          const vertical = (rawGid & 0x40000000) !== 0;
          const diagonal = (rawGid & 0x20000000) !== 0;
          if (diagonal) {
            // Tiled swaps axes first, then applies horizontal/vertical flips.
            sprite.rotation = Math.PI / 2;
            sprite.scale.set(vertical ? -1 : 1, horizontal ? 1 : -1);
          } else {
            sprite.scale.set(horizontal ? -1 : 1, vertical ? -1 : 1);
          }
          container.addChild(sprite);
        });
      }
    } catch (error) {
      this.destroy();
      throw error;
    }
  }

  #texture(gid: number): Texture {
    const cached = this.#frames.get(gid);
    if (cached) return cached;
    const tileset = this.map.tilesets.find((item) => gid >= item.firstGid && gid < item.firstGid + item.tileCount);
    if (!tileset) throw new Error(`Required tile ${gid} has no tileset.`);
    const localId = gid - tileset.firstGid;
    const frame = new Texture({
      source: tileset.texture.source,
      frame: new Rectangle(
        tileset.margin + localId % tileset.columns * (tileset.tileWidth + tileset.spacing),
        tileset.margin + Math.floor(localId / tileset.columns) * (tileset.tileHeight + tileset.spacing),
        tileset.tileWidth,
        tileset.tileHeight,
      ),
    });
    this.#frames.set(gid, frame);
    return frame;
  }

  resize(width: number, height: number) {
    const worldWidth = this.map.width * this.map.tileWidth;
    const worldHeight = this.map.height * this.map.tileHeight;
    const scale = Math.min(width / worldWidth, height / worldHeight);
    this.world.scale.set(scale);
    this.world.position.set((width - worldWidth * scale) / 2, (height - worldHeight * scale) / 2);
  }

  destroy() {
    this.world.removeFromParent();
    this.world.destroy({ children: true });
    // Frames are owned here; the shared, cached atlas image remains reusable.
    for (const texture of this.#frames.values()) texture.destroy(false);
    this.#frames.clear();
  }
}
