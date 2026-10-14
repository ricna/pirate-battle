import { useState } from 'react';
import { Button } from '../components/Button';
import { ControlsHelp } from '../components/ControlsHelp';
import './HowToPlay.css';

const ChaserShip = new URL('../../../assets/png/default/ships/ship_2.png', import.meta.url).href;
const ShooterShip = new URL('../../../assets/png/default/ships/ship_3.png', import.meta.url).href;

/** Compact briefing split into authored topics so every section fits on a phone without scrolling. */
export function HowToPlay({ onMainMenu }: { onMainMenu: () => void }) {
  const [topic, setTopic] = useState<'overview' | 'controls' | 'enemies'>('overview');
  return (
    <section className="panel how-to-play">
      <h1>How To Play</h1>
      <nav className="help-topics" aria-label="Help topics">
        {(['overview', 'controls', 'enemies'] as const).map((value) => (
          <Button
            key={value}
            className="compact"
            variant={topic === value ? 'primary' : 'secondary'}
            aria-pressed={topic === value}
            onClick={() => setTopic(value)}
          >
            {value === 'overview' ? 'Overview' : value === 'controls' ? 'Controls' : 'Enemies'}
          </Button>
        ))}
      </nav>
      <div className="help-content">
        {topic === 'overview' && (
          <>
            <p>
              Survive until time runs out. Sink enemies with a bow shot or a three-cannon broadside to earn
              points.
            </p>
            <p>
              Rescue floating crew to recover 1 health each; quick rescues combine as +2, +3 and more. Crew
              wait until they disappear if your health is full.
            </p>
            <p>
              Islands block ships and shots. An island impact costs 1 health; arena borders cause no damage.
            </p>
          </>
        )}
        {topic === 'controls' && (
          <>
            <ControlsHelp />
            <p>
              Full screen starts at your first touch or key, and Quit closes the game. On a computer,
              Alt+Enter switches to a window; on iPhone, use Add to Home Screen.
            </p>
          </>
        )}
        {topic === 'enemies' && (
          <>
            <div className="enemy-guide">
              <img src={ChaserShip} alt="Black-sailed Chaser" />
              <p>
                <strong>Chaser</strong>
                <br />
                Pursues and rams you. Its own explosion earns no points.
              </p>
            </div>
            <div className="enemy-guide">
              <img src={ShooterShip} alt="Red-sailed Shooter" />
              <p>
                <strong>Shooter</strong>
                <br />
                Attacks from a distance. Dodge its shots and return fire.
              </p>
            </div>
            <p className="muted">Each enemy you sink earns 1 point. Losing focus pauses the battle.</p>
          </>
        )}
      </div>

      <div className="button-row">
        <Button variant="secondary" icon="icon_home" onClick={onMainMenu}>
          Main Menu
        </Button>
      </div>
      <p className="muted build-label">Build {__BUILD_COMMIT__}</p>
    </section>
  );
}
