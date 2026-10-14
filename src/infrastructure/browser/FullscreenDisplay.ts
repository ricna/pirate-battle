/** Browser capability adapter. Fullscreen is requested only by an explicit button gesture. */
export class FullscreenDisplay {
  readonly #document: Document;

  constructor(document: Document) {
    this.#document = document;
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

  async toggle(): Promise<void> {
    if (this.isActive()) await this.#document.exitFullscreen();
    else {
      if (!this.supported) throw new Error('This browser does not support page fullscreen.');
      // The document root keeps menus, dialogs and subsequent matches inside the same fullscreen session.
      await this.#document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    }
  }
}
