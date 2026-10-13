import { freezeStaticConfiguration } from '../core/Immutable';
import { EnemyChaser } from '../entities/EnemyChaser';
import { EnemyShooter } from '../entities/EnemyShooter';
import type { EnemyRegistration } from '../factories/ShipFactory';
import { EnemyChaserConfig } from './EnemyChaserConfig';
import { EnemyShooterConfig } from './EnemyShooterConfig';

/** Composition root: register another profile + subclass here, without editing GameManager or renderer. */
export class FactoryConfig {
  private constructor() {}
  static readonly Enemies: readonly EnemyRegistration[] = [
    { profile: EnemyChaserConfig.Default, constructor: EnemyChaser },
    { profile: EnemyShooterConfig.Default, constructor: EnemyShooter },
  ];
}
freezeStaticConfiguration(FactoryConfig);
