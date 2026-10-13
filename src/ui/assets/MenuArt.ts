import { freezeStaticConfiguration } from '../../game/core/Immutable';
import emblemShip from '../../../assets/png/retina/ships/ship_2.png';
import studioLogo from '../../../assets/logo_jungle_gaming.svg';
import title from '../../../assets/png/retina/ui/menu/title_pirate_battle.png';

/**
 * Authored art composed by the main menu, following `assets/sample_menu.png`.
 * The board is drawn at up to twice its logical size, so it uses the retina pieces.
 * Static imports make a missing file fail the build instead of rendering a broken menu.
 */
export class MenuArt {
  private constructor() {}

  static readonly Title = title;
  static readonly EmblemShip = emblemShip;
  static readonly StudioLogo = studioLogo;
}

freezeStaticConfiguration(MenuArt);
