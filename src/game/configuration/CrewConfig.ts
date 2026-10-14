import { freezeStaticConfiguration } from '../core/Immutable';

export interface CrewProfile {
  /** Circular rescue trigger in logical world pixels; it never blocks ships. */
  readonly radius: number;
  readonly healthPerRescue: number;
  readonly seedSalt: number;
}

export class CrewConfig {
  private constructor() {}
  static readonly Default: CrewProfile = {
    radius: 14,
    healthPerRescue: 1,
    seedSalt: 0x43726577,
  };
}

freezeStaticConfiguration(CrewConfig);
