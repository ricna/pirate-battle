import { Button } from '../components/Button';
import { ControlsHelp } from '../components/ControlsHelp';

const ChaserShip = new URL('../../../assets/png/default/ships/ship_2.png', import.meta.url).href;
const ShooterShip = new URL('../../../assets/png/default/ships/ship_3.png', import.meta.url).href;

/** Game briefing and control reference. Its only action returns to the main menu. */
export function HowToPlay({ onMainMenu }: { onMainMenu: () => void }) {
  return (
    <section className="panel how-to-play">
      <h1>How To Play</h1>
      <p>
        Survive until the timer runs out, sink enemy ships and earn your place among the captains. Keep
        moving. Aim your bow for a single cannon shot, or turn alongside an enemy for a three-cannon
        broadside.
      </p>

      <h2>Controls</h2>
      <ControlsHelp />

      <h2>Enemies</h2>
      <div className="enemy-guide">
        <img src={ChaserShip} alt="Black-sailed Chaser" />
        <p>
          <strong>Chaser</strong>
          <br />
          Pursues and rams your ship. Sink it before impact. Its own explosion earns no points.
        </p>
      </div>
      <div className="enemy-guide">
        <img src={ShooterShip} alt="Red-sailed Shooter" />
        <p>
          <strong>Shooter</strong>
          <br />
          Attacks from a distance. Dodge its cannonballs and return fire.
        </p>
      </div>
      <p className="muted">
        Islands stop ships and cannonballs. Each enemy you sink earns 1 point. Losing focus pauses the battle.
      </p>

      <div className="button-row">
        <Button variant="secondary" icon="icon_home" onClick={onMainMenu}>
          Main Menu
        </Button>
      </div>
    </section>
  );
}
