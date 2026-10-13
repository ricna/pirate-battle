import { freezeStaticConfiguration } from '../core/Immutable';

/** Explicit source policy: shared 1x gameplay atlases; SVG additions and repeating water stay standalone. */
export class AssetConfig {
  private constructor() {}

  static readonly ShipsAtlas = new URL(
    '../../../assets/spritesheet/ships_miscellaneous_sheet.png',
    import.meta.url,
  ).href;
  static readonly UiAtlas = new URL('../../../assets/spritesheet/ui_sheet.png', import.meta.url).href;
  static readonly Standalone = {
    'tiles/tile_73': new URL('../../../assets/png/default/tiles/tile_73.png', import.meta.url).href,
    'authored/foam_ring': new URL('../../../assets/authored/foam_ring.svg', import.meta.url).href,
    'authored/projectile_trail': new URL('../../../assets/authored/projectile_trail.svg', import.meta.url)
      .href,
    'authored/water_splash': new URL('../../../assets/authored/Splash.png', import.meta.url).href,
  } as const;
}

freezeStaticConfiguration(AssetConfig);
