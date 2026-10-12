import { Assets, Texture } from 'pixi.js';
import { GAME_CONFIG } from './config';

const tileNumbers = [...new Set(GAME_CONFIG.arena.islands.flatMap((island) => island.tiles.flat()))];
export const ASSET_URLS = {
  ship: new URL('../../assets/png/default/ships/ship_1.png', import.meta.url).href,
  water: new URL('../../assets/png/default/tiles/tile_73.png', import.meta.url).href,
  healthFrame: new URL('../../assets/png/default/ui/hud/health_frame.png', import.meta.url).href,
  healthFill: new URL('../../assets/png/default/ui/hud/health_fill_green.png', import.meta.url).href,
};

// Explicit provided PNGs are referenced at build time; missing assets fail loading.
const tileFiles = import.meta.glob('../../assets/png/default/tiles/*.png', {
  eager: true, query: '?url', import: 'default',
}) as Record<string, string>;

export interface GameTextures {
  ship: Texture;
  water: Texture;
  healthFrame: Texture;
  healthFill: Texture;
  tiles: Map<number, Texture>;
}

export async function loadGameTextures(onProgress: (fraction: number) => void): Promise<GameTextures> {
  const urls = Object.values(ASSET_URLS);
  const islandUrls = tileNumbers.map((number) => {
    const url = tileFiles[`../../assets/png/default/tiles/tile_${number}.png`];
    if (!url) throw new Error(`Required island tile ${number} is missing.`);
    return url;
  });
  const allUrls = [...urls, ...islandUrls];
  await Assets.load<Texture>(allUrls, onProgress);
  return {
    ship: Assets.get<Texture>(ASSET_URLS.ship),
    water: Assets.get<Texture>(ASSET_URLS.water),
    healthFrame: Assets.get<Texture>(ASSET_URLS.healthFrame),
    healthFill: Assets.get<Texture>(ASSET_URLS.healthFill),
    tiles: new Map(tileNumbers.map((number, index) => [number, Assets.get<Texture>(islandUrls[index]!)])),
  };
}
