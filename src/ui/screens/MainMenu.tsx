import { Button } from '../components/Button';
import type { RecordsTab } from './CaptainsLog';
import { MenuArt } from '../assets/MenuArt';
import './MainMenu.css';

export interface MainMenuActions {
  play: () => void;
  openOptions: () => void;
  openRecords: (tab: RecordsTab) => void;
  openHowToPlay: () => void;
}

/** Main menu board composed from the authored panel, title, buttons and ship, as in `assets/sample_menu.png`. */
export function MainMenu({ actions }: { actions: MainMenuActions }) {
  return (
    <section className="main-menu" aria-labelledby="main-menu-title">
      <h1 id="main-menu-title" className="main-menu-title">
        <img src={MenuArt.Title} alt="Pirate Battle" />
      </h1>
      <p className="main-menu-tagline">Set sail. Take command.</p>

      <div className="main-menu-actions">
        <Button onClick={actions.play}>Play</Button>
        <Button onClick={actions.openOptions}>Options</Button>
      </div>

      <img className="main-menu-emblem" src={MenuArt.EmblemShip} alt="" />
      <p className="main-menu-motto">Navigate the islands. Survive the battle.</p>

      <nav className="main-menu-links" aria-label="Records and help">
        <Button variant="secondary" onClick={() => actions.openRecords('ranking')}>
          Ranking
        </Button>
        <Button variant="secondary" onClick={() => actions.openRecords('history')}>
          Match History
        </Button>
        <Button variant="secondary" onClick={actions.openHowToPlay}>
          How To Play
        </Button>
      </nav>
    </section>
  );
}
