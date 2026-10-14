import { useEffect, useRef, useState } from 'react';
import type { Options } from '../../application/configuration/Options';
import { AudioConfig } from '../../game/configuration/AudioConfig';
import { Button } from '../components/Button';
import { useApplicationServices } from '../hooks/UseApplicationServices';
import { OptionsScreen } from '../screens/OptionsScreen';
import './PauseMenu.css';

type PauseView = 'pause' | 'options' | 'leave';

/** Accessible dialog names; the pause name is kept stable for assistive technology and tests. */
const DialogNames: Readonly<Record<PauseView, string>> = Object.freeze({
  pause: 'Battle paused',
  options: 'Options',
  leave: 'Leave this battle?',
});

/**
 * Pause board reproducing assets/sample_pause.png: Resume, Options and Main Menu.
 * Options opens the regular Options board inside the paused battle; Main Menu asks before abandoning.
 * A native modal dialog contains focus and restores it when the battle resumes.
 */
export function PauseMenu({
  options,
  onOptionsChange,
  onResume,
  onLeave,
}: {
  options: Options;
  onOptionsChange: (options: Options) => void;
  onResume: () => void;
  onLeave: () => void;
}) {
  const { audio } = useApplicationServices();
  const ref = useRef<HTMLDialogElement>(null);
  const [view, setView] = useState<PauseView>('pause');

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) throw new Error('The authored pause dialog is missing.');
    const focused = document.activeElement;
    dialog.showModal();
    audio.playUi(AudioConfig.Cues.Open, 'ui-open');
    return () => {
      dialog.close();
      if (focused instanceof HTMLElement && focused.isConnected) focused.focus();
    };
  }, [audio]);

  // Escape steps back one level: Options or the leave confirmation return to the pause board, which resumes.
  const back = () => {
    audio.playUi(AudioConfig.Cues.Close, 'ui-close');
    if (view === 'pause') onResume();
    else setView('pause');
  };

  return (
    <dialog
      ref={ref}
      className={`pause-dialog pause-${view}`}
      aria-label={DialogNames[view]}
      onCancel={(event) => {
        event.preventDefault();
        back();
      }}
    >
      {view === 'options' ? (
        <OptionsScreen
          options={options}
          onChange={onOptionsChange}
          backLabel="Back"
          onBack={() => setView('pause')}
          note="Audio changes apply now. Game changes apply to your next battle."
        />
      ) : (
        <section className="pause-board">
          <h2>{view === 'leave' ? 'Leave battle?' : 'Paused'}</h2>
          <p className="pause-message">
            {view === 'leave' ? 'This unfinished battle will not be saved.' : 'Ready when you are.'}
          </p>
          <p className="portrait-hint">Rotate your device to landscape before resuming.</p>
          <div className="pause-actions">
            {view === 'leave' ? (
              <>
                <Button onClick={() => setView('pause')}>Stay here</Button>
                <Button onClick={onLeave}>Leave battle</Button>
              </>
            ) : (
              <>
                <Button onClick={onResume}>Resume</Button>
                <Button onClick={() => setView('options')}>Options</Button>
                <Button onClick={() => setView('leave')}>Main Menu</Button>
              </>
            )}
          </div>
        </section>
      )}
    </dialog>
  );
}
