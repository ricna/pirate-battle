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
  static readonly Controls = [
    { action: Action.Left, label: 'Turn left', icon: 'turn_left' },
    { action: Action.Forward, label: 'Forward', icon: 'forward' },
    { action: Action.Right, label: 'Turn right', icon: 'turn_right' },
    { action: Action.Port, label: 'Left broadside', icon: 'fire_left' },
    { action: Action.Front, label: 'Front cannon', icon: 'fire_front' },
    { action: Action.Starboard, label: 'Right broadside', icon: 'fire_right' },
  ] as const;
}
freezeStaticConfiguration(InputConfig);
