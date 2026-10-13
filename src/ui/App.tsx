import type { GameConfig } from '../game/contracts/GameConfig';
import { GameConfigFactory } from '../game/configuration/GameConfigFactory';
// The shared stylesheet loads first so screen stylesheets imported by components can refine it.
import './App.css';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useMutation } from '@tanstack/react-query';
const GameCanvas = lazy(() => import('./game/GameCanvas').then((module) => ({ default: module.GameCanvas })));
import { Button } from './components/Button';
import { AssetLoadingIndicator } from './components/AssetLoadingIndicator';
import { GameLoadBoundary } from './components/GameLoadBoundary';
import { CaptainsLog } from './screens/CaptainsLog';
import type { RecordsTab } from './screens/CaptainsLog';
import { DemoNetworkTools } from './development/DemoNetworkTools';
import { HowToPlay } from './screens/HowToPlay';
import { MainMenu } from './screens/MainMenu';
import { OptionsScreen } from './screens/OptionsScreen';
import { MenuArt } from './assets/MenuArt';
import { useTransientNotice } from './hooks/UseTransientNotice';

import type { Snapshot } from '../game/runtime/GameManager';
import { useApplicationServices } from './hooks/UseApplicationServices';
import { AudioConfig } from '../game/configuration/AudioConfig';
import { RecordsApi } from '../infrastructure/network/RecordsApi';
import type { MatchRecord } from '../application/records/MatchRecord';
import type { Scenario } from '../infrastructure/network/NetworkSimulator';
import { ResultScreen } from './screens/ResultScreen';
export function App() {
  const {
    audio,
    options: optionsRepository,
    player,
    matches,
    network,
    records: api,
    queryClient,
    storage,
  } = useApplicationServices();
  const [options, setOptions] = useState(() => optionsRepository.load());
  const [playerId] = useState(() => player.load());
  const [screen, setScreen] = useState<'menu' | 'options' | 'howToPlay' | 'records' | 'game' | 'result'>(
    'menu',
  );
  const [recordsTab, setRecordsTab] = useState<RecordsTab>('ranking');
  const [config, setConfig] = useState<GameConfig | null>(null);
  const [gameId, setGameId] = useState('');
  const [resultReady, setResultReady] = useState(false);
  const [last, setLast] = useState(() => matches.last());
  const [pending, setPending] = useState(() => matches.pending());
  const pendingRef = useRef(pending);
  const attempted = useRef(new Set<string>());
  const [scenario, updateScenario] = useState(() => network.scenario);
  const [revision, setRevision] = useState(0);
  const [notice, setNotice] = useTransientNotice();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const save = useMutation({
    mutationFn: (record: MatchRecord) => api.save(record),
    onSuccess: (record) => {
      const next = pendingRef.current.filter((r) => r.id !== record.id);
      pendingRef.current = next;
      matches.savePending(next);
      setPending(next);
      setErrors((old) => {
        const copy = { ...old };
        delete copy[record.id];
        return copy;
      });
      void queryClient.invalidateQueries({ queryKey: ['ranking'] });
      void queryClient.invalidateQueries({ queryKey: ['history'] });
    },
    onError: (error, record) =>
      setErrors((old) => ({ ...old, [record.id]: RecordsApi.describeError(error) })),
  });
  const mutateRef = useRef(save.mutate);
  mutateRef.current = save.mutate;
  useEffect(() => {
    if (save.isPending) return;
    const next = pending.find((record) => !attempted.current.has(record.id));
    if (next) {
      attempted.current.add(next.id);
      mutateRef.current(next);
    }
  }, [pending, save.isPending]);
  useEffect(() => {
    audio.configure(options);
  }, [audio, options]);
  useEffect(() => {
    if (screen === 'game') return;
    const heading = document.querySelector<HTMLElement>('main h1');
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }, [screen]);
  const play = () => {
    audio.stopMatchSounds();
    audio.unlock(options);
    audio.playUi(AudioConfig.Cues.Click, 'ui-click');
    setConfig(GameConfigFactory.create(options));
    setGameId(crypto.randomUUID());
    setResultReady(false);
    setScreen('game');
  };
  const complete = (snapshot: Snapshot) => {
    if (!config || !snapshot.reason)
      throw new Error('A completed battle requires its configuration and end reason.');
    const record: MatchRecord = {
      id: gameId,
      playerId,
      playerName: 'You',
      date: new Date().toISOString(),
      score: snapshot.score,
      duration: snapshot.elapsed,
      reason: snapshot.reason,
      config,
      statistics: snapshot.statistics,
    };
    matches.saveLast(record);
    setLast(record);
    if (!pendingRef.current.some((r) => r.id === record.id)) {
      const next = [...pendingRef.current, record];
      pendingRef.current = next;
      matches.savePending(next);
      setPending(next);
    }
  };
  const retry = () => {
    if (save.isPending) return;
    const record = pendingRef.current[0];
    if (record) save.mutate(record);
  };
  const mainMenu = () => {
    setScreen('menu');
    audio.stopMatchSounds();
    audio.playUi(AudioConfig.Cues.Back, 'ui-back');
  };
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
    network.setScenario(value);
    updateScenario(value);
    setRevision((current) => current + 1);
    void queryClient.cancelQueries();
    void queryClient.invalidateQueries();
  };
  const resetDemoServer = () => {
    network.reset();
    updateScenario('success');
    setRevision((current) => current + 1);
    void queryClient.cancelQueries();
    queryClient.clear();
    setNotice('Demo server reset. Local results and pending battles are preserved.');
  };
  return (
    <>
      {(screen === 'game' || (screen === 'result' && !resultReady)) && config && (
        <GameLoadBoundary onMenu={mainMenu}>
          <Suspense
            fallback={
              <div className="app asset-loading-screen">
                <AssetLoadingIndicator label="Loading game engine" progress={null} />
              </div>
            }
          >
            <GameCanvas
              key={gameId}
              config={config}
              onComplete={complete}
              onAbandon={mainMenu}
              resultRevealing={screen === 'result'}
              onResultReveal={() => setScreen('result')}
              onResultReady={() => setResultReady(true)}
            />
          </Suspense>
        </GameLoadBoundary>
      )}
      {screen !== 'game' && (
        <main
          className={`app app-${screen}`}
          style={
            screen === 'result' && config
              ? ({
                  '--result-fade': `${config.presentation.resultFadeSeconds}s`,
                } as CSSProperties)
              : undefined
          }
        >
          <a className="skip-link" href="#main-content">
            Skip to content
          </a>
          <div id="main-content" className="shell" tabIndex={-1}>
            {screen === 'options' ? (
              <OptionsScreen
                options={options}
                onChange={(value) => {
                  optionsRepository.save(value);
                  setOptions(value);
                }}
                onMainMenu={mainMenu}
              />
            ) : screen === 'howToPlay' ? (
              <HowToPlay onMainMenu={mainMenu} />
            ) : screen === 'records' ? (
              <CaptainsLog
                tab={recordsTab}
                onTabChange={setRecordsTab}
                config={GameConfigFactory.create(options)}
                playerId={playerId}
                revision={revision}
                lastMatchId={last?.id ?? null}
                onMainMenu={mainMenu}
              />
            ) : screen === 'result' && last ? (
              <ResultScreen
                record={last}
                pending={pending.some((record) => record.id === last.id)}
                submitting={save.isPending && save.variables?.id === last.id}
                submissionBusy={save.isPending}
                error={errors[last.id]}
                onRetry={() => save.mutate(last)}
                onPlayAgain={play}
                onMainMenu={mainMenu}
              />
            ) : (
              <MainMenu actions={menuActions} />
            )}
            {(notice || storage.warning || network.warning) && (
              <p role="status" className="notice">
                {network.warning ?? storage.warning ?? notice}
              </p>
            )}
            {pending.length > 0 && (
              <aside className="pending-banner" aria-label="Pending submissions">
                <div>
                  <p>{pending.length} battle(s) awaiting registration. You can keep playing.</p>
                  {screen !== 'result' && pending[0] && errors[pending[0].id] && (
                    <p role="alert">{errors[pending[0].id]}</p>
                  )}
                </div>
                <Button className="compact" disabled={save.isPending} onClick={retry}>
                  {save.isPending ? 'Submitting…' : 'Retry pending battle'}
                </Button>
              </aside>
            )}
          </div>
          <DemoNetworkTools scenario={scenario} onSelect={selectScenario} onReset={resetDemoServer} />
          <img className="studio-logo" src={MenuArt.StudioLogo} alt="Jungle Gaming" />
        </main>
      )}
    </>
  );
}
