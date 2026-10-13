import { freezeStaticConfiguration } from '../core/Immutable';
import { GameEvent } from '../contracts/GameDomain';

export class AudioConfig {
  private constructor() {}
  static readonly MaxVoices = 16;
  static readonly LoopGain = 0.3;
  static readonly EffectGain = 0.55;
  static readonly Cues = {
    Click: 'ui_click',
    Hover: 'ui_hover',
    Open: 'ui_open',
    Close: 'ui_close',
    Back: 'ui_back',
    Pause: 'game_pause',
    Resume: 'game_resume',
    Complete: 'game_complete',
    GameOver: 'game_over',
    Start: 'game_start',
  } as const;
  static readonly EventSounds: Readonly<Record<GameEvent, readonly string[]>> = {
    [GameEvent.FrontShot]: ['cannon_fire_1', 'cannon_fire_3'],
    [GameEvent.SideShot]: ['cannon_broadside', 'cannon_fire_3'],
    [GameEvent.EnemyShot]: ['cannon_fire_2', 'cannon_fire_3'],
    [GameEvent.Impact]: ['ship_wood_hit_1', 'ship_wood_hit_2'],
    [GameEvent.Explosion]: ['ship_explosion_1', 'ship_explosion_2'],
    [GameEvent.Sinking]: ['ship_sinking'],
    [GameEvent.CoastImpact]: ['ship_collision'],
    [GameEvent.Score]: ['score_point'],
    [GameEvent.LowHealth]: ['health_low'],
    [GameEvent.TimeWarning]: ['time_warning'],
    [GameEvent.WaterImpact]: ['cannonball_water_hit_1', 'cannonball_water_hit_2'],
    [GameEvent.ShipCollision]: ['ship_collision'],
  };
  static readonly PitchVariation = { minimum: 0.94, maximum: 1.06 } as const;
  static readonly CuePitchVariation = { minimum: 0.99, maximum: 1.01 } as const;
  static readonly EventCooldown = 0.045;
  static readonly UiCooldown = 0.06;
  static readonly Priorities = { ambient: 0, ui: 1, weapon: 2, impact: 3, warning: 4, sinking: 5, terminal: 6 };
  static readonly EventPriorities: Readonly<Record<GameEvent, number>> = {
    [GameEvent.FrontShot]: AudioConfig.Priorities.weapon,
    [GameEvent.SideShot]: AudioConfig.Priorities.weapon,
    [GameEvent.EnemyShot]: AudioConfig.Priorities.weapon,
    [GameEvent.Impact]: AudioConfig.Priorities.impact,
    [GameEvent.Explosion]: AudioConfig.Priorities.sinking,
    [GameEvent.Sinking]: AudioConfig.Priorities.sinking,
    [GameEvent.Score]: AudioConfig.Priorities.warning,
    [GameEvent.LowHealth]: AudioConfig.Priorities.warning,
    [GameEvent.TimeWarning]: AudioConfig.Priorities.warning,
    [GameEvent.WaterImpact]: AudioConfig.Priorities.impact,
    [GameEvent.ShipCollision]: AudioConfig.Priorities.impact,
    [GameEvent.CoastImpact]: AudioConfig.Priorities.impact,
  };
  static readonly SailingThreshold = 0.02;
  static readonly Ocean = 'ocean_ambience_loop';
  static readonly Sailing = 'ship_sailing_loop';
  static readonly Music = {
    id:'pirate-adventure',
    gain:0.2,
  } as const; 


  static requiredSounds(): readonly string[] {
    const cues = Object.values(AudioConfig.Cues);
    const eventSounds = Object.values(AudioConfig.EventSounds).flat();
    return Object.freeze([...new Set([...cues, ...eventSounds, AudioConfig.Ocean, AudioConfig.Sailing])]);
  }
}
freezeStaticConfiguration(AudioConfig);
