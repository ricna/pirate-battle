import { useId } from 'react';
import metadata from '../../../assets/spritesheet/ui_sheet.json';
import { retinaAsset } from '../assets/UiAssets';
import './AssetLoadingIndicator.css';

/** Authored player-health bar showing measured asset progress, or an indeterminate preparation stage. */
export function AssetLoadingIndicator({ label, progress }: { label: string; progress: number | null }) {
  const labelId = useId();
  const percent = progress === null ? null : Math.min(100, Math.max(0, Math.round(progress)));
  const frame = metadata.frames.health_frame;
  const rect = frame.ui.layout.fill_rect;
  const visibleRight = rect.x + rect.w * (percent === null ? 1 : percent / 100);
  const hiddenPercent = (1 - visibleRight / frame.sourceSize.w) * 100;

  return (
    <div className="asset-loading-indicator">
      <h1 className="asset-loading-title">Setting Sail</h1>
      <p id={labelId} className="asset-loading-label" role="status">
        {label}
      </p>
      <div
        className={`asset-loading-bar${percent === null ? ' asset-loading-indeterminate' : ''}`}
        role="progressbar"
        aria-labelledby={labelId}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent ?? undefined}
        aria-valuetext={percent === null ? 'Preparing' : `${percent}%`}
      >
        <img src={retinaAsset('ui/hud/health_frame')} alt="" />
        <img
          className="asset-loading-fill"
          src={retinaAsset('ui/hud/health_fill_green')}
          alt=""
          style={{ clipPath: `inset(0 ${hiddenPercent}% 0 0)` }}
        />
        <span className="asset-loading-value" aria-hidden="true">
          {percent === null ? 'Preparing…' : `${percent}%`}
        </span>
      </div>
    </div>
  );
}
