import { useEffect, useRef } from 'react';
import type { GameConfig } from '../../game/contracts/GameConfig';
import { EndReason } from '../../game/contracts/GameDomain';
import metadata from '../../../assets/spritesheet/ui_sheet.json';

import type { Snapshot } from '../../game/runtime/GameManager';
import { retinaAsset } from '../assets/UiAssets';
import { useApplicationServices } from '../hooks/UseApplicationServices';
import './GameHud.css';

const SecondsPerMinute = 60;

/** Fill stage for a health ratio, using the same authored thresholds as the player's in-world bar. */
function healthFillSprite(config: GameConfig, ratio: number): string {
  const fills = config.player.visual.healthFills;
  const stage = fills.find((fill) => ratio > fill.minimumHealthRatio) ?? fills.at(-1);
  if (!stage) throw new Error('The health HUD requires authored player health fill stages.');
  return stage.sprite;
}

/** Right-side clip that reveals the fill from the left, following the atlas `fill_rect` and `clip_axis`. */
function healthFillClip(config: GameConfig, ratio: number): string {
  const frame = metadata.frames[config.player.visual.healthMetadata];
  const rect = frame.ui.layout.fill_rect;
  const visibleRight = rect.x + rect.w * Math.min(1, Math.max(0, ratio));
  const hiddenPercent = (1 - visibleRight / frame.sourceSize.w) * 100;
  return `inset(0 ${hiddenPercent}% 0 0)`;
}

function formatClock(remainingSeconds: number): string {
  const total = Math.max(0, Math.ceil(remainingSeconds));
  const minutes = Math.floor(total / SecondsPerMinute);
  const seconds = total % SecondsPerMinute;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** Top HUD of `assets/sample.png`: heart and health bar on the left; score, clock and pause on the right. */
export function MatchStatusHud({
  config,
  snapshot,
  canPause,
  onPause,
}: {
  config: GameConfig;
  snapshot: Snapshot | null;
  canPause: boolean;
  onPause: () => void;
}) {
  const health = snapshot?.health ?? config.player.health;
  const maxHealth = snapshot?.maxHealth ?? config.player.health;
  const ratio = health / maxHealth;
  const remaining = snapshot?.reason === EndReason.Time ? 0 : (snapshot?.remaining ?? config.sessionSeconds);
  const lowHealth = ratio <= config.rules.lowHealthRatio;
  const lowTime = remaining <= config.rules.timeWarning;
  const { display } = useApplicationServices();
  const pause = useRef(onPause);
  pause.current = onPause;
  // Alt+Enter pauses the battle before the display changes; Resume stays an explicit command.
  useEffect(() => display.bindBeforeToggle(() => pause.current()), [display]);

  return (
    <header className="match-hud" aria-label="Match status">
      <img className="hud-heart" src={retinaAsset('ui/hud/icon_heart')} alt="" />
      <p className={`hud-health ${lowHealth ? 'critical' : ''}`}>
        <img
          className="hud-health-fill"
          src={retinaAsset(healthFillSprite(config, ratio))}
          alt=""
          style={{ clipPath: healthFillClip(config, ratio) }}
        />
        <span className="sr-only">Health </span>
        <strong>
          {health} / {maxHealth}
        </strong>
      </p>
      <p className={`hud-counter hud-score ${snapshot?.scorePulse ? 'score-pulse' : ''}`}>
        <img src={retinaAsset('ui/hud/icon_score')} alt="" />
        <span className="sr-only">Score </span>
        <strong>{snapshot?.score ?? 0}</strong>
      </p>
      <p className={`hud-counter hud-time ${lowTime ? 'critical' : ''}`}>
        <img src={retinaAsset('ui/hud/icon_time')} alt="" />
        <span className="sr-only">Time remaining </span>
        <strong>{formatClock(remaining)}</strong>
      </p>
      <button
        type="button"
        className="hud-round-button hud-pause"
        aria-label="Pause game"
        disabled={!canPause}
        onClick={onPause}
      >
        <img src={retinaAsset('ui/controls/icon_pause')} alt="" />
      </button>
    </header>
  );
}
