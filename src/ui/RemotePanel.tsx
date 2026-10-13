import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api, describeError } from '../data/api';
import { configurationKey } from '../game/config';
import type { GameConfig } from '../game/config';
import { Button } from './components';
export function RemotePanel({ kind, playerId, config, revision }: {
  kind: 'ranking' | 'history'; playerId: string; config: GameConfig; revision: number;
}) {
  const [page, setPage] = useState(1);
  const key = configurationKey(config);
  const query = useQuery({ queryKey: [kind, kind === 'ranking' ? key : playerId, page, revision],
    queryFn: ({ signal }) => kind === 'ranking' ? api.ranking(key, page, signal) : api.history(playerId, page, signal) });
  return <section className="remote-panel" aria-labelledby="remote-title">
    <h2 id="remote-title">{kind === 'ranking' ? 'Ranking' : 'Match History'}</h2>
    <p className="muted">{kind === 'ranking' ? `Same arena & balance · ${config.sessionSeconds}s battles · spawns every ${config.spawnSeconds}s`
      : 'Your completed battles. Unfinished battles are never submitted.'}</p>
    {query.isFetching && <p role="status">{query.isPending ? 'Loading records…' : 'Updating records…'}</p>}
    {query.isError && <div role="alert"><p>{describeError(query.error)}</p><Button onClick={() => void query.refetch()}>Retry</Button></div>}
    {query.data && <>
      {query.data.items.length === 0 ? <p>No records yet. Set sail and make history!</p> :
        <div className="table-scroll"><table><thead><tr>{kind === 'ranking' ? <><th>Rank</th><th>Captain</th></> : <><th>Date</th><th>End</th></>}
          <th>Score</th><th>Played</th></tr></thead><tbody>{query.data.items.map((record, i) => <tr key={record.id}>
            {kind === 'ranking' ? <><td>{(page - 1) * 5 + i + 1}</td><td>{record.playerId === playerId ? 'You' : record.playerName}</td></>
              : <><td><time dateTime={record.date}>{new Date(record.date).toLocaleString('en-GB', { timeZone: 'UTC' })} UTC</time></td>
                <td>{record.reason === 'time' ? 'Time expired' : 'Ship lost'}</td></>}
            <td>{record.score}</td><td>{record.duration.toFixed(1)}s</td></tr>)}</tbody></table></div>}
      <nav className="pagination" aria-label="Records pagination"><Button disabled={page <= 1 || query.isFetching} onClick={() => setPage(page - 1)}>Previous</Button>
        <span>Page {query.data.page} of {query.data.totalPages}</span><Button disabled={page >= query.data.totalPages || query.isFetching} onClick={() => setPage(page + 1)}>Next</Button></nav>
    </>}
    {!query.isFetching && !query.isError && <Button className="compact" onClick={() => void query.refetch()}>Refresh records</Button>}
  </section>;
}
