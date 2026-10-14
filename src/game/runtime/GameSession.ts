import { Application, Texture } from 'pixi.js';
import type { TextureSource } from 'pixi.js';
import type { GameConfig } from '../contracts/GameConfig';
import type { Action } from '../contracts/GameDomain';
import { EndReason, MatchStatus } from '../contracts/GameDomain';
import type { GameObservation } from '../contracts/GameObservation';
import { TiledMapLoader } from '../assets/TiledMapLoader';
import type { GameTextureLibrary } from '../assets/GameTextureLibrary';
import { MapRenderer } from '../rendering/MapRenderer';
import { ArenaRenderer } from '../rendering/ArenaRenderer';
import { GameManager } from './GameManager';
import type { Snapshot } from './GameManager';
import { InputController } from '../input/InputController';
import type { IMatchAudio } from '../contracts/MatchAudio';
import { AudioConfig } from '../configuration/AudioConfig';
import { SessionInstrumentation } from './SessionInstrumentation';
import { TerminalSequence } from './TerminalSequence';

export interface GameSessionCallbacks {
  readonly onStatus: (status: 'loading' | 'ready' | 'error') => void;
  readonly onProgress: (progress: number) => void;
  readonly onSnapshot: (snapshot: Snapshot | null) => void;
  readonly onError: (message: string) => void;
  readonly onComplete: (snapshot: Snapshot) => void;
  readonly onResultReveal: () => void;
  readonly onTerminalElapsed: (seconds: number) => void;
  readonly onResultReady: () => void;
}

export interface GameSessionDependencies {
  readonly root: HTMLElement;
  readonly canvas: HTMLCanvasElement;
  readonly viewport: HTMLElement;
  readonly config: GameConfig;
  readonly audio: IMatchAudio;
  readonly textures: GameTextureLibrary;
  readonly callbacks: GameSessionCallbacks;
}

/** Owns one browser/Pixi match lifetime. Domain rules remain in GameManager and its systems. */
export class GameSession {
  readonly #dependencies: GameSessionDependencies;
  readonly #abort = new AbortController();
  readonly #reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  readonly #instrumentation: SessionInstrumentation;
  readonly #sources = new Set<TextureSource>();
  #game: GameManager | null = null;
  #input: InputController | null = null;
  #application: Application | null = null;
  #mapView: MapRenderer | null = null;
  #arena: ArenaRenderer | null = null;
  #resize: ResizeObserver | null = null;
  #resolutionQuery: MediaQueryList | null = null;
  #terminal: TerminalSequence | null = null;
  #disposed = false;
  #initializing = false;
  #frame = 0;
  #focusFrame = 0;
  #lastFrame = 0;
  #accumulator = 0;
  #publishAt = 0;

  constructor(dependencies: GameSessionDependencies) {
    this.#dependencies = dependencies;
    this.#instrumentation = new SessionInstrumentation(dependencies.config, location.search);
  }

