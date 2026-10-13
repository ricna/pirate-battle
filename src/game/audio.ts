import type { GameEvent } from './simulation';
import type { Options } from './config';
const files = import.meta.glob('../../assets/sounds/*.wav', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
import { AudioConfig } from './configuration/AudioConfig';
export class GameAudio {
  #context: AudioContext | null = null; #gain: GainNode | null = null;
  #buffers = new Map<string, AudioBuffer>(); #loading: Promise<void> | null = null;
  #voices = new Set<AudioBufferSourceNode>(); #loops = new Map<string, AudioBufferSourceNode>();
  #enabled = true;
  #error: string | null = null;
  get error(): string | null { return this.#error; }
  configure(options: Options) { this.#enabled = options.sound; if (this.#gain) this.#gain.gain.value = options.sound ? options.volume : 0; }
  unlock(options: Options) {
    try {
      this.#context ??= new AudioContext();
      if (!this.#gain) { this.#gain = this.#context.createGain(); this.#gain.connect(this.#context.destination); }
      this.configure(options); void this.#context.resume().catch(() => { this.#error = 'Audio could not be enabled.'; });
      if (!this.#loading) this.#loading = this.#load().catch(() => { this.#error = 'Some sound assets could not be loaded. Check your connection.'; this.#loading = null; });
    } catch { this.#error = 'Audio is unavailable in this browser.'; }
  }
  async #load() {
    await Promise.all(Object.entries(files).map(async ([path, url]) => {
      const response = await fetch(url); if (!response.ok) throw new Error('Sound asset unavailable.');
      const buffer = await this.#context!.decodeAudioData(await response.arrayBuffer());
      this.#buffers.set(path.split('/').at(-1)!.replace('.wav', ''), buffer);
    }));
  }
  play(name: string, loop = false) {
    if (!this.#enabled || !this.#context || !this.#gain || this.#voices.size >= AudioConfig.MaxVoices || (loop && this.#loops.has(name))) return;
    const buffer = this.#buffers.get(name); if (!buffer) return;
    const source = this.#context.createBufferSource(); source.buffer = buffer; source.loop = loop;
    const volume = this.#context.createGain(); volume.gain.value = loop ? AudioConfig.LoopGain : AudioConfig.EffectGain;
    source.connect(volume); volume.connect(this.#gain); this.#voices.add(source);
    source.onended = () => { source.disconnect(); volume.disconnect(); this.#voices.delete(source); };
    if (loop) this.#loops.set(name, source); source.start();
  }
  events(events: GameEvent[]) { for (const event of new Set(events)) this.play(AudioConfig.EventSounds[event]); }
  ambience(playing: boolean, sailing: boolean) {
    for (const [name, active] of [[AudioConfig.Ocean, playing], [AudioConfig.Sailing, playing && sailing]] as const) {
      if (active) this.play(name, true);
      else { this.#loops.get(name)?.stop(); this.#loops.delete(name); }
    }
  }
  stop() { for (const voice of this.#voices) { try { voice.stop(); } catch { /* Already ended. */ } } this.#loops.clear(); }
}
export const audio = new GameAudio();
