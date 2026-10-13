import { Button } from './components';
import { RemotePanel } from './RemotePanel';
import type { GameConfig } from '../game/config';

export type RecordsTab = 'ranking' | 'history';

const RecordsTabLabels: Readonly<Record<RecordsTab, string>> = Object.freeze({
  ranking: 'Ranking',
  history: 'Match History',
});

/** Ranking and Match History tabs opened from the main menu. The selected tab uses the primary button art. */
export function CaptainsLog({ tab, onTabChange, config, playerId, revision, onMainMenu }: {
  tab: RecordsTab;
  onTabChange: (tab: RecordsTab) => void;
  config: GameConfig;
  playerId: string;
  revision: number;
  onMainMenu: () => void;
}) {
  const tabs = Object.keys(RecordsTabLabels) as RecordsTab[];

  return (
    <section className="panel captains-log">
      <h1>Captain’s Log</h1>
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
      <RemotePanel key={`${tab}-${revision}`} kind={tab} config={config} playerId={playerId} revision={revision} />
      <div className="button-row">
        <Button variant="secondary" icon="icon_home" onClick={onMainMenu}>Main Menu</Button>
      </div>
    </section>
  );
}
