import type { KeyboardEvent } from 'react';
import type { GameConfig } from '../../game/contracts/GameConfig';
import { Button } from '../components/Button';
import { RemotePanel } from '../records/RemotePanel';

import './CaptainsLog.css';

export type RecordsTab = 'ranking' | 'history';

const RecordsTabLabels: Readonly<Record<RecordsTab, string>> = Object.freeze({
  ranking: 'Ranking',
  history: 'Match History',
});

const RecordsPanelId = 'records-panel';
const tabId = (tab: RecordsTab) => `records-tab-${tab}`;

/** Arrow keys move between tabs; Home and End select the first and last tab (WAI-ARIA tabs pattern). */
const TabKeyOffsets: Readonly<Record<string, number>> = Object.freeze({ ArrowLeft: -1, ArrowRight: 1 });

function tabForKey(tabs: readonly RecordsTab[], current: RecordsTab, key: string): RecordsTab | undefined {
  if (key === 'Home') return tabs[0];
  if (key === 'End') return tabs.at(-1);
  const offset = TabKeyOffsets[key];
  if (offset === undefined) return undefined;
  return tabs[(tabs.indexOf(current) + offset + tabs.length) % tabs.length];
}

/**
 * Captain's Log board with the Ranking and Match History tabs, composed after
 * assets/sample_ranking.png and assets/sample_history.png. The selected tab uses the primary button art.
 */
export function CaptainsLog({
  tab,
  onTabChange,
  config,
  playerId,
  revision,
  lastMatchId,
  onMainMenu,
}: {
  tab: RecordsTab;
  onTabChange: (tab: RecordsTab) => void;
  config: GameConfig;
  playerId: string;
  revision: number;
  lastMatchId: string | null;
  onMainMenu: () => void;
}) {
  const tabs = Object.keys(RecordsTabLabels) as RecordsTab[];

  const selectWithKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = tabForKey(tabs, tab, event.key);
    if (!next) return;
    event.preventDefault();
    onTabChange(next);
    event.currentTarget.querySelector<HTMLElement>(`#${tabId(next)}`)?.focus();
  };

  return (
    <section className="captains-log" aria-labelledby="captains-log-title">
      <h1 id="captains-log-title">Captain’s Log</h1>
      <div
        className="records-tabs"
        role="tablist"
        aria-label="Captain’s log sections"
        onKeyDown={selectWithKeyboard}
      >
        {tabs.map((value) => (
          <Button
            key={value}
            id={tabId(value)}
            role="tab"
            aria-selected={value === tab}
            aria-controls={RecordsPanelId}
            tabIndex={value === tab ? 0 : -1}
            variant={value === tab ? 'primary' : 'secondary'}
            onClick={() => onTabChange(value)}
          >
            {RecordsTabLabels[value]}
          </Button>
        ))}
      </div>
      <RemotePanel
        key={`${tab}-${revision}`}
        id={RecordsPanelId}
        labelledBy={tabId(tab)}
        kind={tab}
        config={config}
        playerId={playerId}
        revision={revision}
        lastMatchId={lastMatchId}
      />
      <Button className="captains-log-menu" onClick={onMainMenu}>
        Main Menu
      </Button>
    </section>
  );
}
