import type { Options } from '../../application/configuration/Options';
import type { GameEvent } from '../contracts/GameDomain';
import type { MusicPlayer } from './MusicPlayer';
import type { SoundEffectPlayer } from './SoundEffectPlayer';

/** Application audio coordinator. Match commands affect effects and ambience only. */
export class AudioManager {
  readonly #effects: SoundEffectPlayer;
  readonly #music: MusicPlayer;
  #options: Options;
  constructor(effects: SoundEffectPlayer, music: MusicPlayer, options: Options) {
    this.#options = { ...options };
    this.#effects = effects;
    this.#music = music;
    this.configure(options);
  }
  get music(): MusicPlayer {
    return this.#music;
  }
  get error(): string | null {
    return this.#music.error ?? this.#effects.error;
  }
  configure(options: Options): void {
    this.#options = { ...options };
    this.#effects.configure(options);
    this.#music.configure(options);
  }
  unlock(options: Options = this.#options): void {
    this.configure(options);
    this.#effects.unlock(options);
    this.#music.unlock();
  }
  play(name: string, loop = false): void {
    this.#effects.play(name, loop);
  }
  playUi(name: string, group = name): void {
    this.#effects.playUi(name, group);
  }
  events(events: GameEvent[]): void {
    this.#effects.events(events);
  }
  ambience(playing: boolean, speedRatio: number): void {
    this.#effects.ambience(playing, speedRatio);
  }
  stopMatchLoops(): void {
    this.#effects.stopLoops();
  }
  stopMatchSounds(): void {
    this.#effects.stop();
  }
  readonly subscribe = (listener: () => void): (() => void) => {
    const effects = this.#effects.subscribe(listener);
    const music = this.#music.subscribe(listener);
    return () => {
      effects();
      music();
    };
  };
  observation() {
    return Object.freeze({ ...this.#effects.observation(), music: this.#music.observation() });
  }
}
