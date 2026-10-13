import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
const GameCanvas = lazy(() => import('./GameCanvas').then((module) => ({ default: module.GameCanvas })));
import { Button, ControlsHelp, GameLoadBoundary, uiAsset } from './components';
import { RemotePanel } from './RemotePanel';
import { createGameConfig, DEFAULT_OPTIONS, LIMITS, validOptions } from '../game/config';
import type { GameConfig, Options } from '../game/config';
import type { Snapshot } from '../game/simulation';
import { audio } from '../game/audio';
import { AudioConfig } from '../game/configuration/AudioConfig';
import { api, describeError, queryClient } from '../data/api';
import { lastMatch, pendingMatches } from '../data/contracts';
import type { MatchRecord } from '../data/contracts';
import { getScenario, networkWarning, resetNetwork, SCENARIOS, setScenario } from '../data/network';
import type { Scenario } from '../data/network';
import { loadOptions, playerIdentity, storageWarning, writeStored } from '../data/storage';
import { GameDefaults } from '../game/configuration/GameDefaults';
import './App.css';
function OptionsForm({ options, save, back }: { options: Options; save: (options: Options) => void; back: () => void }) {
  const [draft, setDraft] = useState(options); const [error, setError] = useState('');
  return <section className="panel options-panel"><h1>Options</h1><p>Prepare your next voyage.</p>
    <form noValidate onSubmit={(event) => { event.preventDefault();
      if (!validOptions(draft)) { setError(`Session time must be ${LIMITS.session[0]}–${LIMITS.session[1]} seconds. Spawn time must be ${LIMITS.spawn[0]}–${LIMITS.spawn[1]} seconds.`); return; }
      save(draft); }}>
      <label>Game session time <span>{LIMITS.session[0]}–{LIMITS.session[1]} seconds</span><input type="number" name="session" min={LIMITS.session[0]} max={LIMITS.session[1]} step={GameDefaults.OptionSteps.session} required
        value={Number.isNaN(draft.sessionSeconds) ? '' : draft.sessionSeconds}
        onChange={(e) => setDraft({ ...draft, sessionSeconds: e.target.valueAsNumber })} /></label>
      <label>Enemy spawn time <span>{LIMITS.spawn[0]}–{LIMITS.spawn[1]} seconds</span><input type="number" name="spawn" min={LIMITS.spawn[0]} max={LIMITS.spawn[1]} step={GameDefaults.OptionSteps.spawn} required
        value={Number.isNaN(draft.spawnSeconds) ? '' : draft.spawnSeconds}
        onChange={(e) => setDraft({ ...draft, spawnSeconds: e.target.valueAsNumber })} /></label>
      <label className="check"><input type="checkbox" checked={draft.sound} onChange={(e) => setDraft({ ...draft, sound: e.target.checked })} /> Sound enabled</label>
      <label>Volume <output>{Math.round(draft.volume * 100)}%</output><input type="range" min={LIMITS.volume[0]} max={LIMITS.volume[1]} step={GameDefaults.OptionSteps.volume} value={draft.volume}
        onChange={(e) => setDraft({ ...draft, volume: e.target.valueAsNumber })} /></label>
      {error && <p role="alert">{error}</p>}<div className="button-row"><Button type="submit">Save options</Button><Button type="button" onClick={back}>Back</Button></div>
      <button type="button" className="text-button" onClick={() => setDraft(DEFAULT_OPTIONS)}>Restore default options</button>
    </form></section>;
}
export function App() {
  const [options, setOptions] = useState(loadOptions); const [playerId] = useState(playerIdentity);
  const [screen, setScreen] = useState<'menu' | 'options' | 'game' | 'result'>('menu');
  const [tab, setTab] = useState<'welcome' | 'ranking' | 'history'>('welcome');
  const [config, setConfig] = useState<GameConfig | null>(null); const [gameId, setGameId] = useState('');
  const [last, setLast] = useState(lastMatch); const [pending, setPending] = useState(pendingMatches);
  const pendingRef = useRef(pending); const attempted = useRef(new Set<string>());
  const [scenario, updateScenario] = useState(getScenario); const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useState(''); const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useMutation({ mutationFn: api.save, onSuccess: (record) => {
    const next = pendingRef.current.filter((r) => r.id !== record.id); pendingRef.current = next; writeStored('pending', next); setPending(next);
    setErrors((old) => { const copy = { ...old }; delete copy[record.id]; return copy; });
    void queryClient.invalidateQueries({ queryKey: ['ranking'] }); void queryClient.invalidateQueries({ queryKey: ['history'] });
  }, onError: (error, record) => setErrors((old) => ({ ...old, [record.id]: describeError(error) })) });
  const mutateRef = useRef(save.mutate); mutateRef.current = save.mutate;
  useEffect(() => {
    if (save.isPending) return;
    const next = pending.find((record) => !attempted.current.has(record.id));
    if (next) { attempted.current.add(next.id); mutateRef.current(next); }
  }, [pending, save.isPending]);
  useEffect(() => { audio.configure(options); }, [options]);
  useEffect(() => {
    const unlock = () => { audio.unlock(options); document.removeEventListener('pointerdown', unlock); document.removeEventListener('keydown', unlock); };
    document.addEventListener('pointerdown', unlock); document.addEventListener('keydown', unlock);
    return () => { document.removeEventListener('pointerdown', unlock); document.removeEventListener('keydown', unlock); };
  }, [options]);
  useEffect(() => {
    if (screen === 'game') return;
    const heading = document.querySelector<HTMLElement>('main h1');
    if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
  }, [screen]);
  const play = () => { audio.unlock(options); audio.play(AudioConfig.Cues.Click); setConfig(createGameConfig(options));
    setGameId(crypto.randomUUID()); setScreen('game'); };
  const complete = (snapshot: Snapshot) => {
    if (!config || !snapshot.reason) throw new Error('A completed battle requires its configuration and end reason.');
    const record: MatchRecord = { id: gameId, playerId, playerName: 'You', date: new Date().toISOString(),
      score: snapshot.score, duration: snapshot.elapsed, reason: snapshot.reason, config };
    writeStored('last', record); setLast(record);
    if (!pendingRef.current.some((r) => r.id === record.id)) {
      const next = [...pendingRef.current, record]; pendingRef.current = next; writeStored('pending', next); setPending(next);
    }
    setScreen('result');
  };
  const retry = () => { if (save.isPending) return; const record = pendingRef.current[0]; if (record) save.mutate(record); };
  const mainMenu = () => { setScreen('menu'); setTab('welcome'); audio.stop(); audio.play(AudioConfig.Cues.Back); };
  if (screen === 'game' && config) return <GameLoadBoundary onMenu={mainMenu}><Suspense fallback={<div className="app" role="status">Loading game engine…</div>}>
    <GameCanvas key={gameId} config={config} onComplete={complete} onAbandon={mainMenu} /></Suspense></GameLoadBoundary>;
  return <main className="app">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <div id="main-content" className="shell" tabIndex={-1}>
      {screen === 'options' ? <OptionsForm options={options} save={(value) => { writeStored('options', value); setOptions(value); setNotice('Options saved.'); mainMenu(); }} back={mainMenu} />
        : screen === 'result' && last ? <section className="panel result-panel"><p className="eyebrow">Your voyage</p><h1>Battle result</h1>
          <p>{last.reason === 'time' ? 'Time expired. The voyage is complete.' : 'Your ship was lost at sea.'}</p>
          <div className="result-score"><img src={uiAsset('hud/icon_score')} alt="" />{last.score}<span>points</span></div>
          <p>Time played: <strong>{last.duration.toFixed(1)} seconds</strong></p>
          <p role="status">{pending.some((r) => r.id === last.id) ? save.isPending && save.variables?.id === last.id
            ? 'Saving battle…' : 'Battle saved locally. Submission pending.' : 'Battle registered in Ranking and Match History.'}</p>
          {errors[last.id] && <p role="alert">{errors[last.id]}</p>}
          {pending.some((r) => r.id === last.id) && <Button disabled={save.isPending} onClick={() => save.mutate(last)}>Retry submission</Button>}
          <div className="button-row"><Button onClick={play}>Play Again</Button><Button onClick={mainMenu}>Main Menu</Button></div>
        </section>
          : <>
            <header className="brand"><img src={uiAsset('menu/title_pirate_battle')} alt="Pirate Battle" /><p>One captain. An ocean of trouble.</p></header>
            <section className="menu-layout"><aside className="panel menu-panel"><h1 className="sr-only">Pirate Battle</h1>
              <Button onClick={play}>Play</Button><Button onClick={() => { audio.unlock(options); setScreen('options'); }}>Options</Button>
              {last && <button className="text-button" onClick={() => setScreen('result')}>Last battle result</button>}
              <p>Survive, sink enemy ships and earn your place among the captains.</p><ControlsHelp />
              <p className="muted">{options.sessionSeconds}s session · {options.spawnSeconds}s spawn interval</p>
            </aside><section className="panel records-panel">
              <nav className="tabs" aria-label="Main menu sections">
                <button aria-current={tab === 'welcome' ? 'page' : undefined} onClick={() => setTab('welcome')}>How to play</button>
                <button aria-current={tab === 'ranking' ? 'page' : undefined} onClick={() => setTab('ranking')}>Ranking</button>
                <button aria-current={tab === 'history' ? 'page' : undefined} onClick={() => setTab('history')}>Match History</button>
              </nav>
              {tab === 'welcome' ? <section className="briefing"><h2>Captain’s orders</h2><p>Keep moving. Aim your bow for a single cannon shot, or turn alongside an enemy for a three-cannon broadside.</p>
                <div className="enemy-guide"><img src={new URL('../../assets/png/default/ships/ship_2.png', import.meta.url).href} alt="Black-sailed Chaser" />
                  <p><strong>Chaser</strong><br />Pursues and rams your ship. Sink it before impact. Its own explosion earns no points.</p></div>
                <div className="enemy-guide"><img src={new URL('../../assets/png/default/ships/ship_3.png', import.meta.url).href} alt="Red-sailed Shooter" />
                  <p><strong>Shooter</strong><br />Attacks from a distance. Dodge its cannonballs and return fire.</p></div>
                <p className="muted">Islands stop ships and cannonballs. Each enemy you sink earns 1 point. Losing focus pauses the battle.</p></section>
                : <RemotePanel key={`${tab}-${revision}`} kind={tab} config={createGameConfig(options)} playerId={playerId} revision={revision} />}
            </section></section>
          </>}
      {(notice || storageWarning || audio.error || networkWarning) && <p role="status" className="notice">{networkWarning ?? storageWarning ?? audio.error ?? notice}</p>}
      {pending.length > 0 && <aside className="pending-banner" aria-label="Pending submissions"><div><p>{pending.length} battle(s) awaiting registration. You can keep playing.</p>
        {screen !== 'result' && pending[0] && errors[pending[0].id] && <p role="alert">{errors[pending[0].id]}</p>}</div>
        <Button className="compact" disabled={save.isPending} onClick={retry}>{save.isPending ? 'Submitting…' : 'Retry pending battle'}</Button></aside>}
      <details className="network-tools"><summary>Demo network scenarios</summary><p>These simulated APIs run locally with MSW. Real gameplay keeps working when the service fails.</p>
        <label>Network scenario<select value={scenario} onChange={(e) => { const value = e.target.value as Scenario;
          setScenario(value); updateScenario(value); setRevision((r) => r + 1); void queryClient.cancelQueries(); void queryClient.invalidateQueries(); }}>
          {SCENARIOS.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <Button className="compact" onClick={() => { resetNetwork(); updateScenario('success'); setRevision((r) => r + 1);
          void queryClient.cancelQueries(); queryClient.clear(); setNotice('Demo server reset. Local results and pending battles are preserved.'); }}>Reset demo server</Button>
      </details>
      <footer className="credit"><img src={new URL('../../assets/logo_jungle_gaming.svg', import.meta.url).href} alt="Jungle Gaming" /><span>Frontend Game Developer challenge · Assets supplied by Jungle Gaming</span></footer>
    </div>
  </main>;
}
