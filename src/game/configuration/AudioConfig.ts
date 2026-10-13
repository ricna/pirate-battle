import { freezeStaticConfiguration } from '../core/Immutable';
import { GameEvent } from '../domain';

export class AudioConfig {
  private constructor() {}
  static readonly MaxVoices = 16;
  static readonly LoopGain = 0.3;
  static readonly EffectGain = 0.55;
  static readonly Cues = { Click: 'ui_click', Back: 'ui_back', Pause: 'game_pause', Resume: 'game_resume',
    Complete: 'game_complete', GameOver: 'game_over', Start: 'game_start' } as const;
  static readonly EventSounds: Readonly<Record<GameEvent, string>> = {
    [GameEvent.FrontShot]: 'cannon_fire_1', [GameEvent.SideShot]: 'cannon_broadside',
    [GameEvent.EnemyShot]: 'cannon_fire_2', [GameEvent.Impact]: 'ship_wood_hit_1', [GameEvent.Explosion]: 'ship_explosion_1',
    [GameEvent.Score]: 'score_point', [GameEvent.LowHealth]: 'health_low', [GameEvent.TimeWarning]: 'time_warning',
  };
  static readonly Ocean = 'ocean_ambience_loop';
  static readonly Sailing = 'ship_sailing_loop';
}
freezeStaticConfiguration(AudioConfig);
