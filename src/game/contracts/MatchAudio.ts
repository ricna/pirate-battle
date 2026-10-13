import type { AudioManager } from '../audio/AudioManager';

/** Match lifecycle can command combat audio, but cannot detach or restart application music. */
export type IMatchAudio = Pick<
  AudioManager,
  | 'play'
  | 'events'
  | 'ambience'
  | 'stopMatchLoops'
  | 'stopMatchSounds'
  | 'setDeathMusicDucked'
  | 'observation'
>;
