import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { audio } from '../../game/audio/AudioManager';
import { AudioConfig } from '../../game/configuration/AudioConfig';
export function Dialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const close = () => {
    audio.playUi(AudioConfig.Cues.Close, 'ui-close');
    onClose();
  };
  useEffect(() => {
    const dialog = ref.current; if (!dialog) throw new Error('Authored dialog is missing.');
    const focused = document.activeElement;
    dialog.showModal();
    audio.playUi(AudioConfig.Cues.Open, 'ui-open');

    return () => {
      dialog.close();
      if (focused instanceof HTMLElement && focused.isConnected) focused.focus();
    };
  }, []);
  return <dialog ref={ref} className="panel dialog" aria-labelledby="dialog-title" onCancel={(event) => {
    event.preventDefault();
    close();
  }}>
    <h2 id="dialog-title">{title}</h2>
    {children}
    <button type="button" className="text-button" onClick={close}>Close</button>
  </dialog>;
}
