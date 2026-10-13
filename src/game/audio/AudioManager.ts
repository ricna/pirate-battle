import type { Options } from '../../application/configuration/Options';
import type { GameEvent } from '../contracts/GameDomain';
import type { MusicPlayer } from './MusicPlayer';
import type { SoundEffectPlayer } from './SoundEffectPlayer';
import { AudioConfig } from '../configuration/AudioConfig';

/** Application audio coordinator; death can temporarily duck the persistent OST without restarting it. */
export class AudioManager {
  readonly #effects: SoundEffectPlayer;
  readonly #music: MusicPlayer;
  #options: Options;
  #deathMixRevision = 0;
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
    if (name !== AudioConfig.Cues.GameOver) {
      this.#effects.play(name, loop);
      return;
    }
    const revision = this.#deathMixRevision;
    const restore = () => {
      if (revision === this.#deathMixRevision) this.setDeathMusicDucked(false);
    };
    if (!this.#effects.play(name, loop, restore)) restore();
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
  setDeathMusicDucked(ducked: boolean): void {
    this.#deathMixRevision++;
    this.#music.setMixGain(ducked ? AudioConfig.DeathMusicGain : 1);
  }
  stopMatchSounds(): void {
    this.#effects.stop();
    this.setDeathMusicDucked(false);
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
