import { Application, Texture } from 'pixi.js';
import type { TextureSource } from 'pixi.js';
import { useEffect, useRef, useState } from 'react';
import type { GameConfig } from '../game/config';
import { loadTiledMap } from '../game/tiledMap';
import { MapRenderer } from '../game/mapRenderer';
import { loadGameTextures } from '../game/assets';
import { ArenaRenderer } from '../game/renderer';
import { Simulation } from '../game/simulation';
import type { Snapshot } from '../game/simulation';
import { InputController } from '../game/input';
import { InputConfig } from '../game/configuration/InputConfig';
import { audio } from '../game/audio';
import { AudioConfig } from '../game/configuration/AudioConfig';
import { Button, ControlsHelp, Dialog, uiAsset } from './components';
import './GameCanvas.css';
export interface GameObservation { snapshot: Snapshot; player: ReturnType<Simulation['observation']>['player']; enemies: ReturnType<Simulation['observation']>['enemies'];
  projectiles: ReturnType<Simulation['observation']>['projectiles']; pools: ReturnType<Simulation['poolStatistics']>; renderPools: ReturnType<ArenaRenderer['poolStatistics']>; effects: number; config: GameConfig;
  colliders: Simulation['map']['colliders']; frames: number[]; entityPeak: number }
declare global { interface Window { pirateTest?: { observe: (includeFrames?: boolean) => GameObservation; advance?: (seconds: number) => void };
  pirateMetrics?: { frames: number[]; entityPeak: number; elapsed: number; score: number; reason: string | null } } }
