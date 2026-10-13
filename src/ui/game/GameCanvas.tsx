import { Application, Texture } from 'pixi.js';
import type { TextureSource } from 'pixi.js';
import { useEffect, useRef, useState } from 'react';
import type { GameConfig } from '../../game/configuration/GameConfiguration';
import { loadTiledMap } from '../../game/assets/TiledMapLoader';
import { MapRenderer } from '../../game/rendering/MapRenderer';
import { loadGameTextures } from '../../game/assets/GameTextureLibrary';
import { ArenaRenderer } from '../../game/rendering/ArenaRenderer';
import { GameManager } from '../../game/runtime/GameManager';
import type { Snapshot } from '../../game/runtime/GameManager';
import { InputController } from '../../game/input/InputController';
import { audio } from '../../game/audio/AudioManager';
import { AudioConfig } from '../../game/configuration/AudioConfig';
import { Button } from '../components/Button';
import { Dialog } from '../components/Dialog';
import { MatchStatusHud } from '../hud/MatchStatusHud';
import { TouchControls } from '../hud/TouchControls';
import type { TouchInput } from '../hud/TouchControls';
import { MenuArt } from '../assets/MenuArt';
import './GameCanvas.css';
export interface GameObservation { snapshot: Snapshot; player: ReturnType<GameManager['observation']>['player']; enemies: ReturnType<GameManager['observation']>['enemies'];
  projectiles: ReturnType<GameManager['observation']>['projectiles']; pools: ReturnType<GameManager['poolStatistics']>; renderPools: ReturnType<ArenaRenderer['poolStatistics']>; effects: number; config: GameConfig;
  colliders: GameManager['map']['colliders']; frames: number[]; entityPeak: number;
  presentation: { particles: GameManager['presentation']['particles']; crew: GameManager['presentation']['crewEmissions']; pools: ReturnType<GameManager['presentation']['statistics']>; time: number; reducedMotion: boolean };
  audio: ReturnType<typeof audio.observation> }
declare global { interface Window { pirateTest?: { observe: (includeFrames?: boolean) => GameObservation; advance?: (seconds: number) => void };
  pirateMetrics?: { frames: number[]; entityPeak: number; elapsed: number; score: number; reason: string | null;
    audio: ReturnType<typeof audio.observation>; presentationPools: ReturnType<GameManager['presentation']['statistics']> } } }
