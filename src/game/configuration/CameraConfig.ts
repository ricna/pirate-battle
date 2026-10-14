import { freezeStaticConfiguration } from '../core/Immutable';

/** Display-only tuning in CSS pixels; never changes the authored map or match balance. */
export class CameraConfig {
  private constructor() {}

  static readonly CompactWidth = 1024;
  static readonly CompactHeight = 600;
  static readonly VisibleAreaFraction = 0.25;
  static readonly MinimumScale = 0.75;
}

freezeStaticConfiguration(CameraConfig);