const commands = InputConfig.Controls;
export function GameCanvas({ config, onComplete, onAbandon }: {
  config: GameConfig; onComplete: (snapshot: Snapshot) => void; onAbandon: () => void;
}) {
  const rootRef = useRef<HTMLElement>(null); const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null); const queue = useRef<Promise<void>>(Promise.resolve());
  const simRef = useRef<Simulation | null>(null); const inputRef = useRef<InputController | null>(null);
  const callbacks = useRef({ onComplete, onAbandon }); callbacks.current = { onComplete, onAbandon };
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState(''); const [progress, setProgress] = useState(0); const [attempt, setAttempt] = useState(0);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null); const [abandon, setAbandon] = useState(false);
  function pause() { const sim = simRef.current; if (!sim || sim.status !== 'playing') return;
    sim.pause(); inputRef.current?.setActive(false); rootRef.current?.querySelectorAll<HTMLElement>('.command').forEach((button) => delete button.dataset.held);
    audio.ambience(false, false); audio.play(AudioConfig.Cues.Pause); setSnapshot(sim.snapshot()); }
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
    const abort = new AbortController(); const manual = new URLSearchParams(location.search).get('test') === '1';
    const instrument = manual || new URLSearchParams(location.search).get('profile') === '1';
    const samples: number[] = []; let entityPeak = 0;
    const sources = new Set<TextureSource>();
    const focusLost = () => { const sim = simRef.current; if (sim?.status === 'playing') {
      sim.pause(); inputRef.current?.setActive(false); root!.querySelectorAll<HTMLElement>('.command').forEach((button) => delete button.dataset.held);
      audio.ambience(false, false); audio.play(AudioConfig.Cues.Pause); setSnapshot(sim.snapshot()); }
      accumulator = 0; last = 0;
    };
    const visibility = () => { if (document.hidden) focusLost(); };
    const orientation = () => { if (matchMedia('(orientation: portrait)').matches) focusLost(); };
    function destroy() {
      cancelAnimationFrame(frame); resize?.disconnect(); resize = null; inputRef.current?.destroy(); inputRef.current = null;
      simRef.current?.dispose(); simRef.current = null; audio.stop(); delete window.pirateTest;
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
        const simulation = new Simulation(config, map); simRef.current = simulation;
        mapView = new MapRenderer(map, application.renderer, config.runtime.staticMapResolution); application.stage.addChild(mapView.world);
        arena = new ArenaRenderer(mapView.world, simulation, textures);
        const resizeCanvas = () => { if (disposed) return;
          application.renderer.resize(Math.max(1, host!.clientWidth), Math.max(1, host!.clientHeight));
          mapView?.resize(application.screen.width, application.screen.height); application.render(); };
        resize = new ResizeObserver(resizeCanvas); resize.observe(host!); resizeCanvas();
        const requestPause = () => focusLost(); inputRef.current = new InputController(root!, requestPause);
        window.addEventListener('blur', focusLost); document.addEventListener('visibilitychange', visibility);
        window.addEventListener('resize', orientation);
        const update = (seconds: number) => {
          if (simulation.status !== 'playing') { accumulator = 0; return; }
          accumulator += seconds;
          while (accumulator + config.rules.geometryTolerance >= config.fixedStep && simulation.status === 'playing') {
            simulation.step(config.fixedStep, inputRef.current!.read()); accumulator -= config.fixedStep;
          }
          audio.events(simulation.drainEvents());
          if (simulation.snapshot().status === 'ended' && !finished) { finished = true; inputRef.current?.setActive(false);
            if (instrument) window.pirateMetrics = { frames: [...samples], entityPeak, elapsed: simulation.elapsed, score: simulation.score, reason: simulation.reason };
            audio.stop(); audio.play(simulation.reason === 'time' ? AudioConfig.Cues.Complete : AudioConfig.Cues.GameOver); callbacks.current.onComplete(simulation.snapshot()); }
        };
        if (instrument) { delete window.pirateMetrics; window.pirateTest = { observe: (includeFrames = false) => structuredClone({ snapshot: simulation.snapshot(), ...simulation.observation(), pools: simulation.poolStatistics(), renderPools: arena!.poolStatistics(),
          effects: simulation.effects.length,
          config, colliders: map.colliders, frames: includeFrames ? samples : [], entityPeak }),
          ...(manual ? { advance: (seconds: number) => { if (!Number.isFinite(seconds) || seconds < 0 || seconds > config.runtime.maxTestAdvance) throw new Error('Invalid test clock advance.');
            update(seconds); arena?.draw(); application.render(); setSnapshot(simulation.snapshot()); } } : {}) }; }
        function tick(now: number) {
          if (disposed) return;
          const delta = last ? (now - last) / 1000 : 0; last = now;
          if (simulation.status === 'playing') {
            if (!manual) update(Math.min(delta, config.runtime.maxFrameSeconds));
            if (instrument && delta > 0 && simulation.elapsed > config.runtime.profileWarmupSeconds) { samples.push(delta * 1000); if (samples.length > config.runtime.maxFrameSamples) samples.shift(); }
            entityPeak = Math.max(entityPeak, simulation.enemies.length + simulation.projectiles.length + simulation.effects.length + 1);
          } else accumulator = 0;
          audio.ambience(simulation.status === 'playing', inputRef.current?.read().has('forward') ?? false);
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
  return <section ref={rootRef} className="game" tabIndex={0} aria-label="Gameplay controls">
    <header className="hud" aria-label="Match status">
      <div className="counter"><img src={uiAsset('hud/icon_heart')} alt="" /> <span>Health <strong>{snapshot?.health ?? config.player.health}</strong></span></div>
      <div className="counter"><img src={uiAsset('hud/icon_score')} alt="" /> <span>Score <strong>{snapshot?.score ?? 0}</strong></span></div>
      <div className="counter"><img src={uiAsset('hud/icon_time')} alt="" /> <span>Time <strong>{Math.ceil(snapshot?.remaining ?? config.sessionSeconds)}s</strong></span></div>
      <button className="round-button" aria-label="Pause game" disabled={status !== 'ready' || paused} onClick={pause}><img src={uiAsset('controls/icon_pause')} alt="" /></button>
    </header>
    <div ref={viewportRef} className="arena" aria-busy={status === 'loading'}>
      <canvas key={attempt} ref={canvasRef} aria-label="Naval battle arena" />
      {status === 'loading' && <div className="arena-message" role="status">Loading arena… {progress}%</div>}
      {status === 'error' && <div className="arena-message" role="alert"><p>Unable to load the arena.</p><p>{error}</p>
        <Button onClick={() => setAttempt((v) => v + 1)}>Try again</Button><Button onClick={onAbandon}>Main Menu</Button></div>}
    </div>
    <footer className="combat-footer">
      <div className="touch-controls">{commands.map(({ action, label, icon }) => <button key={action} type="button"
        className={`round-button command command-${action}`} aria-label={label} disabled={status !== 'ready' || paused}
        onPointerDown={(e) => { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); rootRef.current?.focus();
          inputRef.current?.press(`touch-${e.pointerId}`, action); e.currentTarget.dataset.held = 'true'; }}
        onPointerUp={(e) => { inputRef.current?.release(`touch-${e.pointerId}`); delete e.currentTarget.dataset.held; }}
        onPointerCancel={(e) => { inputRef.current?.release(`touch-${e.pointerId}`); delete e.currentTarget.dataset.held; }}
        onLostPointerCapture={(e) => { inputRef.current?.release(`touch-${e.pointerId}`); delete e.currentTarget.dataset.held; }}
        onKeyDown={(e) => { if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); inputRef.current?.press(`button-${action}`, action); } }}
        onKeyUp={() => inputRef.current?.release(`button-${action}`)} onBlur={() => inputRef.current?.release(`button-${action}`)}>
        <img src={uiAsset(`controls/icon_${icon}`)} alt="" /><span>{label}</span></button>)}</div>
      <ControlsHelp />
    </footer>
    <p className="sr-only" role="status">{status === 'loading' ? 'Loading arena' : paused ? 'Game paused' : 'Game active'}</p>
    {paused && <Dialog title={abandon ? 'Leave this battle?' : 'Battle paused'} onClose={() => { if (abandon) setAbandon(false); else resume(); }}>
      <p>{abandon ? 'This unfinished battle will not be saved.' : 'Time, movement and weapons are suspended. Resume when you are ready.'}</p>
      <p className="portrait-hint">Rotate your device to landscape before resuming.</p>
      {abandon ? <><Button onClick={() => setAbandon(false)}>Stay here</Button><Button onClick={onAbandon}>Leave battle</Button></>
        : <><Button onClick={resume}>Resume</Button><Button onClick={() => setAbandon(true)}>Main Menu</Button></>}
    </Dialog>}
  </section>;
}