  async initialize(): Promise<void> {
    if (this.#disposed) return;
    const { root, canvas, viewport, config, textures, audio, callbacks } = this.#dependencies;
    this.#initializing = true;
    callbacks.onStatus('loading');
    callbacks.onProgress(0);
    callbacks.onSnapshot(null);
    const application = new Application();
    this.#application = application;
    try {
      await application.init({
        canvas,
        width: Math.max(1, viewport.clientWidth),
        height: Math.max(1, viewport.clientHeight),
        resolution: this.#resolution(),
        autoDensity: true,
        preference: 'webgl',
        background: config.runtime.background,
        autoStart: false,
        sharedTicker: false,
      });
      if (this.#disposed) return;
      const map = await TiledMapLoader.load(this.#abort.signal, (progress) => {
        if (!this.#disposed) callbacks.onProgress(Math.round(progress * config.runtime.mapProgressWeight));
      });
      for (const tileset of map.tilesets) this.#sources.add(tileset.texture.source);
      const loaded = await textures.load(config, (progress) => {
        if (!this.#disposed)
          callbacks.onProgress(
            Math.round(
              (config.runtime.mapProgressWeight + progress * (1 - config.runtime.mapProgressWeight)) * 100,
            ),
          );
      });
      for (const texture of Object.values(loaded)) this.#sources.add(texture.source);
      if (this.#disposed) return;
      this.#game = new GameManager(config, map);
      this.#motionChanged();
      this.#reducedMotion.addEventListener('change', this.#motionChanged);
      this.#mapView = new MapRenderer(
        map,
        application.renderer,
        config.runtime.staticMapResolution,
        config.presentation,
        loaded,
      );
      application.stage.addChild(this.#mapView.world);
      this.#arena = new ArenaRenderer(this.#mapView.world, this.#game.readView, loaded);
      this.#resize = new ResizeObserver(this.#resizeCanvas);
      this.#resize.observe(viewport);
      this.#watchResolution();
      this.#resizeCanvas();
      this.#input = new InputController(root, this.pause);
      window.addEventListener('blur', this.pause);
      document.addEventListener('visibilitychange', this.#visibilityChanged);
      window.addEventListener('resize', this.#windowResized);
      this.#instrumentation.install({
        observe: (includeFrames) => this.#observe(includeFrames),
        advance: (seconds) => {
          this.#update(seconds);
          this.#draw();
          this.#publishSnapshot();
        },
      });
      callbacks.onStatus('ready');
      this.#publishSnapshot();
      root.focus();
      audio.play(AudioConfig.Cues.Start);
      if (document.hidden || matchMedia('(orientation: portrait)').matches) this.pause();
      this.#frame = requestAnimationFrame(this.#tick);
    } catch (cause) {
      this.#destroyResources();
      if (!this.#disposed) {
        callbacks.onError(cause instanceof Error ? cause.message : 'Unknown asset loading error.');
        callbacks.onStatus('error');
      }
    } finally {
      this.#initializing = false;
      if (this.#disposed) this.#destroyResources();
    }
  }

  readonly pause = (): void => {
    const game = this.#game;
    if (!game || game.status !== MatchStatus.Playing) return;
    game.pause();
    this.#input?.setActive(false);
    this.#clearHeldButtons();
    this.#accumulator = 0;
    this.#lastFrame = 0;
    this.#dependencies.audio.ambience(false, 0);
    this.#dependencies.audio.play(AudioConfig.Cues.Pause);
    this.#publishSnapshot();
  };

  resume(): void {
    const game = this.#game;
    if (
      !game ||
      game.status !== MatchStatus.Paused ||
      document.hidden ||
      matchMedia('(orientation: portrait)').matches
    )
      return;
    game.resume();
    this.#input?.setActive(true);
    this.#accumulator = 0;
    this.#lastFrame = 0;
    this.#dependencies.audio.play(AudioConfig.Cues.Resume);
    this.#publishSnapshot();
    // React closes the modal after publishing; focus must return after that commit.
    this.#focusFrame = requestAnimationFrame(() => {
      if (!this.#disposed) this.#dependencies.root.focus();
    });
  }

  press(source: string, action: Action): void {
    this.#input?.press(source, action);
  }
  release(source: string): void {
    this.#input?.release(source);
  }
  focus(): void {
    this.#dependencies.root.focus();
  }

  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#abort.abort();
    // An in-flight Pixi init must settle before its partial resources can be destroyed safely.
    if (!this.#initializing) this.#destroyResources();
  }

  /** Device pixels per CSS pixel, capped by the runtime budget. */
  #resolution(): number {
    return Math.min(devicePixelRatio, this.#dependencies.config.runtime.maxResolution);
  }

  readonly #motionChanged = (): void => {
    this.#game?.setReducedMotion(this.#reducedMotion.matches);
  };
  readonly #visibilityChanged = (): void => {
    if (document.hidden) this.pause();
  };
  /** Portrait pauses combat; a zoom or monitor change can alter density without a layout resize. */
  readonly #windowResized = (): void => {
    if (matchMedia('(orientation: portrait)').matches) this.pause();
    if (this.#application?.renderer && this.#application.renderer.resolution !== this.#resolution())
      this.#resolutionChanged();
  };
  /** A window moved to another monitor or a browser zoom changes devicePixelRatio without resizing. */
  readonly #resolutionChanged = (): void => {
    this.#watchResolution();
    this.#resizeCanvas();
  };
  #watchResolution(): void {
    this.#resolutionQuery?.removeEventListener('change', this.#resolutionChanged);
    this.#resolutionQuery = matchMedia(`(resolution: ${devicePixelRatio}dppx)`);
    this.#resolutionQuery.addEventListener('change', this.#resolutionChanged);
  }
  readonly #resizeCanvas = (): void => {
    const application = this.#application;
    if (this.#disposed || !application?.renderer) return;
    const viewport = this.#dependencies.viewport;
    application.renderer.resize(
      Math.max(1, viewport.clientWidth),
      Math.max(1, viewport.clientHeight),
      this.#resolution(),
    );
    this.#mapView?.resize(application.screen.width, application.screen.height);
    this.#draw();
  };

