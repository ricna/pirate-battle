import { useId } from 'react';
import { AudioConfig } from '../../game/configuration/AudioConfig';
import { useApplicationServices } from '../hooks/UseApplicationServices';

export function SettingToggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const labelId = useId();
  const { audio } = useApplicationServices();

  return (
    <div className="options-setting">
      <p id={labelId} className="options-label">
        {label}
      </p>
      <button
        type="button"
        role="switch"
        className="options-toggle"
        aria-labelledby={labelId}
        aria-checked={checked}
        onClick={() => {
          audio.playUi(AudioConfig.Cues.Click, 'ui-click');
          onChange(!checked);
        }}
      >
        <span className="options-toggle-state" aria-hidden="true">
          {checked ? 'On' : 'Off'}
        </span>
        <span className="options-toggle-thumb" aria-hidden="true" />
      </button>
    </div>
  );
}
