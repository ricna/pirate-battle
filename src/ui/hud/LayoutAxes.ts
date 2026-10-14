/** A movement expressed in an element's layout axes, in that layout's pixels. */
export interface LayoutMovement {
  readonly x: number;
  readonly y: number;
}

/**
 * Maps pointer movements measured on screen (client pixels) into an element's own layout axes.
 * The rotated portrait layout turns the whole application a quarter turn (App.css), so a drag the player
 * sees as "up" arrives as a sideways client movement. Movements ignore translation, so only the linear
 * part of every ancestor `transform` applies.
 */
export class LayoutAxes {
  readonly #screenToLayout: DOMMatrixReadOnly;

  private constructor(layoutToScreen: DOMMatrix) {
    this.#screenToLayout = new DOMMatrixReadOnly([
      layoutToScreen.a,
      layoutToScreen.b,
      layoutToScreen.c,
      layoutToScreen.d,
      0,
      0,
    ]).inverse();
  }

  /** Reads the transforms once, when a gesture starts. */
  static of(element: Element): LayoutAxes {
    let layoutToScreen = new DOMMatrix();
    for (let current: Element | null = element; current; current = current.parentElement) {
      const transform = getComputedStyle(current).transform;
      if (transform !== 'none') layoutToScreen = new DOMMatrix(transform).multiply(layoutToScreen);
    }
    return new LayoutAxes(layoutToScreen);
  }

  fromScreen(deltaX: number, deltaY: number): LayoutMovement {
    const { x, y } = this.#screenToLayout.transformPoint({ x: deltaX, y: deltaY });
    return { x, y };
  }
}
