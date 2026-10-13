import { Application, Texture } from 'pixi.js';
import type { TextureSource } from 'pixi.js';
import type { GameConfig } from '../contracts/GameConfig';
import type { Action } from '../contracts/GameDomain';
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

export interface GameSessionCallbacks {
  readonly onStatus: (status: 'loading' | 'ready' | 'error') => void;
  readonly onProgress: (progress: number) => void;
  readonly onSnapshot: (snapshot: Snapshot | null) => void;
  readonly onError: (message: string) => void;
  readonly onComplete: (snapshot: Snapshot) => void;
  readonly onResultReveal: () => void;
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
  readonly #manual = new URLSearchParams(location.search).get('test') === '1';
  readonly #instrument = this.#manual || new URLSearchParams(location.search).get('profile') === '1';
  readonly #sources = new Set<TextureSource>();
  readonly #samples: number[] = [];
  #game: GameManager | null = null;
  #input: InputController | null = null;
  #application: Application | null = null;
  #mapView: MapRenderer | null = null;
  #arena: ArenaRenderer | null = null;
  #resize: ResizeObserver | null = null;
  #disposed = false;
  #initializing = false;
  #frame = 0;
  #focusFrame = 0;
  #lastFrame = 0;
  #accumulator = 0;
  #publishAt = 0;
  #finished = false;
  #terminalElapsed = 0;
  #revealed = false;
  #transitionComplete = false;
  #entityPeak = 0;

