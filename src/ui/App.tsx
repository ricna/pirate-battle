// The shared stylesheet loads first so screen stylesheets imported by components can refine it.
import './App.css';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
const GameCanvas = lazy(() => import('./game/GameCanvas').then((module) => ({ default: module.GameCanvas })));
import { Button } from './components/Button';
import { GameLoadBoundary } from './components/GameLoadBoundary';
import { uiAsset } from './assets/UiAssets';
import { CaptainsLog } from './screens/CaptainsLog';
import type { RecordsTab } from './screens/CaptainsLog';
import { DemoNetworkTools } from './development/DemoNetworkTools';
import { HowToPlay } from './screens/HowToPlay';
import { MainMenu } from './screens/MainMenu';
import { OptionsScreen } from './screens/OptionsScreen';
import { MenuArt } from './assets/MenuArt';
import { useTransientNotice } from './hooks/UseTransientNotice';
import { createGameConfig } from '../game/configuration/GameConfiguration';
import type { GameConfig } from '../game/configuration/GameConfiguration';
import type { Snapshot } from '../game/runtime/GameManager';
import { audio } from '../game/audio/AudioManager';
import { AudioConfig } from '../game/configuration/AudioConfig';
import { api, describeError, queryClient } from '../infrastructure/network/RecordsApi';
import { lastMatch, pendingMatches } from '../application/records/MatchRecord';
import type { MatchRecord } from '../application/records/MatchRecord';
import { getScenario, networkWarning, resetNetwork, setScenario } from '../infrastructure/network/NetworkSimulator';
import type { Scenario } from '../infrastructure/network/NetworkSimulator';
import { loadOptions, playerIdentity, storageWarning, writeStored } from '../infrastructure/storage/LocalStorageStore';
import { ResultScore } from './records/ResultScore';
export function App() {
  const [options, setOptions] = useState(loadOptions); const [playerId] = useState(playerIdentity);
  const [screen, setScreen] = useState<'menu' | 'options' | 'howToPlay' | 'records' | 'game' | 'result'>('menu');
  const [recordsTab, setRecordsTab] = useState<RecordsTab>('ranking');
  const [config, setConfig] = useState<GameConfig | null>(null); const [gameId, setGameId] = useState('');
  const [last, setLast] = useState(lastMatch); const [pending, setPending] = useState(pendingMatches);
  const pendingRef = useRef(pending); const attempted = useRef(new Set<string>());
  const [scenario, updateScenario] = useState(getScenario); const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useTransientNotice(); const [errors, setErrors] = useState<Record<string, string>>({});
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
  const play = () => { audio.unlock(options); audio.playUi(AudioConfig.Cues.Click, 'ui-click'); setConfig(createGameConfig(options));
    setGameId(crypto.randomUUID()); setScreen('game'); };
  const complete = (snapshot: Snapshot) => {
    if (!config || !snapshot.reason) throw new Error('A completed battle requires its configuration and end reason.');
    const record: MatchRecord = { id: gameId, playerId, playerName: 'You', date: new Date().toISOString(),
      score: snapshot.score, duration: snapshot.elapsed, reason: snapshot.reason, config, statistics: snapshot.statistics };
    writeStored('last', record); setLast(record);
    if (!pendingRef.current.some((r) => r.id === record.id)) {
      const next = [...pendingRef.current, record]; pendingRef.current = next; writeStored('pending', next); setPending(next);
    }
  };
  const retry = () => { if (save.isPending) return; const record = pendingRef.current[0]; if (record) save.mutate(record); };
  const mainMenu = () => { setScreen('menu'); audio.stop(); audio.playUi(AudioConfig.Cues.Back, 'ui-back'); };
  const menuActions = {
    play,
    openOptions: () => {
      audio.unlock(options);
      setScreen('options');
    },
    openRecords: (tab: RecordsTab) => {
      setRecordsTab(tab);
      setScreen('records');
    },
    openHowToPlay: () => setScreen('howToPlay'),
  };
  const selectScenario = (value: Scenario) => {
    setScenario(value);
    updateScenario(value);
    setRevision((current) => current + 1);
    void queryClient.cancelQueries();
    void queryClient.invalidateQueries();
  };
  const resetDemoServer = () => {
    resetNetwork();
    updateScenario('success');
    setRevision((current) => current + 1);
    void queryClient.cancelQueries();
    queryClient.clear();
    setNotice('Demo server reset. Local results and pending battles are preserved.');
  };
  if (screen === 'game' && config) return <GameLoadBoundary onMenu={mainMenu}><Suspense fallback={<div className="app" role="status">Loading game engine…</div>}>
    <GameCanvas key={gameId} config={config} onComplete={complete} onAbandon={mainMenu} onResultReady={() => setScreen('result')} /></Suspense></GameLoadBoundary>;
  return <main className={`app app-${screen}`}>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <div id="main-content" className="shell" tabIndex={-1}>
      {screen === 'options' ? <OptionsScreen options={options} onChange={(value) => { writeStored('options', value); setOptions(value); }} onMainMenu={mainMenu} />
        : screen === 'howToPlay' ? <HowToPlay onMainMenu={mainMenu} />
        : screen === 'records' ? <CaptainsLog tab={recordsTab} onTabChange={setRecordsTab} config={createGameConfig(options)}
          playerId={playerId} revision={revision} lastMatchId={last?.id ?? null} onMainMenu={mainMenu} />
        : screen === 'result' && last ? <section className="panel result-panel"><p className="eyebrow">{last.reason === 'death' ? 'Ship Sunk' : 'Battle Complete'}</p><h1>Battle result</h1>
          <p>{last.reason === 'time' ? 'Time expired. The voyage is complete.' : 'Your ship was lost at sea.'}</p>
          <div className="result-score"><img src={uiAsset('hud/icon_score')} alt="" /><ResultScore score={last.score} /><span>points</span></div>
          <p>Time played: <strong>{last.duration.toFixed(1)} seconds</strong></p>
          {last.statistics && <dl className="battle-statistics">
            <div><dt>Enemies sunk</dt><dd>{last.statistics.enemiesSunk}</dd></div>
            <div><dt>Cannonballs fired</dt><dd>{last.statistics.cannonballsFired}</dd></div>
            <div><dt>Cannonball hits</dt><dd>{last.statistics.cannonballHits}</dd></div>
            <div><dt>Damage received</dt><dd>{last.statistics.damageReceived}</dd></div>
            <div><dt>Health remaining</dt><dd>{last.statistics.healthRemaining}</dd></div>
          </dl>}
          <p role="status">{pending.some((r) => r.id === last.id) ? save.isPending && save.variables?.id === last.id
            ? 'Saving battle…' : 'Battle saved locally. Submission pending.' : 'Battle registered in Ranking and Match History.'}</p>
          {errors[last.id] && <p role="alert">{errors[last.id]}</p>}
          {pending.some((r) => r.id === last.id) && <Button disabled={save.isPending} onClick={() => save.mutate(last)}>Retry submission</Button>}
          <div className="button-row"><Button icon="icon_restart" onClick={play}>Play Again</Button><Button variant="secondary" icon="icon_home" onClick={mainMenu}>Main Menu</Button></div>
        </section>
          : <MainMenu actions={menuActions} />}
      {(notice || storageWarning || audio.error || networkWarning) && <p role="status" className="notice">{networkWarning ?? storageWarning ?? audio.error ?? notice}</p>}
      {pending.length > 0 && <aside className="pending-banner" aria-label="Pending submissions"><div><p>{pending.length} battle(s) awaiting registration. You can keep playing.</p>
        {screen !== 'result' && pending[0] && errors[pending[0].id] && <p role="alert">{errors[pending[0].id]}</p>}</div>
        <Button className="compact" disabled={save.isPending} onClick={retry}>{save.isPending ? 'Submitting…' : 'Retry pending battle'}</Button></aside>}
    </div>
    <DemoNetworkTools scenario={scenario} onSelect={selectScenario} onReset={resetDemoServer} />
    <img className="studio-logo" src={MenuArt.StudioLogo} alt="Jungle Gaming" />
  </main>;
}
