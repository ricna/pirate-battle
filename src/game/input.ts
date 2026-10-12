import type { Action } from './simulation';

const KEY_ACTIONS: Record<string, Action> = {
  KeyW: 'forward', ArrowUp: 'forward',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
};

export class InputController {
  private sources = new Map<string, Action>();
  private active = true;
  private target: HTMLElement;
  private onPause: () => void;

  constructor(target: HTMLElement, onPause: () => void) {
    this.target = target;
    this.onPause = onPause;
    target.addEventListener('keydown', this.keyDown);
    target.addEventListener('keyup', this.keyUp);
    target.addEventListener('blur', this.clear);
  }

  private keyDown = (event: KeyboardEvent) => {
    if (!this.active) return;
    if (event.code === 'Escape' || event.code === 'KeyP') {
      event.preventDefault();
      if (!event.repeat) this.onPause();
      return;
    }
    const action = KEY_ACTIONS[event.code];
    if (action) {
      event.preventDefault();
      this.sources.set(event.code, action);
    }
  };

  private keyUp = (event: KeyboardEvent) => {
    if (KEY_ACTIONS[event.code] && this.active) event.preventDefault();
    this.sources.delete(event.code);
  };

  press(source: string, action: Action) {
    if (this.active) this.sources.set(source, action);
  }

  release(source: string) { this.sources.delete(source); }
  clear = () => { this.sources.clear(); };
  setActive(active: boolean) { this.active = active; this.clear(); }
  read(): ReadonlySet<Action> { return new Set(this.sources.values()); }

  destroy() {
    this.clear();
    this.target.removeEventListener('keydown', this.keyDown);
    this.target.removeEventListener('keyup', this.keyUp);
    this.target.removeEventListener('blur', this.clear);
  }
}
