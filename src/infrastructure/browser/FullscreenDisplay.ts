import { DisplayInputConfig } from './DisplayInputConfig';

/** Experimental API absent from TypeScript's DOM library; validate its callable surface at the boundary. */
interface KeyboardCapture {
  lock(keys: string[]): Promise<void>;
  unlock(): void;
}

function supportsKeyboardCapture(value: unknown): value is KeyboardCapture {
  return (
    typeof value === 'object' &&
    value !== null &&
    'lock' in value &&
    typeof value.lock === 'function' &&
    'unlock' in value &&
    typeof value.unlock === 'function'
  );
}

/** Browser capability adapter. Fullscreen comes from an explicit button or Alt+Enter gesture. */
export class FullscreenDisplay {
  readonly #document: Document;
  readonly #keyboard: KeyboardCapture | null;
  readonly #shortcuts = new Set<() => void>();
  #attached = false;
  #changing = false;

  constructor(document: Document) {
    this.#document = document;
    const navigator = document.defaultView?.navigator;
    const keyboard = navigator && 'keyboard' in navigator ? navigator.keyboard : undefined;
    this.#keyboard = supportsKeyboardCapture(keyboard) ? keyboard : null;
  }

  readonly isActive = (): boolean => Boolean(this.#document.fullscreenElement);

  get supported(): boolean {
    return (
      this.#document.fullscreenEnabled === true &&
      typeof this.#document.documentElement.requestFullscreen === 'function'
    );
  }

  readonly subscribe = (notify: () => void): (() => void) => {
    this.#document.addEventListener('fullscreenchange', notify);
    return () => this.#document.removeEventListener('fullscreenchange', notify);
  };

  /** ServicesProvider owns these application-wide listeners, including lazy module preparation. */
  attach(): () => void {
    if (this.#attached) throw new Error('The browser display is already attached.');
    this.#attached = true;
    this.#document.addEventListener('keydown', this.#keyDown, true);
    this.#document.addEventListener('fullscreenchange', this.#fullscreenChanged);
    return () => {
      this.#attached = false;
      this.#document.removeEventListener('keydown', this.#keyDown, true);
      this.#document.removeEventListener('fullscreenchange', this.#fullscreenChanged);
      this.#keyboard?.unlock();
    };
  }

  /** Reuse the mounted control's pause/error handling; the latest screen owns the shortcut. */
  bindShortcut(request: () => void): () => void {
    this.#shortcuts.add(request);
    return () => {
      this.#shortcuts.delete(request);
    };
  }

  readonly #keyDown = (event: KeyboardEvent): void => {
    if (
      !event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.isComposing ||
      !DisplayInputConfig.FullscreenKeys.includes(event.code)
    )
      return;
    const request = [...this.#shortcuts].at(-1);
    if (!request) return;
    event.preventDefault();
    event.stopPropagation();
    if (!event.repeat) request();
  };

  readonly #fullscreenChanged = (): void => {
    if (!this.isActive()) this.#keyboard?.unlock();
  };

  async #captureEscape(): Promise<void> {
    const keyboard = this.#keyboard;
    if (!keyboard || !this.#attached || !this.isActive()) return;
    try {
      await keyboard.lock([...DisplayInputConfig.CapturedKeys]);
      // An external exit or application teardown may occur while the browser grants the request.
      if (!this.#attached || !this.isActive()) keyboard.unlock();
    } catch {
      // Optional capture may be unsupported or denied; fullscreen keeps the browser's normal Esc exit.
    }
  }

  async toggle(): Promise<void> {
    if (this.#changing) return;
    this.#changing = true;
    try {
      if (this.isActive()) {
        this.#keyboard?.unlock();
        await this.#document.exitFullscreen();
      } else {
        if (!this.supported) throw new Error('This browser does not support page fullscreen.');
        // Keep menus, dialogs and subsequent battles in the same fullscreen session.
        await this.#document.documentElement.requestFullscreen({ navigationUI: 'hide' });
        // Optional permission must not delay the user's fullscreen exit command.
        void this.#captureEscape();
      }
    } finally {
      this.#changing = false;
    }
  }
}
