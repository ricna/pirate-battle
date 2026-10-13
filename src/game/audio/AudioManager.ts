
import type { GameEvent } from "../runtime/GameManager";
import type { Options } from "../configuration/GameConfiguration";
const files = import.meta.glob("../../../assets/sounds/*.wav", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;


import { AudioConfig } from "../configuration/AudioConfig";
export class AudioManager {
  #context: AudioContext | null = null;
  #gain: GainNode | null = null;
  #buffers = new Map<string, AudioBuffer>();
  #loading: Promise<void> | null = null;
  #voices = new Map<
    AudioBufferSourceNode,
    { gain: GainNode; priority: number }
  >();
  #loops = new Map<string, AudioBufferSourceNode>();
  readonly #played = new Map<string, number>();
  #peakVoices = 0;
  #lastPlayed = new Map<string, number>();
  #lastVariant = new Map<string, string>();
  #enabled = true;
  #error: string | null = null;
  get error(): string | null {
    return this.#error;
  }
  configure(options: Options) {
    this.#enabled = options.sound;
    if (this.#gain) this.#gain.gain.value = options.sound ? options.volume : 0;
  }
  unlock(options: Options) {
    try {
      this.#context ??= new AudioContext();
      if (!this.#gain) {
        this.#gain = this.#context.createGain();
        this.#gain.connect(this.#context.destination);
      }
      this.configure(options);
      void this.#context.resume().catch(() => {
        this.#error = "Audio could not be enabled.";
      });
      if (!this.#loading)
        this.#loading = this.#load().catch(() => {
          this.#error =
            "Some sound assets could not be loaded. Check your connection.";
          this.#loading = null;
        });
    } catch {
      this.#error = "Audio is unavailable in this browser.";
    }
  }
  
  async #load() {
    await Promise.all(
      AudioConfig.requiredSounds().map(async (name) => {
        const url = files[`../../assets/sounds/${name}.wav`];
        if (!url)
          throw new Error(`Required authored sound ${name} is missing.`);
        const response = await fetch(url);
        if (!response.ok) throw new Error("Sound asset unavailable.");
        const buffer = await this.#context!.decodeAudioData(
          await response.arrayBuffer(),
        );
        this.#buffers.set(name, buffer);
      }),
    );
  }

  #choose(names: readonly string[], group: string, cooldown: number): string {
    const now = this.#context?.currentTime ?? 0;
    const available = names.filter(
      (name) =>
        this.#buffers.has(name) &&
        now - (this.#lastPlayed.get(name) ?? -Infinity) >= cooldown,
    );
    if (!available.length) return "";
    const previous = this.#lastVariant.get(group);
    const choices = available.filter((name) => name !== previous);
    const selected =
      choices[Math.floor(Math.random() * choices.length)] ?? available[0]!;
    this.#lastVariant.set(group, selected);
    return selected;
  }
  #play(
    name: string,
    loop: boolean,
    pitchRange: Readonly<{ minimum: number; maximum: number }> | null,
    cooldown: number,
    priority: number,
  ): boolean {
    if (
      !this.#enabled ||
      !this.#context ||
      !this.#gain ||
      (loop && this.#loops.has(name))
    )
      return false;
    const buffer = this.#buffers.get(name);
    if (!buffer) return false;
    const now = this.#context.currentTime;
    const last = this.#lastPlayed.get(name) ?? -Infinity;
    if (now - last < cooldown) return false;
    if (this.#voices.size >= AudioConfig.MaxVoices) {
      const oldest = [...this.#voices.entries()].sort(
        (a, b) => a[1].priority - b[1].priority,
      )[0];
      if (!oldest || oldest[1].priority >= priority) return false;
      oldest[0].stop();
      this.#voices.delete(oldest[0]);
      for (const [key, source] of this.#loops)
        if (source === oldest[0]) this.#loops.delete(key);
    }
    this.#lastPlayed.set(name, now);
    const source = this.#context.createBufferSource();
    source.buffer = buffer;
    source.loop = loop;
    if (pitchRange && !loop)
      source.playbackRate.value =
        pitchRange.minimum +
        Math.random() * (pitchRange.maximum - pitchRange.minimum);
    const volume = this.#context.createGain();
    volume.gain.value = loop ? AudioConfig.LoopGain : AudioConfig.EffectGain;
    source.connect(volume);
    volume.connect(this.#gain);
    this.#voices.set(source, { gain: volume, priority });
    this.#peakVoices = Math.max(this.#peakVoices, this.#voices.size);
    this.#played.set(name, (this.#played.get(name) ?? 0) + 1);
    source.onended = () => {
      source.disconnect();
      volume.disconnect();
      this.#voices.delete(source);
    };
    if (loop) this.#loops.set(name, source);
    source.start();
    return true;
  }
  play(name: string, loop = false) {
    const terminal =
      name === AudioConfig.Cues.Complete || name === AudioConfig.Cues.GameOver;
    this.#play(
      name,
      loop,
      loop ? null : AudioConfig.CuePitchVariation,
      AudioConfig.UiCooldown,
      loop
        ? AudioConfig.Priorities.ambient
        : terminal
          ? AudioConfig.Priorities.terminal
          : AudioConfig.Priorities.ui,
    );
  }
  playUi(name: string, group: string = name) {
    const now = this.#context?.currentTime ?? 0;
    const last = this.#lastPlayed.get(group) ?? -Infinity;
    if (now - last < AudioConfig.UiCooldown) return;
    this.#lastPlayed.set(group, now);
    this.#play(
      name,
      false,
      AudioConfig.CuePitchVariation,
      0,
      AudioConfig.Priorities.ui,
    );
  }
  playVariant(
    names: readonly string[],
    group: string,
    pitch = true,
    priority: number = AudioConfig.Priorities.impact,
  ) {
    const selected = this.#choose(names, group, AudioConfig.EventCooldown);
    if (!selected) return;
    this.#play(
      selected,
      false,
      pitch ? AudioConfig.PitchVariation : null,
      AudioConfig.EventCooldown,
      priority,
    );
  }
  events(events: GameEvent[]) {
    for (const event of events) {
      const names = AudioConfig.EventSounds[event];
      this.playVariant(names, event, true, AudioConfig.EventPriorities[event]);
    }
  }
  ambience(playing: boolean, speedRatio: number) {
    for (const [name, active] of [
      [AudioConfig.Ocean, playing],
      [
        AudioConfig.Sailing,
        playing && speedRatio > AudioConfig.SailingThreshold,
      ],
    ] as const) {
      if (active) this.play(name, true);
      else {
        this.#loops.get(name)?.stop();
        this.#loops.delete(name);
      }
      const source = this.#loops.get(name);
      const voice = source ? this.#voices.get(source) : undefined;
      if (voice)
        voice.gain.gain.value =
          AudioConfig.LoopGain *
          (name === AudioConfig.Sailing
            ? Math.sqrt(Math.max(0, Math.min(1, speedRatio)))
            : 1);
    }
  }
  stopLoops(): void {
    for (const source of this.#loops.values()) source.stop();
    this.#loops.clear();
  }
  observation() {
    return Object.freeze({
      activeVoices: this.#voices.size,
      peakVoices: this.#peakVoices,
      loops: Object.freeze([...this.#loops.keys()]),
      decoded: this.#buffers.size,
      played: Object.freeze(Object.fromEntries(this.#played)),
    });
  }
  stop() {
    for (const voice of this.#voices.keys()) {
      try {
        voice.stop();
      } catch {
        /* Already ended. */
      }
    }
    this.#loops.clear();
    this.#lastPlayed.clear();
  }
}
export const audio = new AudioManager();
