import type { Action } from '../runtime/GameManager';

import { InputConfig } from '../configuration/InputConfig';

export class InputController {
  #sources = new Map<string, Action>();
  #active = true;
  #target: HTMLElement;
  #onPause: () => void;

  constructor(target: HTMLElement, onPause: () => void) {
    this.#target = target;
    this.#onPause = onPause;
    target.addEventListener('keydown', this.#keyDown);
    target.addEventListener('keyup', this.#keyUp);
    target.addEventListener('blur', this.clear);
  }

  #keyDown = (event: KeyboardEvent) => {
    if (!this.#active) return;
    if (event.target instanceof HTMLElement && event.target.closest(InputConfig.IgnoreSelector)) return;
    if (InputConfig.PauseKeys.includes(event.code)) {
      event.preventDefault();
      if (!event.repeat) this.#onPause();
      return;
    }
    const action = InputConfig.Keys[event.code];
    if (action) {
      event.preventDefault();
      this.#sources.set(event.code, action);
    }
  };

  #keyUp = (event: KeyboardEvent) => {
    if (InputConfig.Keys[event.code] && this.#active) event.preventDefault();
    this.#sources.delete(event.code);
  };

  press(source: string, action: Action) {
    if (this.#active) this.#sources.set(source, action);
  }

  release(source: string) {
    this.#sources.delete(source);
  }
  readonly clear = () => {
    this.#sources.clear();
  };
  setActive(active: boolean) {
    this.#active = active;
    this.clear();
  }
  read(): ReadonlySet<Action> {
    return new Set(this.#sources.values());
  }

  destroy() {
    this.clear();
    this.#target.removeEventListener('keydown', this.#keyDown);
    this.#target.removeEventListener('keyup', this.#keyUp);
    this.#target.removeEventListener('blur', this.clear);
  }
}
