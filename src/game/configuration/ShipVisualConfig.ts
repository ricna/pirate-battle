import { freezeStaticConfiguration } from '../core/Immutable';
import type { ShipVisualProfile } from './types';

export class ShipVisualConfig {
  
  private constructor() {}
  
  static readonly Player: ShipVisualProfile = {
    
    wreckSprite: 'ships/ship_19',
    
    width: 67, height: 113, angleOffset: Math.PI,
    
    damageStages: [
      { minimumHealthRatio: 0.65, sprite: 'ships/ship_1' },
      { minimumHealthRatio: 0.3, sprite: 'ships/ship_7' }, 
      { minimumHealthRatio: 0, sprite: 'ships/ship_13' }
    ],

    healthFrame: 'ui/hud/health_frame', healthMetadata: 'health_frame', healthScale: 0.4, healthOffsetY: -82,
    
    healthFills: 
    [
          { minimumHealthRatio: 0.65, sprite: 'ui/hud/health_fill_green' }, 
          { minimumHealthRatio: 0.3, sprite: 'ui/hud/health_fill_amber' }, 
          { minimumHealthRatio: 0, sprite: 'ui/hud/health_fill_red' }
    ],
    fireThreshold: 0.3, fireSprites: ['effects/fire_1', 'effects/fire_2'], fireWidth: 25, fireHeight: 40, fireFramesPerSecond: 8,
  };
  
  static readonly Chaser: ShipVisualProfile = { ...ShipVisualConfig.Player,
    wreckSprite: 'ships/ship_20',
    damageStages: [{ minimumHealthRatio: 0.65, sprite: 'ships/ship_2' },
      { minimumHealthRatio: 0.3, sprite: 'ships/ship_8' }, { minimumHealthRatio: 0, sprite: 'ships/ship_14' }],
    healthFrame: 'ui/hud/enemy_health_frame', healthMetadata: 'enemy_health_frame', healthScale: 0.6,
    healthFills: [{ minimumHealthRatio: 0.3, sprite: 'ui/hud/enemy_health_fill_green' },
      { minimumHealthRatio: 0, sprite: 'ui/hud/enemy_health_fill_red' }],
  };
  
  static readonly Shooter: ShipVisualProfile = { ...ShipVisualConfig.Chaser,
    wreckSprite: 'ships/ship_21',
    damageStages: [{ minimumHealthRatio: 0.65, sprite: 'ships/ship_3' },
      { minimumHealthRatio: 0.3, sprite: 'ships/ship_9' }, { minimumHealthRatio: 0, sprite: 'ships/ship_15' }],
  };

}

freezeStaticConfiguration(ShipVisualConfig);