  constructor(dependencies: GameSessionDependencies) {
    this.#dependencies = dependencies;
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
        resolution: Math.min(devicePixelRatio, config.runtime.maxResolution),
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
      this.#resizeCanvas();
      this.#input = new InputController(root, this.pause);
      window.addEventListener('blur', this.pause);
      document.addEventListener('visibilitychange', this.#visibilityChanged);
      window.addEventListener('resize', this.#orientationChanged);
      this.#installObservation();
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
    if (!game || game.status !== 'playing') return;
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
    if (!game || game.status !== 'paused' || document.hidden || matchMedia('(orientation: portrait)').matches)
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

  readonly #motionChanged = (): void => {
    this.#game?.setReducedMotion(this.#reducedMotion.matches);
  };
  readonly #visibilityChanged = (): void => {
    if (document.hidden) this.pause();
  };
  readonly #orientationChanged = (): void => {
    if (matchMedia('(orientation: portrait)').matches) this.pause();
  };
  readonly #resizeCanvas = (): void => {
    const application = this.#application;
    if (this.#disposed || !application?.renderer) return;
    const viewport = this.#dependencies.viewport;
    application.renderer.resize(Math.max(1, viewport.clientWidth), Math.max(1, viewport.clientHeight));
    this.#mapView?.resize(application.screen.width, application.screen.height);
    application.render();
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
    if (!game || !this.#finished || this.#transitionComplete || document.hidden) return;
    const { config } = this.#dependencies;
    const totalSeconds = config.presentation.terminalSeconds + config.presentation.resultFadeSeconds;
    const remaining = Math.min(seconds, totalSeconds - this.#terminalElapsed);
    game.advancePresentation(remaining);
    this.#terminalElapsed += remaining;
    if (
      !this.#revealed &&
      this.#terminalElapsed + config.rules.clockTolerance >= config.presentation.terminalSeconds
    ) {
      this.#revealed = true;
      this.#dependencies.callbacks.onResultReveal();
    }
    if (this.#terminalElapsed + config.rules.clockTolerance >= totalSeconds) {
      this.#recordMetrics();
      this.#transitionComplete = true;
      this.#dependencies.callbacks.onResultReady();
    }
  }

  #update(seconds: number): void {
    const game = this.#game;
    if (!game) return;
    if (game.status === 'ended') {
      this.#advanceTerminal(seconds);
      return;
    }
    if (game.status !== 'playing') {
      this.#accumulator = 0;
      return;
    }
    const { config, audio, callbacks } = this.#dependencies;
    const input = this.#input;
    if (!input) throw new Error('An active match requires its input controller.');
    this.#accumulator += seconds;
    while (
      this.#accumulator + config.rules.geometryTolerance >= config.fixedStep &&
      game.status === 'playing'
    ) {
      game.step(config.fixedStep, input.read());
      this.#accumulator -= config.fixedStep;
    }
    audio.events(game.drainEvents());
    if (game.snapshot().status === 'ended' && !this.#finished) {
      this.#finished = true;
      input.setActive(false);
      this.#clearHeldButtons();
      this.#recordMetrics();
      audio.stopMatchLoops();
      audio.setDeathMusicDucked(game.reason === 'death');
      audio.play(game.reason === 'time' ? AudioConfig.Cues.Complete : AudioConfig.Cues.GameOver);
      callbacks.onComplete(game.snapshot());
      this.#advanceTerminal(Math.max(0, this.#accumulator));
      this.#accumulator = 0;
    }
  }

  #draw(): void {
    const game = this.#game;
    if (!game) return;
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
    if (game.status === 'playing') {
      if (!this.#manual) this.#update(Math.min(delta, config.runtime.maxFrameSeconds));
      if (this.#instrument && delta > 0 && game.elapsed > config.runtime.profileWarmupSeconds) {
        this.#samples.push(delta * 1000);
        if (this.#samples.length > config.runtime.maxFrameSamples) this.#samples.shift();
      }
      this.#entityPeak = Math.max(
        this.#entityPeak,
        game.enemies.length +
          game.projectiles.length +
          game.effects.length +
          game.presentation.particles.length +
          game.presentation.labels.length +
          1,
      );
    } else {
      this.#accumulator = 0;
      if (!this.#manual && game.status === 'ended')
        this.#advanceTerminal(Math.min(delta, config.runtime.maxFrameSeconds));
    }
    audio.ambience(game.status === 'playing', game.player.speed / config.player.movement.maxSpeed);
    this.#draw();
    if (now >= this.#publishAt) {
      this.#publishSnapshot();
      this.#publishAt = now + config.runtime.hudIntervalMs;
    }
    this.#frame = requestAnimationFrame(this.#tick);
  };

  #observe(includeFrames = false): GameObservation {
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
        particles: game.presentation.particles,
        crew: game.presentation.crewEmissions,
        pools: game.presentation.statistics(),
        time: game.presentation.time,
        reducedMotion: game.presentation.reducedMotion,
      },
      audio: this.#dependencies.audio.observation(),
      config: this.#dependencies.config,
      colliders: game.map.colliders,
      frames: includeFrames ? this.#samples : [],
      entityPeak: this.#entityPeak,
      terminal: {
        elapsed: this.#terminalElapsed,
        resultRevealing: this.#revealed,
      },
    });
  }

  #installObservation(): void {
    if (!this.#instrument) return;
    delete window.pirateMetrics;
    window.pirateTest = {
      observe: (includeFrames) => this.#observe(includeFrames),
      ...(this.#manual
        ? {
            advance: (seconds: number) => {
              if (
                !Number.isFinite(seconds) ||
                seconds < 0 ||
                seconds > this.#dependencies.config.runtime.maxTestAdvance
              ) {
                throw new Error('Invalid test clock advance.');
              }
              this.#update(seconds);
              this.#draw();
              this.#publishSnapshot();
            },
          }
        : {}),
    };
  }

  #recordMetrics(): void {
    const game = this.#game;
    if (!this.#instrument || !game) return;
    window.pirateMetrics = {
      frames: [...this.#samples],
      entityPeak: this.#entityPeak,
      elapsed: game.elapsed,
      score: game.score,
      reason: game.reason,
      audio: this.#dependencies.audio.observation(),
      presentationPools: game.presentation.statistics(),
    };
  }

  #destroyResources(): void {
    cancelAnimationFrame(this.#frame);
    cancelAnimationFrame(this.#focusFrame);
    this.#resize?.disconnect();
    this.#resize = null;
    this.#input?.destroy();
    this.#input = null;
    this.#game?.dispose();
    this.#game = null;
    if (this.#finished) this.#dependencies.audio.stopMatchLoops();
    else this.#dependencies.audio.stopMatchSounds();
    if (!this.#transitionComplete) this.#dependencies.audio.setDeathMusicDucked(false);
    if (this.#instrument) delete window.pirateTest;
    this.#reducedMotion.removeEventListener('change', this.#motionChanged);
    window.removeEventListener('blur', this.pause);
    document.removeEventListener('visibilitychange', this.#visibilityChanged);
    window.removeEventListener('resize', this.#orientationChanged);
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