  #publishSnapshot(): void {
    this.#dependencies.callbacks.onSnapshot(this.#game?.snapshot() ?? null);
  }
  #clearHeldButtons(): void {
    this.#dependencies.root
      .querySelectorAll<HTMLElement>('.command')
      .forEach((button) => delete button.dataset.held);
  }

  #advanceTerminal(seconds: number): void {
    const game = this.#game;
    const terminal = this.#terminal;
    if (!game || !terminal || terminal.complete || document.hidden) return;
    const { callbacks } = this.#dependencies;
    const step = terminal.advance(seconds);
    game.advancePresentation(step.consumed);
    // Victory fades on this same clock, including hidden-tab suspension and test advancement.
    if (terminal.victory) callbacks.onTerminalElapsed(terminal.elapsed);
    if (step.revealedNow) callbacks.onResultReveal();
    if (step.completedNow) {
      this.#recordMetrics();
      callbacks.onResultReady();
    }
  }

  #update(seconds: number): void {
    const game = this.#game;
    if (!game) return;
    if (game.status === MatchStatus.Ended) {
      this.#advanceTerminal(seconds);
      return;
    }
    if (game.status !== MatchStatus.Playing) {
      this.#accumulator = 0;
      return;
    }
    const { config, audio, callbacks } = this.#dependencies;
    const input = this.#input;
    if (!input) throw new Error('An active match requires its input controller.');
    this.#accumulator += seconds;
    while (
      this.#accumulator + config.rules.geometryTolerance >= config.fixedStep &&
      game.status === MatchStatus.Playing
    ) {
      game.step(config.fixedStep, input.read());
      this.#accumulator -= config.fixedStep;
    }
    audio.events(game.drainEvents());
    // GameManager.step can finish the match; only a finished match has an end reason.
    const reason = game.reason;
    if (reason && !this.#terminal) {
      this.#terminal = new TerminalSequence(reason, config.presentation, config.rules.clockTolerance);
      input.setActive(false);
      this.#clearHeldButtons();
      this.#recordMetrics();
      audio.stopMatchLoops();
      audio.setDeathMusicDucked(reason === EndReason.Death);
      audio.play(reason === EndReason.Time ? AudioConfig.Cues.Complete : AudioConfig.Cues.GameOver);
      callbacks.onComplete(game.snapshot());
      this.#advanceTerminal(Math.max(0, this.#accumulator));
      this.#accumulator = 0;
    }
  }

  #draw(): void {
    const game = this.#game;
    if (!game) return;
    this.#mapView?.follow(game.player);
    this.#mapView?.animate(
      game.presentation.time,
      game.presentation.reducedMotion,
      game.presentation.shake(),
    );
    this.#arena?.draw();
    this.#application?.render();
  }

  readonly #tick = (now: number): void => {
    const game = this.#game;
    if (this.#disposed || !game) return;
    const { config, audio } = this.#dependencies;
    const delta = this.#lastFrame ? (now - this.#lastFrame) / 1000 : 0;
    this.#lastFrame = now;
    const manual = this.#instrumentation.manualClock;
    if (game.status === MatchStatus.Playing) {
      if (!manual) this.#update(Math.min(delta, config.runtime.maxFrameSeconds));
      this.#instrumentation.sampleFrame(delta, game.elapsed);
      this.#instrumentation.trackEntities(
        game.enemies.length +
          game.projectiles.length +
          game.effects.length +
          game.presentation.particles.length +
          game.presentation.labels.length +
          1,
      );
    } else {
      this.#accumulator = 0;
      if (!manual && game.status === MatchStatus.Ended)
        this.#advanceTerminal(Math.min(delta, config.runtime.maxFrameSeconds));
    }
    audio.ambience(game.status === MatchStatus.Playing, game.player.speed / config.player.movement.maxSpeed);
    this.#draw();
    if (now >= this.#publishAt) {
      this.#publishSnapshot();
      this.#publishAt = now + config.runtime.hudIntervalMs;
    }
    this.#frame = requestAnimationFrame(this.#tick);
  };

  #observe(includeFrames: boolean): GameObservation {
    const game = this.#game;
    const arena = this.#arena;
    if (!game || !arena) throw new Error('Cannot observe an uninitialized or disposed match.');
    return structuredClone({
      snapshot: game.snapshot(),
      ...game.observation(),
      pools: game.poolStatistics(),
      renderPools: arena.poolStatistics(),
      effects: game.effects.length,
      presentation: {
        labels: game.presentation.labels,
        particles: game.presentation.particles,
        trails: game.presentation.shipTrails,
        crew: game.presentation.crewEmissions,
        pools: game.presentation.statistics(),
        time: game.presentation.time,
        reducedMotion: game.presentation.reducedMotion,
      },
      audio: this.#dependencies.audio.observation(),
      config: this.#dependencies.config,
      camera: this.#mapView!.camera.observation(),
      colliders: game.map.colliders,
      frames: includeFrames ? this.#instrumentation.frames : [],
      entityPeak: this.#instrumentation.entityPeak,
      terminal: {
        elapsed: this.#terminal?.elapsed ?? 0,
        resultRevealing: this.#terminal?.revealed ?? false,
      },
    });
  }

  #recordMetrics(): void {
    const game = this.#game;
    if (!game) return;
    this.#instrumentation.recordMetrics({
      elapsed: game.elapsed,
      score: game.score,
      reason: game.reason,
      audio: this.#dependencies.audio.observation(),
      presentationPools: game.presentation.statistics(),
    });
  }

  #destroyResources(): void {
    cancelAnimationFrame(this.#frame);
    cancelAnimationFrame(this.#focusFrame);
    this.#resize?.disconnect();
    this.#resize = null;
    this.#resolutionQuery?.removeEventListener('change', this.#resolutionChanged);
    this.#resolutionQuery = null;
    this.#input?.destroy();
    this.#input = null;
    this.#game?.dispose();
    this.#game = null;
    if (this.#terminal) this.#dependencies.audio.stopMatchLoops();
    else this.#dependencies.audio.stopMatchSounds();
    if (!this.#terminal?.complete) this.#dependencies.audio.setDeathMusicDucked(false);
    this.#instrumentation.uninstall();
    this.#reducedMotion.removeEventListener('change', this.#motionChanged);
    window.removeEventListener('blur', this.pause);
    document.removeEventListener('visibilitychange', this.#visibilityChanged);
    window.removeEventListener('resize', this.#windowResized);
    this.#arena?.destroy();
    this.#arena = null;
    this.#mapView?.destroy();
    this.#mapView = null;
    for (const source of this.#sources) source.unload();
    this.#sources.clear();
    const application = this.#application;
    if (application) {
      if (application.renderer) {
        Texture.EMPTY.source.unload();
        application.destroy({ removeView: false }, { children: true });
      } else application.stage.destroy({ children: true });
      this.#application = null;
    }
  }
}
