import { Assets, Texture } from 'pixi.js';

const MAP_PATH = '/assets/maps/arena_00.tmj';
/** Loading-bar percentages reported at each validated loader stage. */
const LoadProgress = Object.freeze({
  mapDocument: 25,
  /** Span reached halfway through the tilesets, once each tileset's metadata is read. */
  tilesetMetadataSpan: 35,
  /** Span covered once every tileset image has loaded. */
  tilesetImageSpan: 65,
  complete: 100,
});
// Explicit references keep the authored files available in both dev and builds.
const PROJECT_FILES: Record<string, string> = {
  [MAP_PATH]: new URL('../../../assets/maps/arena_00.tmj', import.meta.url).href,
  '/assets/maps/terrain.tsj': new URL('../../../assets/maps/terrain.tsj', import.meta.url).href,
  '/assets/tilesheet/tiles_sheet.png': new URL('../../../assets/tilesheet/tiles_sheet.png', import.meta.url)
    .href,
};

/** Tiled's 32-bit GID layout: the tile ID in the low bits, flip/rotation flags in the high bits. */
export const TiledGid = Object.freeze({
  maximum: 0xffffffff,
  idMask: 0x0fffffff,
  flippedHorizontally: 0x80000000,
  flippedVertically: 0x40000000,
  flippedDiagonally: 0x20000000,
  rotatedHexagonal: 0x10000000,
});