export function GameCanvas({ config, onComplete, onAbandon, onResultReady }: {
  config: GameConfig; onComplete: (snapshot: Snapshot) => void; onAbandon: () => void; onResultReady: () => void;
}) {
  const rootRef = useRef<HTMLElement>(null); const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); const queue = useRef<Promise<void>>(Promise.resolve());
  const simRef = useRef<GameManager | null>(null); const inputRef = useRef<InputController | null>(null);
  const callbacks = useRef({ onComplete, onAbandon, onResultReady }); callbacks.current = { onComplete, onAbandon, onResultReady };
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState(''); const [progress, setProgress] = useState(0); const [attempt, setAttempt] = useState(0);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null); const [abandon, setAbandon] = useState(false);
  function pause() { const sim = simRef.current; if (!sim || sim.status !== 'playing') return;
    sim.pause(); inputRef.current?.setActive(false); rootRef.current?.querySelectorAll<HTMLElement>('../.command').forEach((button) => delete button.dataset.held);
    audio.ambience(false, 0); audio.play(AudioConfig.Cues.Pause); setSnapshot(sim.snapshot()); }
  function resume() { const sim = simRef.current; if (!sim || sim.status !== 'paused' || document.hidden) return;
    if (matchMedia('(orientation: portrait)').matches) return;
    sim.resume(); inputRef.current?.setActive(true); audio.play(AudioConfig.Cues.Resume); setSnapshot(sim.snapshot());
    requestAnimationFrame(() => rootRef.current?.focus()); }
  useEffect(() => {
    const root = rootRef.current; const canvas = canvasRef.current; const host = viewportRef.current;
    if (!root || !canvas || !host) throw new Error('The arena requires its authored viewport and canvas.');
    let disposed = false; let initialized = false; let app: Application | null = null;
    let mapView: MapRenderer | null = null; let arena: ArenaRenderer | null = null;
    let resize: ResizeObserver | null = null; let frame = 0; let last = 0; let accumulator = 0; let publishAt = 0; let finished = false;
    let terminalElapsed = 0; let revealed = false;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const motionChanged = () => simRef.current?.setReducedMotion(reducedMotion.matches);
    const abort = new AbortController(); const manual = new URLSearchParams(location.search).get('test') === '1';
    const instrument = manual || new URLSearchParams(location.search).get('profile') === '1';
    const samples: number[] = []; let entityPeak = 0;
    const sources = new Set<TextureSource>();
    const focusLost = () => { const sim = simRef.current; if (sim?.status === 'playing') {
      sim.pause(); inputRef.current?.setActive(false); root!.querySelectorAll<HTMLElement>('../.command').forEach((button) => delete button.dataset.held);
      audio.ambience(false, 0); audio.play(AudioConfig.Cues.Pause); setSnapshot(sim.snapshot()); }
      accumulator = 0; last = 0;
    };
    const visibility = () => { if (document.hidden) focusLost(); };
    const orientation = () => { if (matchMedia('(orientation: portrait)').matches) focusLost(); };
    function destroy() {
      cancelAnimationFrame(frame); resize?.disconnect(); resize = null; inputRef.current?.destroy(); inputRef.current = null;
      simRef.current?.dispose(); simRef.current = null;
      if (finished) audio.stopLoops(); else audio.stop();
      delete window.pirateTest;
      reducedMotion.removeEventListener('change', motionChanged);
      window.removeEventListener('blur', focusLost); document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('resize', orientation);
      arena?.destroy(); arena = null; mapView?.destroy(); mapView = null;
      // Preserve decoded image caches, but release per-renderer GPU handles before
      // losing this WebGL context. Cached sources otherwise retain old context IDs.
      for (const source of sources) source.unload(); sources.clear();
      if (app?.renderer) Texture.EMPTY.source.unload();
      if (app) { if (app.renderer) app.destroy({ removeView: false }, { children: true }); else app.stage.destroy({ children: true }); app = null; }
    }
    async function initialize() {
      if (disposed) return; setStatus('loading'); setProgress(0); setSnapshot(null);
      const application = new Application(); app = application;
      try {
        await application.init({ canvas: canvas!, width: Math.max(1, host!.clientWidth), height: Math.max(1, host!.clientHeight),
          resolution: Math.min(devicePixelRatio, config.runtime.maxResolution), autoDensity: true, preference: 'webgl', background: config.runtime.background, autoStart: false, sharedTicker: false });
        initialized = true; if (disposed) { destroy(); return; }
        const map = await loadTiledMap(abort.signal, (p) => { if (!disposed) setProgress(Math.round(p * config.runtime.mapProgressWeight)); });
        for (const tileset of map.tilesets) sources.add(tileset.texture.source);
        const textures = await loadGameTextures(config, (p) => { if (!disposed) setProgress(Math.round((config.runtime.mapProgressWeight + p * (1 - config.runtime.mapProgressWeight)) * 100)); });
        for (const texture of Object.values(textures)) sources.add(texture.source);
        if (disposed) { destroy(); return; }
        const simulation = new GameManager(config, map); simRef.current = simulation;
        motionChanged(); reducedMotion.addEventListener('change', motionChanged);
        mapView = new MapRenderer(map, application.renderer, config.runtime.staticMapResolution, config.presentation, textures); application.stage.addChild(mapView.world);
        arena = new ArenaRenderer(mapView.world, simulation, textures);
        const resizeCanvas = () => { if (disposed) return;
          application.renderer.resize(Math.max(1, host!.clientWidth), Math.max(1, host!.clientHeight));
          mapView?.resize(application.screen.width, application.screen.height); application.render(); };
        resize = new ResizeObserver(resizeCanvas); resize.observe(host!); resizeCanvas();
        const requestPause = () => focusLost(); inputRef.current = new InputController(root!, requestPause);
        window.addEventListener('blur', focusLost); document.addEventListener('visibilitychange', visibility);
        window.addEventListener('resize', orientation);
        const advanceTerminal = (seconds: number) => {
          if (!finished || revealed || document.hidden) return;
          const remaining = Math.min(seconds, config.presentation.terminalSeconds - terminalElapsed);
          simulation.advancePresentation(remaining); terminalElapsed += remaining;
          if (terminalElapsed + config.rules.clockTolerance >= config.presentation.terminalSeconds) {
            if (instrument) window.pirateMetrics = { frames: [...samples], entityPeak, elapsed: simulation.elapsed, score: simulation.score, reason: simulation.reason,
              audio: audio.observation(), presentationPools: simulation.presentation.statistics() };
            revealed = true; callbacks.current.onResultReady();
          }
        };
        const update = (seconds: number) => {
          if (simulation.status === 'ended') { advanceTerminal(seconds); return; }
          if (simulation.status !== 'playing') { accumulator = 0; return; }
          accumulator += seconds;
          while (accumulator + config.rules.geometryTolerance >= config.fixedStep && simulation.status === 'playing') {
            simulation.step(config.fixedStep, inputRef.current!.read()); accumulator -= config.fixedStep;
          }
          audio.events(simulation.drainEvents());
          if (simulation.snapshot().status === 'ended' && !finished) { finished = true; inputRef.current?.setActive(false);
            root!.querySelectorAll<HTMLElement>('../.command').forEach((button) => delete button.dataset.held);
            if (instrument) window.pirateMetrics = { frames: [...samples], entityPeak, elapsed: simulation.elapsed, score: simulation.score, reason: simulation.reason,
              audio: audio.observation(), presentationPools: simulation.presentation.statistics() };
            audio.stopLoops(); audio.play(simulation.reason === 'time' ? AudioConfig.Cues.Complete : AudioConfig.Cues.GameOver);
            callbacks.current.onComplete(simulation.snapshot());
            advanceTerminal(Math.max(0, accumulator)); accumulator = 0;
          }
        };
        if (instrument) { delete window.pirateMetrics; window.pirateTest = { observe: (includeFrames = false) => structuredClone({ snapshot: simulation.snapshot(), ...simulation.observation(), pools: simulation.poolStatistics(), renderPools: arena!.poolStatistics(),
          effects: simulation.effects.length,
          presentation: { particles: simulation.presentation.particles, crew: simulation.presentation.crewEmissions,
            pools: simulation.presentation.statistics(), time: simulation.presentation.time, reducedMotion: simulation.presentation.reducedMotion }, audio: audio.observation(),
          config, colliders: map.colliders, frames: includeFrames ? samples : [], entityPeak }),
          ...(manual ? { advance: (seconds: number) => { if (!Number.isFinite(seconds) || seconds < 0 || seconds > config.runtime.maxTestAdvance) throw new Error('Invalid test clock advance.');
            update(seconds); mapView?.animate(simulation.presentation.time, simulation.presentation.reducedMotion, simulation.presentation.shake());
            arena?.draw(); application.render(); setSnapshot(simulation.snapshot()); } } : {}) }; }
        function tick(now: number) {
          if (disposed) return;
          const delta = last ? (now - last) / 1000 : 0; last = now;
          if (simulation.status === 'playing') {
            if (!manual) update(Math.min(delta, config.runtime.maxFrameSeconds));
            if (instrument && delta > 0 && simulation.elapsed > config.runtime.profileWarmupSeconds) { samples.push(delta * 1000); if (samples.length > config.runtime.maxFrameSamples) samples.shift(); }
            entityPeak = Math.max(entityPeak, simulation.enemies.length + simulation.projectiles.length + simulation.effects.length
              + simulation.presentation.particles.length + simulation.presentation.labels.length + 1);
          } else { accumulator = 0; if (!manual && simulation.status === 'ended') advanceTerminal(Math.min(delta, config.runtime.maxFrameSeconds)); }
          audio.ambience(simulation.status === 'playing', simulation.player.speed / config.player.movement.maxSpeed);
          mapView?.animate(simulation.presentation.time, simulation.presentation.reducedMotion, simulation.presentation.shake());
          arena?.draw(); application.render();
          if (now >= publishAt) { setSnapshot(simulation.snapshot()); publishAt = now + config.runtime.hudIntervalMs; }
          frame = requestAnimationFrame(tick);
        }
        setStatus('ready'); setSnapshot(simulation.snapshot()); root!.focus(); audio.play(AudioConfig.Cues.Start);
        if (document.hidden || matchMedia('(orientation: portrait)').matches) focusLost();
        frame = requestAnimationFrame(tick);
      } catch (cause) { destroy(); if (!disposed) { setError(cause instanceof Error ? cause.message : 'Unknown asset loading error.'); setStatus('error'); } }
    }
    queue.current = queue.current.then(initialize);
    return () => { disposed = true; abort.abort(); if (initialized) destroy(); };
  }, [attempt, config]);
  const paused = snapshot?.status === 'paused';
  const ended = snapshot?.status === 'ended';
  const commandsDisabled = status !== 'ready' || paused || ended;
  const touchInput: TouchInput = {
    press: (source, action) => inputRef.current?.press(source, action),
    release: (source) => inputRef.current?.release(source),
    focusArena: () => rootRef.current?.focus(),
  };
  return <section ref={rootRef} className="game" tabIndex={0} aria-label="Gameplay controls">
    <div ref={viewportRef} className="arena" aria-busy={status === 'loading'}>
      <canvas key={attempt} ref={canvasRef} aria-label="Naval battle arena" />
      {ended && <div className="terminal-banner" role="status">{snapshot.reason === 'death' ? 'Ship Sunk' : 'Battle Complete'}</div>}
      {status === 'loading' && <div className="arena-message" role="status">Loading arena… {progress}%</div>}
      {status === 'error' && <div className="arena-message" role="alert"><p>Unable to load the arena.</p><p>{error}</p>
        <Button onClick={() => setAttempt((v) => v + 1)}>Try again</Button><Button onClick={onAbandon}>Main Menu</Button></div>}
    </div>
    <MatchStatusHud config={config} snapshot={snapshot} canPause={!commandsDisabled} onPause={pause} />
    <TouchControls snapshot={snapshot} disabled={commandsDisabled} input={touchInput} />
    <img className="hud-studio-logo" src={MenuArt.StudioLogo} alt="Jungle Gaming" />
    <p className="sr-only" role="status">{status === 'loading' ? 'Loading arena' : paused ? 'Game paused' : ended ? 'Battle ended' : 'Game active'}</p>
    {paused && <Dialog title={abandon ? 'Leave this battle?' : 'Battle paused'} onClose={() => { if (abandon) setAbandon(false); else resume(); }}>
      <p>{abandon ? 'This unfinished battle will not be saved.' : 'Time, movement and weapons are suspended. Resume when you are ready.'}</p>
      <p className="portrait-hint">Rotate your device to landscape before resuming.</p>
      {abandon ? <><Button variant="secondary" onClick={() => setAbandon(false)}>Stay here</Button><Button icon="icon_close" onClick={onAbandon}>Leave battle</Button></>
        : <><Button icon="icon_play" onClick={resume}>Resume</Button><Button variant="secondary" icon="icon_home" onClick={() => setAbandon(true)}>Main Menu</Button></>}
    </Dialog>}
  </section>;
}
