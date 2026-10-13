import type { Options } from '../../application/configuration/Options';

import { OptionsConfig } from '../../application/configuration/OptionsConfig';
import { Button } from '../components/Button';
import { SettingStepper } from '../components/SettingStepper';
import './OptionsScreen.css';

/** Tolerance for values persisted between step multiples (for example by an older build with finer steps). */
const StepTolerance = 1e-9;
const PercentScale = 100;

type Direction = -1 | 1;

/** Next multiple of `step` in `direction`, kept inside the documented limits. */
function stepped(
  value: number,
  step: number,
  direction: Direction,
  [minimum, maximum]: readonly [number, number],
): number {
  const index =
    direction > 0
      ? Math.floor(value / step + StepTolerance) + 1
      : Math.ceil(value / step - StepTolerance) - 1;
  // Rounding to the step's precision removes binary floating-point residue such as 2.5000000000000004.
  const next = Number((index * step).toPrecision(12));
  return Math.min(maximum, Math.max(minimum, next));
}

/**
 * Options board reproducing `assets/sample_options.png`, followed by the sound settings in the same style.
 * Every step is already a valid value, so each change is saved at once; there is no separate Save action.
 */
export function OptionsScreen({
  options,
  onChange,
  onMainMenu,
}: {
  options: Options;
  onChange: (options: Options) => void;
  onMainMenu: () => void;
}) {
  const steps = OptionsConfig.Steps;
  const update = (change: Partial<Options>) => onChange({ ...options, ...change });

  return (
    <section className="options-board" aria-labelledby="options-title">
      <h1 id="options-title">Options</h1>

      <SettingStepper
        label="Game session time"
        value={`${options.sessionSeconds} s`}
        range={`Allowed range ${OptionsConfig.Limits.session[0]}–${OptionsConfig.Limits.session[1]} seconds.`}
        decreaseDisabled={options.sessionSeconds <= OptionsConfig.Limits.session[0]}
        increaseDisabled={options.sessionSeconds >= OptionsConfig.Limits.session[1]}
        onStep={(direction) =>
          update({
            sessionSeconds: stepped(
              options.sessionSeconds,
              steps.session,
              direction,
              OptionsConfig.Limits.session,
            ),
          })
        }
      />

      <SettingStepper
        label="Enemy spawn time"
        value={`${options.spawnSeconds} s`}
        range={`Allowed range ${OptionsConfig.Limits.spawn[0]}–${OptionsConfig.Limits.spawn[1]} seconds.`}
        decreaseDisabled={options.spawnSeconds <= OptionsConfig.Limits.spawn[0]}
        increaseDisabled={options.spawnSeconds >= OptionsConfig.Limits.spawn[1]}
        onStep={(direction) =>
          update({
            spawnSeconds: stepped(options.spawnSeconds, steps.spawn, direction, OptionsConfig.Limits.spawn),
          })
        }
      />

      <SettingStepper
        label="Sound"
        value={options.sound ? 'On' : 'Off'}
        range="Off or on."
        decreaseDisabled={!options.sound}
        increaseDisabled={options.sound}
        onStep={(direction) => update({ sound: direction > 0 })}
      />

      <SettingStepper
        label="Volume"
        value={`${Math.round(options.volume * PercentScale)} %`}
        range={`Allowed range ${OptionsConfig.Limits.volume[0] * PercentScale}–${OptionsConfig.Limits.volume[1] * PercentScale} percent.`}
        decreaseDisabled={options.volume <= OptionsConfig.Limits.volume[0]}
        increaseDisabled={options.volume >= OptionsConfig.Limits.volume[1]}
        onStep={(direction) =>
          update({ volume: stepped(options.volume, steps.volume, direction, OptionsConfig.Limits.volume) })
        }
      />

      <SettingStepper
        label="Music volume"
        value={`${Math.round(options.musicVolume * PercentScale)} %`}
        range="Allowed range 0–100 percent. Music is also affected by Sound and master Volume."
        decreaseDisabled={options.musicVolume <= OptionsConfig.Limits.volume[0]}
        increaseDisabled={options.musicVolume >= OptionsConfig.Limits.volume[1]}
        onStep={(direction) =>
          update({
            musicVolume: stepped(options.musicVolume, steps.volume, direction, OptionsConfig.Limits.volume),
          })
        }
      />

      <Button className="options-main-menu" onClick={onMainMenu}>
        Main Menu
      </Button>
      <button
        type="button"
        className="text-button options-restore"
        onClick={() => onChange(OptionsConfig.Default)}
      >
        Restore default options
      </button>
    </section>
  );
}
