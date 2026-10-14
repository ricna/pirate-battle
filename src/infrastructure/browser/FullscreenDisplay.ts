import { DisplayConfig } from './DisplayConfig';

/** Keyboard Lock is experimental and absent from TypeScript's DOM library. */
interface KeyboardCapture {
  lock(keys: string[]): Promise<void>;
  unlock(): void;
}

/** Older Safari releases expose `screen.orientation` without its lock methods. */
interface OrientationCapture {
  lock(orientation: OrientationLockType): Promise<void>;
  unlock(): void;
}

/** Both optional capture APIs share this callable surface; validate it at the browser boundary. */
function exposesLockMethods(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    'lock' in value &&
    typeof value.lock === 'function' &&
    'unlock' in value &&
    typeof value.unlock === 'function'
  );
}

function supportsKeyboardCapture(value: unknown): value is KeyboardCapture {
  return exposesLockMethods(value);
}

function supportsOrientationCapture(value: unknown): value is OrientationCapture {
  return exposesLockMethods(value);
}

/** Guidance for a display request the browser did not complete. */
export type DisplayNotice = 'unsupported' | 'failed' | 'quitBlocked';

/**
 * Browser display adapter. Full screen is required: browsers only grant it during a user gesture, so the
 * first pointer or key gesture enters it, and the next gesture after a browser exit (long Esc, Android back)
 * returns to it. Alt+Enter is the player's explicit windowed choice until the next Alt+Enter. Quit leaves
 * full screen and closes the tab when the browser allows a page to close it.
 */
export class FullscreenDisplay {
  readonly #document: Document;
  readonly #keyboard: KeyboardCapture | null;
  readonly #orientation: OrientationCapture | null;
  readonly #listeners = new Set<() => void>();
  readonly #beforeToggle = new Set<() => void>();
  #attached = false;
  /** The browser request in progress; requests never overlap. */
  #change: Promise<void> | null = null;
  #orientationLocked = false;
  /** Cleared by Alt+Enter, Quit or a failed request, so gestures stop re-entering until the player asks. */
  #required = true;
  #notice: DisplayNotice | null = null;

  constructor(document: Document) {
    this.#document = document;
    const view = document.defaultView;
    const keyboard = view && 'keyboard' in view.navigator ? view.navigator.keyboard : undefined;
    this.#keyboard = supportsKeyboardCapture(keyboard) ? keyboard : null;
    const orientation: unknown = view?.screen.orientation;
    this.#orientation = supportsOrientationCapture(orientation) ? orientation : null;
  }

