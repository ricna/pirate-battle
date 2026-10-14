/** Application display bindings and browser requests, independent of combat input and match configuration. */
export class DisplayConfig {
  private constructor() {}

  /** Alt plus either Enter key switches between required full screen and the player's windowed choice. */
  static readonly FullscreenKeys: readonly string[] = Object.freeze(['Enter', 'NumpadEnter']);
  /** Keys requested through Keyboard Lock in full screen, so a short Esc reaches the game's pause. */
  static readonly CapturedKeys: readonly string[] = Object.freeze(['Escape']);
  /** Browsers reserve this key for leaving full screen, so it never re-enters it automatically. */
  static readonly ExitKey = 'Escape';
  /** Screen Orientation lock requested after entering full screen; mainly Android browsers grant it. */
  static readonly LockedOrientation: OrientationLockType = 'landscape';
}

Object.freeze(DisplayConfig);
