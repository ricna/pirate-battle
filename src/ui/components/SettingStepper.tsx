import { useId } from 'react';
import { useApplicationServices } from '../hooks/UseApplicationServices';
import { AudioConfig } from '../../game/configuration/AudioConfig';
import { retinaAsset } from '../assets/UiAssets';
import { SettingSlider } from './SettingSlider';

type Direction = -1 | 1;

export function SettingStepper({
  label,
  value,
  range,
  decreaseDisabled,
  increaseDisabled,
  onStep,
  slider,
}: {
  label: string;
  value: string;
  /** Accessible description of the allowed values; the reference composition shows no limits. */
  range: string;
  decreaseDisabled: boolean;
  increaseDisabled: boolean;
  onStep: (direction: Direction) => void;
  slider?: {
    value: number;
    minimum: number;
    maximum: number;
    step: number;
    onChange: (value: number) => void;
  };
}) {
  const { audio } = useApplicationServices();
  const labelId = useId();
  const rangeId = useId();
  const step = (direction: Direction) => {
    audio.playUi(AudioConfig.Cues.Click, 'ui-click');
    onStep(direction);
  };
  return (
    <div className="options-setting" role="group" aria-labelledby={labelId} aria-describedby={rangeId}>
      <p id={labelId} className="options-label">
        {label}
      </p>
      <p id={rangeId} className="sr-only">
        {range}
      </p>
      {slider && (
        <output className="options-value options-slider-value" aria-live="polite">
          {value}
        </output>
      )}
      <div className="options-stepper">
        <button
          type="button"
          className="options-step"
          aria-label={`Decrease ${label.toLowerCase()}`}
          disabled={decreaseDisabled}
          onClick={() => step(-1)}
        >
          <img src={retinaAsset('ui/controls/icon_minus')} alt="" />
        </button>
        {slider ? (
          <SettingSlider {...slider} labelId={labelId} descriptionId={rangeId} valueText={value} />
        ) : (
          <output className="options-value" aria-live="polite">
            {value}
          </output>
        )}
        <button
          type="button"
          className="options-step"
          aria-label={`Increase ${label.toLowerCase()}`}
          disabled={increaseDisabled}
          onClick={() => step(1)}
        >
          <img src={retinaAsset('ui/controls/icon_plus')} alt="" />
        </button>
      </div>
    </div>
  );
}
