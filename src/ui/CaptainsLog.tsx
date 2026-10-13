import { Button } from './components';
import { RemotePanel } from './RemotePanel';
import type { GameConfig } from '../game/config';
import './CaptainsLog.css';

export type RecordsTab = 'ranking' | 'history';

const RecordsTabLabels: Readonly<Record<RecordsTab, string>> = Object.freeze({
  ranking: 'Ranking',
  history: 'Match History',
});

/**
 * Captain's Log board with the Ranking and Match History tabs, composed after
 * assets/sample_ranking.png and assets/sample_history.png. The selected tab uses the primary button art.
 */
export function CaptainsLog({ tab, onTabChange, config, playerId, revision, lastMatchId, onMainMenu }: {
  tab: RecordsTab;
  onTabChange: (tab: RecordsTab) => void;
  config: GameConfig;
  playerId: string;
  revision: number;
  lastMatchId: string | null;
  onMainMenu: () => void;
}) {
  const tabs = Object.keys(RecordsTabLabels) as RecordsTab[];

  return (
    <section className="captains-log" aria-labelledby="captains-log-title">
      <h1 id="captains-log-title">Captain’s Log</h1>
      <nav className="records-tabs" aria-label="Captain’s log sections">
        {tabs.map((value) => (
          <Button
            key={value}
            variant={value === tab ? 'primary' : 'secondary'}
            aria-current={value === tab ? 'page' : undefined}
            onClick={() => onTabChange(value)}
          >
            {RecordsTabLabels[value]}
          </Button>
        ))}
      </nav>
      <RemotePanel
        key={`${tab}-${revision}`}
        kind={tab}
        config={config}
        playerId={playerId}
        revision={revision}
        lastMatchId={lastMatchId}
      />
      <Button className="captains-log-menu" onClick={onMainMenu}>Main Menu</Button>
    </section>
  );
}
