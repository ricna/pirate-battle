/** Application display bindings, independent of combat input and match configuration. */
export class DisplayInputConfig {
  private constructor() {}

  static readonly FullscreenKeys: readonly string[] = Object.freeze(['Enter', 'NumpadEnter']);
  static readonly CapturedKeys: readonly string[] = Object.freeze(['Escape']);
}

Object.freeze(DisplayInputConfig);