  get active(): boolean {
    return Boolean(this.#document.fullscreenElement);
  }

  get supported(): boolean {
    return (
      this.#document.fullscreenEnabled === true &&
      typeof this.#document.documentElement.requestFullscreen === 'function'
    );
  }

  get notice(): DisplayNotice | null {
    return this.#notice;
  }

  /** React observes the guidance notice through useSyncExternalStore. */
  readonly subscribe = (notify: () => void): (() => void) => {
    this.#listeners.add(notify);
    return () => {
      this.#listeners.delete(notify);
    };
  };

  /** ServicesProvider owns these application-wide listeners, including lazy module preparation. */
  attach(): () => void {
    if (this.#attached) throw new Error('The browser display is already attached.');
    this.#attached = true;
    this.#document.addEventListener('keydown', this.#keyDown, true);
    this.#document.addEventListener('pointerup', this.#gesture, true);
    this.#document.addEventListener('fullscreenchange', this.#fullscreenChanged);
    return () => {
      this.#attached = false;
      this.#document.removeEventListener('keydown', this.#keyDown, true);
      this.#document.removeEventListener('pointerup', this.#gesture, true);
      this.#document.removeEventListener('fullscreenchange', this.#fullscreenChanged);
      this.#releaseCaptures();
    };
  }

  /** A running battle pauses before the player's own Alt+Enter; automatic re-entry never pauses it. */
  bindBeforeToggle(callback: () => void): () => void {
    this.#beforeToggle.add(callback);
    return () => {
      this.#beforeToggle.delete(callback);
    };
  }

  /** Alt+Enter: leave required full screen for a window, or return to it. Failures become a notice. */
  async toggle(): Promise<void> {
    if (this.#change) return;
    for (const callback of this.#beforeToggle) callback();
    if (this.active) {
      this.#required = false;
      await this.#exit();
    } else {
      this.#required = true;
      await this.#enter(true);
    }
  }

  /** Quit leaves full screen first, then closes the tab, so the game ends like an application. */
  async quit(): Promise<void> {
    this.#required = false;
    this.#setNotice(null);
    // A first tap on Quit has already started the automatic entry; leave once that request settles.
    await this.#change;
    await this.#exit();
    const view = this.#document.defaultView;
    if (!view) return;
    view.close();
    // Browsers only let a page close a tab that a script opened or that has no other history.
    if (!view.closed) this.#setNotice('quitBlocked');
  }

  /** Returns to required full screen from the gesture that accepted the guidance. */
  async resume(): Promise<void> {
    this.#required = true;
    this.#setNotice(null);
    await this.#enter(true);
  }

  /** Dismissing a blocked Quit re-arms full screen; a failed request stays off to avoid a retry loop. */
  dismissNotice(): void {
    if (this.#notice === 'quitBlocked') this.#required = true;
    this.#setNotice(null);
  }

  readonly #keyDown = (event: KeyboardEvent): void => {
    if (this.#isToggleShortcut(event)) {
      event.preventDefault();
      event.stopPropagation();
      if (!event.repeat) void this.toggle();
      return;
    }
    // Modifier presses begin shortcuts such as Alt+Enter itself, so only plain keys re-enter full screen.
    const modified = event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
    if (!modified && event.code !== DisplayConfig.ExitKey) this.#gesture();
  };

  #isToggleShortcut(event: KeyboardEvent): boolean {
    return (
      event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.isComposing &&
      DisplayConfig.FullscreenKeys.includes(event.code)
    );
  }

  /** Any activating gesture re-enters required full screen; other keys and presses carry no activation. */
  readonly #gesture = (): void => {
    if (!this.#required || this.#change || this.active || !this.supported) return;
    const activation: unknown = this.#document.defaultView?.navigator.userActivation;
    const inactive =
      typeof activation === 'object' &&
      activation !== null &&
      'isActive' in activation &&
      activation.isActive === false;
    if (inactive) return;
    void this.#enter(false);
  };

  readonly #fullscreenChanged = (): void => {
    if (!this.active) this.#releaseCaptures();
  };

  async #enter(explicit: boolean): Promise<void> {
    if (this.#change || this.active) return;
    if (!this.supported) {
      // Required full screen is impossible in this browser; only an explicit request explains why.
      if (explicit) this.#setNotice('unsupported');
      return;
    }
    await this.#run(async () => {
      try {
        // The document root keeps menus, dialogs and subsequent battles in one full-screen session.
        await this.#document.documentElement.requestFullscreen({ navigationUI: 'hide' });
        this.#setNotice(null);
        // Optional captures must not delay the player's next command.
        void this.#captureEscape();
        void this.#lockOrientation();
      } catch {
        this.#required = false;
        this.#setNotice('failed');
      }
    });
  }

  async #exit(): Promise<void> {
    if (this.#change || !this.active) return;
    this.#releaseCaptures();
    await this.#run(async () => {
      try {
        await this.#document.exitFullscreen();
      } catch {
        this.#setNotice('failed');
      }
    });
  }

  async #run(request: () => Promise<void>): Promise<void> {
    const change = request().finally(() => {
      this.#change = null;
    });
    this.#change = change;
    await change;
  }

  async #captureEscape(): Promise<void> {
    const keyboard = this.#keyboard;
    if (!keyboard || !this.#attached || !this.active) return;
    try {
      await keyboard.lock([...DisplayConfig.CapturedKeys]);
      // An external exit or application teardown may occur while the browser grants the request.
      if (!this.#attached || !this.active) keyboard.unlock();
    } catch {
      // Optional capture may be unsupported or denied; full screen keeps the browser's normal Esc exit.
    }
  }

  /** Android browsers hold landscape in full screen; elsewhere the rotated layout in App.css applies. */
  async #lockOrientation(): Promise<void> {
    const orientation = this.#orientation;
    if (!orientation || !this.#attached || !this.active) return;
    try {
      await orientation.lock(DisplayConfig.LockedOrientation);
      this.#orientationLocked = true;
      if (!this.#attached || !this.active) this.#releaseCaptures();
    } catch {
      // Desktop and iOS browsers reject orientation lock; the rotated layout covers portrait devices.
    }
  }

  #releaseCaptures(): void {
    this.#keyboard?.unlock();
    if (!this.#orientationLocked) return;
    this.#orientationLocked = false;
    this.#orientation?.unlock();
  }

  #setNotice(notice: DisplayNotice | null): void {
    if (this.#notice === notice) return;
    this.#notice = notice;
    for (const notify of this.#listeners) notify();
  }
}
