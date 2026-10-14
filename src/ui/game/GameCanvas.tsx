import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Options } from '../../application/configuration/Options';
import type { GameConfig } from '../../game/contracts/GameConfig';
import { EndReason } from '../../game/contracts/GameDomain';
import type { Snapshot } from '../../game/runtime/GameManager';
import { GameSession } from '../../game/runtime/GameSession';
import { useApplicationServices } from '../hooks/UseApplicationServices';
import { Button } from '../components/Button';
import { AssetLoadingIndicator } from '../components/AssetLoadingIndicator';
import { PauseMenu } from './PauseMenu';
import { MatchStatusHud } from '../hud/MatchStatusHud';
import { TouchControls } from '../hud/TouchControls';
import type { TouchInput } from '../hud/TouchControls';
import { MenuArt } from '../assets/MenuArt';
import './GameCanvas.css';

/** React view: authors markup and translates user actions into session commands. */
export function GameCanvas({
  config,
  options,
  onOptionsChange,
  onComplete,
  onAbandon,
  onResultReady,
  onResultReveal,
  resultRevealing,
}: {
  config: GameConfig;
  /** Live preferences for the pause board's Options; the running battle keeps its frozen config. */
  options: Options;
  onOptionsChange: (options: Options) => void;
  onComplete: (snapshot: Snapshot) => void;
  onAbandon: () => void;
  onResultReady: () => void;
  onResultReveal: () => void;
  resultRevealing: boolean;
}) {
  const services = useApplicationServices();
  const { audio } = services;
  const rootRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const sessionRef = useRef<GameSession | null>(null);
  const callbacks = useRef({ onComplete, onResultReady, onResultReveal });
  callbacks.current = { onComplete, onResultReady, onResultReveal };
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [terminalElapsed, setTerminalElapsed] = useState(0);
  const pause = () => sessionRef.current?.pause();
  const resume = () => sessionRef.current?.resume();

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const viewport = viewportRef.current;
    if (!root || !canvas || !viewport)
      throw new Error('The arena requires its authored viewport and canvas.');
    let disposed = false;
    let session: GameSession | null = null;
    queue.current = queue.current.then(async () => {
      try {
        const textures = await services.loadTextureLibrary();
        if (disposed) return;
        session = new GameSession({
          root,
          canvas,
          viewport,
          config,
          audio,
          textures,
          callbacks: {
            onStatus: setStatus,
            onProgress: setProgress,
            onSnapshot: setSnapshot,
            onError: setError,
            onComplete: (value) => callbacks.current.onComplete(value),
            onResultReveal: () => callbacks.current.onResultReveal(),
            onTerminalElapsed: setTerminalElapsed,
            onResultReady: () => callbacks.current.onResultReady(),
          },
        });
        sessionRef.current = session;
        await session.initialize();
      } catch (cause) {
        if (!disposed) {
          setError(cause instanceof Error ? cause.message : 'Unable to load texture library.');
          setStatus('error');
        }
      }
    });
    return () => {
      disposed = true;
      session?.dispose();
      if (sessionRef.current === session) sessionRef.current = null;
    };
  }, [attempt, config, audio, services]);
  const paused = snapshot?.status === 'paused';
  const ended = snapshot?.status === 'ended';
  const victory = ended && snapshot.reason === EndReason.Time;
  const victoryOpacity = Math.min(
    1,
    Math.max(
      0,
      (config.presentation.victory.seconds - terminalElapsed) / config.presentation.victory.fadeOutSeconds,
    ),
  );
  const commandsDisabled = status !== 'ready' || paused || ended;
  const touchInput: TouchInput = {
    press: (source, action) => sessionRef.current?.press(source, action),
    release: (source) => sessionRef.current?.release(source),
    focusArena: () => rootRef.current?.focus(),
  };
  return (
    <section
      ref={rootRef}
      className={`game${resultRevealing ? ' game-result-revealing' : ''}`}
      style={
        {
          '--terminal-fade-in': `${config.presentation.terminalFadeInSeconds}s`,
          '--result-fade': `${config.presentation.resultFadeSeconds}s`,
        } as CSSProperties
      }
      tabIndex={0}
      aria-label="Gameplay controls"
    >
      <div ref={viewportRef} className="arena" aria-busy={status === 'loading'}>
        <canvas key={attempt} ref={canvasRef} aria-label="Naval battle arena" />
        {ended && (
          <div
            className={`terminal-banner${victory ? ' terminal-victory' : ''}`}
            style={victory ? { opacity: victoryOpacity } : undefined}
            role="status"
          >
            {victory ? 'You survived! Congratulations!' : 'Game Over'}
          </div>
        )}
        {status === 'loading' && (
          <div className="arena-message">
            <AssetLoadingIndicator label="Loading arena" progress={progress} />
          </div>
        )}
        {status === 'error' && (
          <div className="arena-message" role="alert">
            <p>Unable to load the arena.</p>
            <p>{error}</p>
            <Button
              onClick={() => {
                setProgress(0);
                setError('');
                setStatus('loading');
                setAttempt((v) => v + 1);
              }}
            >
              Try again
            </Button>
            <Button onClick={onAbandon}>Main Menu</Button>
          </div>
        )}
      </div>
      <MatchStatusHud config={config} snapshot={snapshot} canPause={!commandsDisabled} onPause={pause} />
      <TouchControls snapshot={snapshot} disabled={commandsDisabled} input={touchInput} />
      <img className="hud-studio-logo" src={MenuArt.StudioLogo} alt="Jungle Gaming" />
      <p className="sr-only" role="status">
        {status === 'loading'
          ? 'Loading arena'
          : paused
            ? 'Game paused'
            : ended
              ? 'Battle ended'
              : 'Game active'}
      </p>
      {paused && (
        <PauseMenu
          options={options}
          onOptionsChange={onOptionsChange}
          onResume={resume}
          onLeave={onAbandon}
        />
      )}
    </section>
  );
}
