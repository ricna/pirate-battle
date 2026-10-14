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
  useEffect(() => () => cancelAnimationFrame(messageFrame.current), []);
  const showMessage = (text: string) => {
    cancelAnimationFrame(messageFrame.current);
    // Let the pause dialog mount first, so fullscreen guidance becomes the topmost modal.
    messageFrame.current = requestAnimationFrame(() => setMessage(text));
  };
  const toggle = async () => {
    onBeforeChange?.();
    if (!display.supported && !active) {
      showMessage(
        'This browser cannot open the game in full screen. On iPhone or iPad, use Safari’s Share menu, choose Add to Home Screen, then open Pirate Battle from its icon. You can also keep playing here in landscape.',
      );
      return;
    }
    setPending(true);
    try {
      await display.toggle();
    } catch {
      showMessage(
        'The browser could not change full screen. Try again, or open the game directly in a browser tab instead of an embedded preview.',
      );
    } finally {
      setPending(false);
    }
  };
  return (
    <div className={`fullscreen-control ${className}`}>
      <button
        type="button"
        className="fullscreen-button"
        onClick={() => void toggle()}
        disabled={pending}
        aria-pressed={active}
      >
        {active ? 'Exit full screen' : 'Full screen'}
      </button>
      {message && (
        <Dialog title="Full screen" onClose={() => setMessage('')}>
          <p>{message}</p>
        </Dialog>
      )}
    </div>
  );
}