export interface MapCollider {
  id: number;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MapTileLayer {
  name: string;
  width: number;
  height: number;
  visible: boolean;
  opacity: number;
  offsetX: number;
  offsetY: number;
  data: readonly number[];
}

export interface MapTileset {
  firstGid: number;
  columns: number;
  tileCount: number;
  tileWidth: number;
  tileHeight: number;
  margin: number;
  spacing: number;
  texture: Texture;
}

export interface LoadedMap {
  width: number;
  height: number;
  tileWidth: number;
  tileHeight: number;
  layers: readonly MapTileLayer[];
  tilesets: readonly MapTileset[];
  colliders: readonly MapCollider[];
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function list(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array.`);
  return value;
}

function number(value: unknown, label: string, minimum = 0): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < minimum) {
    throw new Error(`${label} must be a finite number >= ${minimum}.`);
  }
  return value;
}

function integer(value: unknown, label: string, minimum = 1): number {
  const result = number(value, label, minimum);
  if (!Number.isInteger(result)) throw new Error(`${label} must be an integer.`);
  return result;
}

function text(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new Error(`${label} must be text.`);
  return value;
}

function visible(value: unknown, label: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`${label} visibility must be boolean.`);
  return value;
}

function offset(value: unknown, label: string): number {
  return number(value ?? 0, label, -Infinity);
}

function assetUrl(path: string): string {
  const url = PROJECT_FILES[path];
  if (!url) throw new Error(`Required authored asset is not registered: ${path}`);
  return url;
}

function relativePath(parent: string, source: string): string {
  if (!source || source.startsWith('/') || /^[a-z]+:/i.test(source)) {
    throw new Error(`Asset references must be project-relative: ${source}`);
  }
  return new URL(source, `https://project.invalid${parent}`).pathname;
}

async function readJson(path: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(assetUrl(path), { signal, cache: 'no-cache' });
  if (!response.ok) throw new Error(`Unable to load ${path}: HTTP ${response.status}.`);
  return response.json();
}

function tileLayer(raw: Record<string, unknown>, width: number, height: number): MapTileLayer {
  const name = text(raw.name, 'Layer name');
  if (raw.width !== width || raw.height !== height || raw.x !== 0 || raw.y !== 0) {
    throw new Error(`Layer ${name} must use the finite map grid without tile offsets.`);
  }
  if (raw.mode !== undefined && raw.mode !== 'normal') {
    throw new Error(`Layer ${name} uses an unsupported blend mode.`);
  }
  const data = list(raw.data, `Layer ${name} data`).map((gid) => {
    const value = integer(gid, `Layer ${name} tile ID`, 0);
    if (value > TiledGid.maximum) throw new Error(`Layer ${name} contains an invalid tile ID.`);
    return value;
  });
  if (data.length !== width * height) throw new Error(`Layer ${name} has an invalid cell count.`);
  const opacity = number(raw.opacity, `Layer ${name} opacity`);
  if (opacity > 1) throw new Error(`Layer ${name} opacity must be <= 1.`);
  return {
    name,
    width,
    height,
    data,
    opacity,
    visible: visible(raw.visible, name),
    offsetX: offset(raw.offsetx, `${name} offset X`),
    offsetY: offset(raw.offsety, `${name} offset Y`),
  };
}

function collisionLayer(raw: Record<string, unknown>, width: number, height: number): MapCollider[] {
  const offsetX = offset(raw.offsetx, 'Collision layer offset X');
  const offsetY = offset(raw.offsety, 'Collision layer offset Y');
  const ids = new Set<number>();
  return list(raw.objects, 'Collision objects').map((value) => {
    const object = record(value, 'Collision object');
    const id = integer(object.id, 'Collider ID');
    if (ids.has(id)) throw new Error(`Duplicate collider ID ${id}.`);
    ids.add(id);
    if (
      object.rotation !== 0 ||
      object.ellipse ||
      object.point ||
      object.polygon ||
      object.polyline ||
      object.gid ||
      object.text ||
      object.capsule ||
      object.template
    ) {
      throw new Error(`Collider ${id} must be an unrotated rectangle.`);
    }
    const collider = {
      id,
      name: text(object.name, `Collider ${id} name`),
      x: offset(object.x, `Collider ${id} X`) + offsetX,
      y: offset(object.y, `Collider ${id} Y`) + offsetY,
      width: number(object.width, `Collider ${id} width`, Number.MIN_VALUE),
      height: number(object.height, `Collider ${id} height`, Number.MIN_VALUE),
    };
    if (
      collider.x < 0 ||
      collider.y < 0 ||
      collider.x + collider.width > width ||
      collider.y + collider.height > height
    ) {
      throw new Error(`Collider ${id} extends beyond the arena.`);
    }
    return collider;
  });
}

export class TiledMapLoader {
  static async load(signal: AbortSignal, onProgress: (percent: number) => void): Promise<LoadedMap> {
    onProgress(0);
    const raw = record(await readJson(MAP_PATH, signal), 'Map');
    if (
      raw.type !== 'map' ||
      raw.orientation !== 'orthogonal' ||
      raw.infinite !== false ||
      raw.renderorder !== 'right-down'
    ) {
      throw new Error('The arena requires a finite orthogonal map in right-down order.');
    }
    const width = integer(raw.width, 'Map width');
    const height = integer(raw.height, 'Map height');
    const tileWidth = integer(raw.tilewidth, 'Map tile width');
    const tileHeight = integer(raw.tileheight, 'Map tile height');
    const layers: MapTileLayer[] = [];
    let colliders: MapCollider[] | undefined;

    for (const value of list(raw.layers, 'Map layers')) {
      const layer = record(value, 'Map layer');
      if (layer.type === 'tilelayer') layers.push(tileLayer(layer, width, height));
      else if (layer.type === 'objectgroup') {
        if (layer.name === 'collisions') {
          if (colliders) throw new Error('The map must contain only one collisions layer.');
          colliders = collisionLayer(layer, width * tileWidth, height * tileHeight);
        }
        // Other authored object layers are metadata for future gameplay systems.
      } else throw new Error(`Unsupported map layer type: ${String(layer.type)}`);
    }
    if (!layers.length || !colliders?.length)
      throw new Error('The arena requires tile layers and authored collision rectangles.');
    onProgress(LoadProgress.mapDocument);

    const references = list(raw.tilesets, 'Map tilesets');
    if (!references.length) throw new Error('The map requires an external tileset.');
    const tilesets: MapTileset[] = [];
    for (const [index, value] of references.entries()) {
      const reference = record(value, 'Tileset reference');
      const path = relativePath(MAP_PATH, text(reference.source, 'Tileset source'));
      const tileset = record(await readJson(path, signal), 'Tileset');
      if (tileset.type !== 'tileset' || tileset.tiles !== undefined) {
        throw new Error('The arena supports static image-sheet tilesets without per-tile overrides.');
      }
      const imagePath = relativePath(path, text(tileset.image, 'Tileset image'));
      onProgress(
        LoadProgress.mapDocument +
          Math.round((LoadProgress.tilesetMetadataSpan * (index + 0.5)) / references.length),
      );
      const texture = await Assets.load<Texture>(assetUrl(imagePath));
      signal.throwIfAborted();
      // The provided sheet has no padding; avoid sampling neighboring tiles.
      texture.source.scaleMode = 'nearest';
      if (texture.width !== tileset.imagewidth || texture.height !== tileset.imageheight) {
        throw new Error('The tileset image dimensions do not match its authored metadata.');
      }
      const definition: MapTileset = {
        firstGid: integer(reference.firstgid, 'Tileset first GID'),
        columns: integer(tileset.columns, 'Tileset columns'),
        tileCount: integer(tileset.tilecount, 'Tileset tile count'),
        tileWidth: integer(tileset.tilewidth, 'Tileset tile width'),
        tileHeight: integer(tileset.tileheight, 'Tileset tile height'),
        margin: integer(tileset.margin, 'Tileset margin', 0),
        spacing: integer(tileset.spacing, 'Tileset spacing', 0),
        texture,
      };
      if (definition.tileWidth !== tileWidth || definition.tileHeight !== tileHeight) {
        throw new Error('Tileset cells must match the map grid size.');
      }
      const lastColumn = Math.min(definition.tileCount, definition.columns) - 1;
      const lastRow = Math.floor((definition.tileCount - 1) / definition.columns);
      if (
        definition.margin + lastColumn * (tileWidth + definition.spacing) + tileWidth > texture.width ||
        definition.margin + lastRow * (tileHeight + definition.spacing) + tileHeight > texture.height
      ) {
        throw new Error('The tileset grid extends beyond its image.');
      }
      if (
        tilesets.some(
          (other) =>
            definition.firstGid < other.firstGid + other.tileCount &&
            other.firstGid < definition.firstGid + definition.tileCount,
        )
      ) {
        throw new Error('Tileset GID ranges must not overlap.');
      }
      tilesets.push(definition);
      onProgress(
        LoadProgress.mapDocument +
          Math.round((LoadProgress.tilesetImageSpan * (index + 1)) / references.length),
      );
    }
    for (const layer of layers) {
      for (const rawGid of layer.data) {
        const gid = (rawGid & TiledGid.idMask) >>> 0;
        if (rawGid === 0) continue;
        if ((rawGid & TiledGid.rotatedHexagonal) !== 0)
          throw new Error('Hexagonal tile rotation is unsupported in this orthogonal map.');
        if (
          !tilesets.some((tileset) => gid >= tileset.firstGid && gid < tileset.firstGid + tileset.tileCount)
        ) {
          throw new Error(`Layer ${layer.name} references unknown tile ${gid}.`);
        }
        if ((rawGid & TiledGid.flippedDiagonally) !== 0 && tileWidth !== tileHeight) {
          throw new Error('Diagonal flips require square tiles in this renderer.');
        }
      }
    }
    signal.throwIfAborted();
    onProgress(LoadProgress.complete);
    return { width, height, tileWidth, tileHeight, layers, tilesets, colliders };
  }
}
