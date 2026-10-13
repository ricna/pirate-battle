import { useId } from 'react';
import { DEFAULT_OPTIONS, LIMITS } from '../game/config';
import type { Options } from '../game/config';
import { GameDefaults } from '../game/configuration/GameDefaults';
import { audio } from '../game/audio';
import { AudioConfig } from '../game/configuration/AudioConfig';
import { Button, retinaAsset } from './components';
import './OptionsScreen.css';

/** Tolerance for values persisted between step multiples (for example by an older build with finer steps). */
const StepTolerance = 1e-9;
const PercentScale = 100;

type Direction = -1 | 1;

/** Next multiple of `step` in `direction`, kept inside the documented limits. */
function stepped(value: number, step: number, direction: Direction, [minimum, maximum]: readonly [number, number]): number {
  const index = direction > 0 ? Math.floor(value / step + StepTolerance) + 1 : Math.ceil(value / step - StepTolerance) - 1;
  // Rounding to the step's precision removes binary floating-point residue such as 2.5000000000000004.
  const next = Number((index * step).toPrecision(12));
  return Math.min(maximum, Math.max(minimum, next));
}

function SettingStepper({ label, value, range, decreaseDisabled, increaseDisabled, onStep }: {
  label: string;
  value: string;
  /** Accessible description of the allowed values; the reference composition shows no limits. */
  range: string;
  decreaseDisabled: boolean;
  increaseDisabled: boolean;
  onStep: (direction: Direction) => void;
}) {
  const labelId = useId();
  const rangeId = useId();
  const step = (direction: Direction) => {
    audio.playUi(AudioConfig.Cues.Click, 'ui-click');
    onStep(direction);
  };
  return (
    <div className="options-setting" role="group" aria-labelledby={labelId} aria-describedby={rangeId}>
      <p id={labelId} className="options-label">{label}</p>
      <p id={rangeId} className="sr-only">{range}</p>
      <div className="options-stepper">
        <button type="button" className="options-step" aria-label={`Decrease ${label.toLowerCase()}`}
          disabled={decreaseDisabled} onClick={() => step(-1)}>
          <img src={retinaAsset('ui/controls/icon_minus')} alt="" />
        </button>
        <output className="options-value" aria-live="polite">{value}</output>
        <button type="button" className="options-step" aria-label={`Increase ${label.toLowerCase()}`}
          disabled={increaseDisabled} onClick={() => step(1)}>
          <img src={retinaAsset('ui/controls/icon_plus')} alt="" />
        </button>
      </div>
    </div>
  );
}

/**
 * Options board reproducing `assets/sample_options.png`, followed by the sound settings in the same style.
 * Every step is already a valid value, so each change is saved at once; there is no separate Save action.
 */
export function OptionsScreen({ options, onChange, onMainMenu }: {
  options: Options;
  onChange: (options: Options) => void;
  onMainMenu: () => void;
}) {
  const steps = GameDefaults.OptionSteps;
  const update = (change: Partial<Options>) => onChange({ ...options, ...change });

  return (
    <section className="options-board" aria-labelledby="options-title">
      <h1 id="options-title">Options</h1>

      <SettingStepper label="Game session time" value={`${options.sessionSeconds} s`}
        range={`Allowed range ${LIMITS.session[0]}–${LIMITS.session[1]} seconds.`}
        decreaseDisabled={options.sessionSeconds <= LIMITS.session[0]}
        increaseDisabled={options.sessionSeconds >= LIMITS.session[1]}
        onStep={(direction) => update({ sessionSeconds: stepped(options.sessionSeconds, steps.session, direction, LIMITS.session) })} />

      <SettingStepper label="Enemy spawn time" value={`${options.spawnSeconds} s`}
        range={`Allowed range ${LIMITS.spawn[0]}–${LIMITS.spawn[1]} seconds.`}
        decreaseDisabled={options.spawnSeconds <= LIMITS.spawn[0]}
        increaseDisabled={options.spawnSeconds >= LIMITS.spawn[1]}
        onStep={(direction) => update({ spawnSeconds: stepped(options.spawnSeconds, steps.spawn, direction, LIMITS.spawn) })} />

      <SettingStepper label="Sound" value={options.sound ? 'On' : 'Off'} range="Off or on."
        decreaseDisabled={!options.sound} increaseDisabled={options.sound}
        onStep={(direction) => update({ sound: direction > 0 })} />

      <SettingStepper label="Volume" value={`${Math.round(options.volume * PercentScale)} %`}
        range={`Allowed range ${LIMITS.volume[0] * PercentScale}–${LIMITS.volume[1] * PercentScale} percent.`}
        decreaseDisabled={options.volume <= LIMITS.volume[0]}
        increaseDisabled={options.volume >= LIMITS.volume[1]}
        onStep={(direction) => update({ volume: stepped(options.volume, steps.volume, direction, LIMITS.volume) })} />

      <Button className="options-main-menu" onClick={onMainMenu}>Main Menu</Button>
      <button type="button" className="text-button options-restore" onClick={() => onChange(DEFAULT_OPTIONS)}>
        Restore default options
      </button>
    </section>
  );
}
