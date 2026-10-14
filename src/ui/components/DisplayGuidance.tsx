import { useSyncExternalStore } from 'react';
import type { DisplayNotice } from '../../infrastructure/browser/FullscreenDisplay';
import { useApplicationServices } from '../hooks/UseApplicationServices';
import { Button } from './Button';
import { Dialog } from './Dialog';

interface Guidance {
  readonly title: string;
  readonly message: string;
  /** Label of the action that retries from this gesture; absent when nothing can be retried. */
  readonly retry: string | null;
}

const Guidances: Readonly<Record<DisplayNotice, Guidance>> = Object.freeze({
  unsupported: {
    title: 'Full screen',
    message:
      'This browser cannot open the game in full screen. On iPhone or iPad, use Safari’s Share menu, choose Add to Home Screen, then open Pirate Battle from its icon. You can also keep playing in this tab.',
    retry: null,
  },
  failed: {
    title: 'Full screen',
    message:
      'The browser could not change full screen. Try again, or open the game directly in a browser tab instead of an embedded preview.',
    retry: 'Try again',
  },
  quitBlocked: {
    title: 'Quit',
    message:
      'The browser kept this tab open: a page can only close a tab it opened itself or one without other history. Close the tab to leave Pirate Battle.',
    retry: 'Return to the game',
  },
});

/** Explains a full-screen or Quit request the browser did not complete; FullscreenDisplay owns the state. */
export function DisplayGuidance() {
  const { display } = useApplicationServices();
  const notice = useSyncExternalStore(display.subscribe, () => display.notice);
  if (!notice) return null;
  const guidance = Guidances[notice];
  return (
    <Dialog title={guidance.title} onClose={() => display.dismissNotice()}>
      <p>{guidance.message}</p>
      {guidance.retry && <Button onClick={() => void display.resume()}>{guidance.retry}</Button>}
    </Dialog>
  );
}
