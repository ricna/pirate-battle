import { CameraConfig } from '../configuration/CameraConfig';
import type { Point } from '../math/Geometry';

/** A bounded player-following camera on small screens, with the reference overview on desktop. */
export class WorldCamera {
  readonly #worldWidth: number;
  readonly #worldHeight: number;
  #width = 0;
  #height = 0;
  #scale = 1;
  #x = 0;
  #y = 0;
  #following = false;

  constructor(worldWidth: number, worldHeight: number) {
    if (![worldWidth, worldHeight].every((value) => Number.isFinite(value) && value > 0))
      throw new Error('The camera requires positive authored map dimensions.');
    this.#worldWidth = worldWidth;
    this.#worldHeight = worldHeight;
  }

  get scale(): number {
    return this.#scale;
  }
  get x(): number {
    return this.#x;
  }
  get y(): number {
    return this.#y;
  }

  resize(width: number, height: number): void {
    this.#width = width;
    this.#height = height;
    this.#following = width <= CameraConfig.CompactWidth || height <= CameraConfig.CompactHeight;
    this.#scale = this.#following
      ? Math.max(
          CameraConfig.MinimumScale,
          Math.sqrt(
            (width * height) / (this.#worldWidth * this.#worldHeight * CameraConfig.VisibleAreaFraction),
          ),
        )
      : Math.min(width / this.#worldWidth, height / this.#worldHeight);
  }

  follow(target: Point): void {
    this.#x = this.#offset(target.x, this.#width, this.#worldWidth);
    this.#y = this.#offset(target.y, this.#height, this.#worldHeight);
  }

  #offset(target: number, viewport: number, world: number): number {
    const extent = world * this.#scale;
    if (!this.#following || extent <= viewport) return (viewport - extent) / 2;
    return Math.max(viewport - extent, Math.min(0, viewport / 2 - target * this.#scale));
  }

  observation() {
    return {
      x: this.#x,
      y: this.#y,
      scale: this.#scale,
      following: this.#following,
      width: this.#width,
      height: this.#height,
      worldWidth: this.#worldWidth,
      worldHeight: this.#worldHeight,
    };
  }
}
