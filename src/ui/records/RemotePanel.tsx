import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api, describeError } from '../../infrastructure/network/RecordsApi';
import type { MatchRecord, RankedMatch } from '../../application/records/MatchRecord';
import { configurationKey } from '../../game/configuration/GameConfiguration';
import { EndReason } from '../../game/contracts/GameDomain';
import type { GameConfig } from '../../game/configuration/GameConfiguration';
import { Button } from '../components/Button';
import { uiAsset } from '../assets/UiAssets';
import { audio } from '../../game/audio/AudioManager';
import { AudioConfig } from '../../game/configuration/AudioConfig';

/** Match dates are shown in UTC, matching the stored ISO timestamps and the ranking order. */
const DayFormat = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' });
const TimeFormat = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23', timeZone: 'UTC' });

const ResultLabels: Readonly<Record<EndReason, string>> = Object.freeze({ [EndReason.Time]: 'Time up', [EndReason.Death]: 'Defeated' });

function formatDuration(seconds: number) {
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  return `${String(minutes).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

function PlayedAt({ date }: { date: string }) {
  const value = new Date(date);
  return (
    <time dateTime={date} title={`${value.toISOString().slice(0, 16).replace('T', ' ')} UTC`}>
      <span className="played-day">{DayFormat.format(value)}</span>
      <span className="played-time"> · {TimeFormat.format(value)}</span>
    </time>
  );
}

function PageButton({ label, icon, disabled, onClick }: { label: string; icon: string; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      className="records-page-button"
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        audio.playUi(AudioConfig.Cues.Click, 'ui-click');
        onClick();
      }}
    >
      <img src={uiAsset(`controls/${icon}`)} alt="" />
    </button>
  );
}

/**
 * Ranking or Match History table of the Captain's Log (assets/sample_ranking.png, sample_history.png).
 * Ranking highlights this player's records; history highlights the last completed battle.
 */
export function RemotePanel({ kind, playerId, config, revision, lastMatchId }: {
  kind: 'ranking' | 'history';
  playerId: string;
  config: GameConfig;
  revision: number;
  lastMatchId: string | null;
}) {
  const [page, setPage] = useState(1);
  const key = configurationKey(config);
  const query = useQuery({
    queryKey: [kind, kind === 'ranking' ? key : playerId, page, revision],
    queryFn: ({ signal }) => kind === 'ranking' ? api.ranking(key, page, signal) : api.history(playerId, page, signal),
  });
  const highlighted = (record: MatchRecord) => kind === 'ranking' ? record.playerId === playerId : record.id === lastMatchId;
  const rowClass = (record: MatchRecord | RankedMatch) => [
    'rank' in record && record.rank === 1 ? 'leader' : '',
    highlighted(record) ? 'highlighted' : '',
  ].filter(Boolean).join(' ') || undefined;

  return (
    <section className={`remote-panel ${kind}`} aria-label={kind === 'ranking' ? 'Ranking' : 'Match History'}>
      <p className="records-subtitle">
        {kind === 'ranking'
          ? `${config.sessionSeconds} second battles · ${config.spawnSeconds} second spawn interval`
          : 'Your recent battles'}
      </p>

      <div className="records-body">
        {query.isPending && <p role="status">Loading records…</p>}
        {query.isFetching && !query.isPending && <p role="status" className="sr-only">Updating records…</p>}
        {query.isError && (
          <div role="alert" className="records-error">
            <p>{describeError(query.error)}</p>
            <Button onClick={() => void query.refetch()}>Retry</Button>
          </div>
        )}
        {query.data && query.data.items.length === 0 && <p>No records yet. Set sail and make history!</p>}
        {query.data && query.data.items.length > 0 && (
          <table aria-busy={query.isFetching}>
            <thead>
              {kind === 'ranking'
                ? <tr><th scope="col">Rank</th><th scope="col">Captain</th><th scope="col">Points</th><th scope="col">Played</th></tr>
                : <tr><th scope="col">Date</th><th scope="col">Points</th><th scope="col">Duration</th><th scope="col">Result</th></tr>}
            </thead>
            <tbody>
              {query.data.items.map((record) => (
                <tr key={record.id} className={rowClass(record)}>
                  {'rank' in record && kind === 'ranking' ? <>
                    <td className="records-rank">{String(record.rank).padStart(2, '0')}</td>
                    <td className="records-captain">
                      {record.rank === 1 && <img className="records-star" src={uiAsset('hud/icon_score')} alt="" />}
                      {record.playerName}
                    </td>
                    <td className="records-points">{record.score}</td>
                    <td><PlayedAt date={record.date} /></td>
                  </> : <>
                    <td><PlayedAt date={record.date} /></td>
                    <td className="records-points">{record.score}</td>
                    <td className="records-duration">{formatDuration(record.duration)}</td>
                    <td className={`records-result ${record.reason}`}>{ResultLabels[record.reason]}</td>
                  </>}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {query.data && (
        <nav className="records-pagination" aria-label="Records pagination">
          <PageButton label="Previous" icon="icon_turn_left" disabled={page <= 1 || query.isFetching} onClick={() => setPage(page - 1)} />
          <span>Page {query.data.page} of {query.data.totalPages}</span>
          <PageButton
            label="Next"
            icon="icon_turn_right"
            disabled={page >= query.data.totalPages || query.isFetching}
            onClick={() => setPage(page + 1)}
          />
        </nav>
      )}
    </section>
  );
}
