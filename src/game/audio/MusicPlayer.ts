import type { Options } from '../../application/configuration/Options';

export interface MusicProfile {
  readonly id: string;
  readonly url: string;
  readonly gain: number;
}

/** One streamed authored track, independent of match effects and the bounded voice budget. */
export class MusicPlayer {
  readonly #profile: MusicProfile;
  #element: HTMLAudioElement | null = null;
  #unlocked = false;
  #enabled = false;
  #volume = 0;
  #mixGain = 1;
  #pending = false;
  #revision = 0;
  #error: string | null = null;
  readonly #listeners = new Set<() => void>();
  readonly subscribe = (listener: () => void): (() => void) => {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  };
  #setError(error: string | null): void {
    if (this.#error === error) return;
    this.#error = error;
    for (const listener of this.#listeners) listener();
  }

  constructor(profile: MusicProfile) {
    if (
      !profile.id ||
      !profile.url ||
      !Number.isFinite(profile.gain) ||
      profile.gain < 0 ||
      profile.gain > 1
    ) {
      throw new Error('Music requires an authored URL, identity and gain in [0, 1].');
    }
    this.#profile = Object.freeze({ ...profile });
  }

  get profile(): MusicProfile {
    return this.#profile;
  }
  get error(): string | null {
    return this.#error;
  }

  attach(element: HTMLAudioElement): void {
    if (this.#element && this.#element !== element)
      throw new Error('Music already owns its authored audio element.');
    this.#element = element;
    element.addEventListener('error', this.#loadFailed);
    this.#synchronize();
  }

  detach(element: HTMLAudioElement): void {
    if (this.#element !== element) return;
    this.#revision++;
    this.#pending = false;
    element.removeEventListener('error', this.#loadFailed);
    element.pause();
    this.#element = null;
  }

  configure(options: Options): void {
    this.#enabled = options.sound;
    this.#volume = options.volume * options.musicVolume * this.#profile.gain;
    this.#synchronize();
  }

  unlock(): void {
    this.#unlocked = true;
    this.#synchronize();
  }

  setMixGain(gain: number): void {
    if (!Number.isFinite(gain) || gain < 0 || gain > 1) throw new Error('Music mix gain must be in [0, 1].');
    this.#mixGain = gain;
    this.#synchronize();
  }

  readonly #loadFailed = (): void => {
    this.#setError('The soundtrack could not be loaded. Check the authored MP3 and your connection.');
  };

  #synchronize(): void {
    const element = this.#element;
    if (!element) return;
    element.volume = this.#volume * this.#mixGain;
    element.muted = !this.#enabled;
    if (!this.#enabled || !this.#unlocked || this.#volume === 0) {
      element.pause();
      return;
    }
    if (!element.paused || this.#pending) return;
    if (element.error) element.load();
    this.#pending = true;
    const revision = this.#revision;
    void element
      .play()
      .then(() => {
        if (revision !== this.#revision) return;
        this.#pending = false;
        this.#setError(null);
        if (!this.#enabled || this.#volume === 0) element.pause();
      })
      .catch((error: unknown) => {
        if (revision !== this.#revision) return;
        this.#pending = false;
        if (error instanceof DOMException && error.name === 'AbortError') {
          if (this.#enabled && this.#volume > 0) this.#synchronize();
          return;
        }
        this.#setError('The soundtrack could not start. Click or press a key to retry audio.');
      });
  }

  observation() {
    return Object.freeze({
      id: this.#profile.id,
      playing: !!this.#element && !this.#element.paused,
      time: this.#element?.currentTime ?? 0,
      volume: this.#volume * this.#mixGain,
      mixGain: this.#mixGain,
      unlocked: this.#unlocked,
    });
  }
}
