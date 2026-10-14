import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useApplicationServices } from '../hooks/UseApplicationServices';
import { Dialog } from './Dialog';
import './FullscreenControl.css';

export function FullscreenControl({
  className = '',
  onBeforeChange,
}: {
  className?: string;
  onBeforeChange?: () => void;
}) {
  const { display } = useApplicationServices();
  const active = useSyncExternalStore(display.subscribe, display.isActive);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const messageFrame = useRef(0);
  const requestPending = useRef(false);
  useEffect(() => () => cancelAnimationFrame(messageFrame.current), []);
  const showMessage = (text: string) => {
    cancelAnimationFrame(messageFrame.current);
    // Let the pause dialog mount first, so fullscreen guidance becomes the topmost modal.
    messageFrame.current = requestAnimationFrame(() => setMessage(text));
  };
  const toggle = async () => {
    if (requestPending.current) return;
    requestPending.current = true;
    setPending(true);
    try {
      onBeforeChange?.();
      if (!display.supported && !active) {
        showMessage(
          'This browser cannot open the game in full screen. On iPhone or iPad, use Safari’s Share menu, choose Add to Home Screen, then open Pirate Battle from its icon. You can also keep playing here in landscape.',
        );
        return;
      }
      await display.toggle();
    } catch {
      showMessage(
        'The browser could not change full screen. Try again, or open the game directly in a browser tab instead of an embedded preview.',
      );
    } finally {
      requestPending.current = false;
      setPending(false);
    }
  };
  const shortcut = useRef(toggle);
  shortcut.current = toggle;
  useEffect(() => display.bindShortcut(() => void shortcut.current()), [display]);
  return (
    <div className={`fullscreen-control ${className}`}>
      <button
        type="button"
        className="fullscreen-button"
        onClick={() => void toggle()}
        disabled={pending}
        aria-pressed={active}
        aria-label={active ? 'Exit full screen' : 'Full screen'}
        aria-keyshortcuts="Alt+Enter"
        title="Toggle full screen (Alt+Enter)"
      >
        <span className="fullscreen-label">{active ? 'Exit full screen' : 'Full screen'}</span>
        <span className="fullscreen-symbol" aria-hidden="true">
          ⛶
        </span>
      </button>
      {message && (
        <Dialog title="Full screen" onClose={() => setMessage('')}>
          <p>{message}</p>
        </Dialog>
      )}
    </div>
  );
}
