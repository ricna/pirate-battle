import type { RecordsTab } from '../screens/CaptainsLog';

export type Screen = 'menu' | 'options' | 'howToPlay' | 'records' | 'game' | 'result';

export interface ScreenLocation {
  readonly screen: Screen;
  readonly tab: RecordsTab;
}

const MainMenu: ScreenLocation = Object.freeze({ screen: 'menu', tab: 'ranking' });

/**
 * URL fragments of the screens that survive a refresh. Combat deliberately has no fragment:
 * reloading during a battle abandons it and returns to the main menu, as the challenge requires.
 */
const Fragments: Readonly<Record<string, ScreenLocation>> = Object.freeze({
  '#options': Object.freeze({ screen: 'options', tab: 'ranking' }),
  '#how-to-play': Object.freeze({ screen: 'howToPlay', tab: 'ranking' }),
  '#ranking': Object.freeze({ screen: 'records', tab: 'ranking' }),
  '#history': Object.freeze({ screen: 'records', tab: 'history' }),
  '#result': Object.freeze({ screen: 'result', tab: 'ranking' }),
});

/** Screen restored from `location.hash`; unknown or empty fragments open the main menu. */
export function screenFromFragment(fragment: string): ScreenLocation {
  return Fragments[fragment] ?? MainMenu;
}

/** Fragment that represents a screen; the main menu and combat use none. */
export function fragmentForScreen({ screen, tab }: ScreenLocation): string {
  switch (screen) {
    case 'options':
      return '#options';
    case 'howToPlay':
      return '#how-to-play';
    case 'records':
      return tab === 'history' ? '#history' : '#ranking';
    case 'result':
      return '#result';
    case 'menu':
    case 'game':
      return '';
  }
}
