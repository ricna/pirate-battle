import { Action } from '../contracts/GameDomain';

import { InputConfig } from '../configuration/InputConfig';
import { angleDifference } from '../math/Geometry';

export class InputController {
  #sources = new Map<string, Action>();
  #steering = new Map<string, number>();
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

  steer(source: string, angle: number | null) {
    if (!this.#active) return;
    if (angle === null) this.#steering.delete(source);
    else this.#steering.set(source, angle);
  }

  release(source: string) {
    this.#sources.delete(source);
    this.#steering.delete(source);
  }
  readonly clear = () => {
    this.#sources.clear();
    this.#steering.clear();
  };
  setActive(active: boolean) {
    this.#active = active;
    this.clear();
  }
  read(playerAngle: number): ReadonlySet<Action> {
    const actions = new Set(this.#sources.values());
    let desiredAngle: number | undefined;
    for (const angle of this.#steering.values()) desiredAngle = angle;
    if (desiredAngle !== undefined) {
      const difference = angleDifference(desiredAngle, playerAngle);
      if (difference < -InputConfig.SteeringToleranceRadians) actions.add(Action.Left);
      if (difference > InputConfig.SteeringToleranceRadians) actions.add(Action.Right);
    }
    return actions;
  }

  destroy() {
    this.clear();
    this.#target.removeEventListener('keydown', this.#keyDown);
    this.#target.removeEventListener('keyup', this.#keyUp);
    this.#target.removeEventListener('blur', this.clear);
  }
}
