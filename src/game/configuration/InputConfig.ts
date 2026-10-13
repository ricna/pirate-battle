import { freezeStaticConfiguration } from '../core/Immutable';
import { Action } from '../domain';

export class InputConfig {
  private constructor() {}
  static readonly Keys: Readonly<Record<string, Action>> = Object.freeze({
    KeyW: Action.Forward, ArrowUp: Action.Forward, KeyA: Action.Left, ArrowLeft: Action.Left,
    KeyD: Action.Right, ArrowRight: Action.Right, Space: Action.Front, KeyQ: Action.Port, KeyE: Action.Starboard,
  });
  static readonly PauseKeys: readonly string[] = ['Escape', 'KeyP'];
  static readonly IgnoreSelector = 'input,select,textarea,button';
  /** Touch buttons in on-screen order. `cluster` selects the bottom-left (movement) or bottom-right (weapons) group of sample.png. */
  static readonly Controls = [
    { action: Action.Left, label: 'Turn left', icon: 'turn_left', cluster: 'movement' },
    { action: Action.Forward, label: 'Forward', icon: 'forward', cluster: 'movement' },
    { action: Action.Right, label: 'Turn right', icon: 'turn_right', cluster: 'movement' },
    { action: Action.Port, label: 'Left broadside', icon: 'fire_left', cluster: 'weapons' },
    { action: Action.Front, label: 'Front cannon', icon: 'fire_front', cluster: 'weapons' },
    { action: Action.Starboard, label: 'Right broadside', icon: 'fire_right', cluster: 'weapons' },
  ] as const;
}
freezeStaticConfiguration(InputConfig);
