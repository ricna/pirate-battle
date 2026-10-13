import metadata from '../../../assets/spritesheet/ui_sheet.json';
import { retinaAsset } from '../assets/UiAssets';

/** Native range input over the authored HUD bar, using its logical fill rectangle. */
export function SettingSlider({
  value,
  minimum,
  maximum,
  step,
  onChange,
  labelId,
  descriptionId,
  valueText,
}: {
  value: number;
  minimum: number;
  maximum: number;
  step: number;
  onChange: (value: number) => void;
  labelId: string;
  descriptionId: string;
  valueText: string;
}) {
  const frame = metadata.frames.health_frame;
  const rect = frame.ui.layout.fill_rect;
  const ratio = Math.min(1, Math.max(0, (value - minimum) / (maximum - minimum)));
  const hiddenPercent = (1 - (rect.x + rect.w * ratio) / frame.sourceSize.w) * 100;

  return (
    <div className="options-slider-bar">
      <img src={retinaAsset('ui/hud/health_frame')} alt="" />
      <img
        src={retinaAsset('ui/hud/health_fill_amber')}
        alt=""
        style={{ clipPath: `inset(0 ${hiddenPercent}% 0 0)` }}
      />
      <input
        className="options-slider"
        type="range"
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
        aria-valuetext={valueText}
        min={minimum}
        max={maximum}
        step={step}
        value={value}
        style={{
          left: `calc(${(rect.x / frame.sourceSize.w) * 100}% - var(--slider-thumb-size) / 2)`,
          width: `calc(${(rect.w / frame.sourceSize.w) * 100}% + var(--slider-thumb-size))`,
        }}
        onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
      />
    </div>
  );
}
