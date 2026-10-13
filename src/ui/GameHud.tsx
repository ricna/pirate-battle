import type { CSSProperties } from 'react';
import metadata from '../../assets/spritesheet/ui_sheet.json';
import type { GameConfig } from '../game/config';
import type { Snapshot } from '../game/simulation';
import type { Action } from '../game/domain';
import { InputConfig } from '../game/configuration/InputConfig';
import { retinaAsset } from './components';
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
export function MatchStatusHud({ config, snapshot, canPause, onPause }: {
  config: GameConfig;
  snapshot: Snapshot | null;
  canPause: boolean;
  onPause: () => void;
}) {
  const health = snapshot?.health ?? config.player.health;
  const maxHealth = snapshot?.maxHealth ?? config.player.health;
  const ratio = health / maxHealth;
  const remaining = snapshot?.remaining ?? config.sessionSeconds;
  const lowHealth = ratio <= config.rules.lowHealthRatio;
  const lowTime = remaining <= config.rules.timeWarning;

  return (
    <header className="match-hud" aria-label="Match status">
      <img className="hud-heart" src={retinaAsset('ui/hud/icon_heart')} alt="" />
      <p className={`hud-health ${lowHealth ? 'critical' : ''}`}>
        <img className="hud-health-fill" src={retinaAsset(healthFillSprite(config, ratio))} alt=""
          style={{ clipPath: healthFillClip(config, ratio) }} />
        <span className="sr-only">Health </span>
        <strong>{health} / {maxHealth}</strong>
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
      <button type="button" className="hud-round-button hud-pause" aria-label="Pause game" disabled={!canPause} onClick={onPause}>
        <img src={retinaAsset('ui/controls/icon_pause')} alt="" />
      </button>
    </header>
  );
}

export interface TouchInput {
  press: (source: string, action: Action) => void;
  release: (source: string) => void;
  /** Keeps keyboard focus on the arena while a touch button is held. */
  focusArena: () => void;
}

type Control = (typeof InputConfig.Controls)[number];

function CommandButton({ control, disabled, readiness, input }: {
  control: Control;
  disabled: boolean;
  readiness: Snapshot['weapons'][number] | undefined;
  input: TouchInput;
}) {
  const { action, label, icon } = control;
  const releasePointer = (pointerId: number, button: HTMLElement) => {
    input.release(`touch-${pointerId}`);
    delete button.dataset.held;
  };
  // Remaining reload fraction darkens the button face clockwise; a ready weapon looks exactly like the reference.
  const cooldownStyle = readiness ? { '--cooldown': 1 - readiness.progress } as CSSProperties : undefined;

  return (
    <button type="button" className={`hud-round-button command command-${action}`} aria-label={label} disabled={disabled}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        input.focusArena();
        input.press(`touch-${event.pointerId}`, action);
        event.currentTarget.dataset.held = 'true';
      }}
      onPointerUp={(event) => releasePointer(event.pointerId, event.currentTarget)}
      onPointerCancel={(event) => releasePointer(event.pointerId, event.currentTarget)}
      onLostPointerCapture={(event) => releasePointer(event.pointerId, event.currentTarget)}
      onKeyDown={(event) => {
        if (event.code !== 'Space' && event.code !== 'Enter') return;
        event.preventDefault();
        input.press(`button-${action}`, action);
      }}
      onKeyUp={() => input.release(`button-${action}`)}
      onBlur={() => input.release(`button-${action}`)}>
      <img src={retinaAsset(`ui/controls/icon_${icon}`)} alt="" />
      {readiness && <span className="weapon-cooldown" style={cooldownStyle} role="progressbar" aria-label={`${label} readiness`}
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(readiness.progress * 100)} />}
    </button>
  );
}

/** Bottom touch clusters of `assets/sample.png`: movement on the left, weapons on the right. */
export function TouchControls({ snapshot, disabled, input }: {
  snapshot: Snapshot | null;
  disabled: boolean;
  input: TouchInput;
}) {
  const clusters = [
    { cluster: 'movement', label: 'Movement controls' },
    { cluster: 'weapons', label: 'Weapon controls' },
  ] as const;
  return (
    <>
      {clusters.map(({ cluster, label }) => (
        <div key={cluster} className={`touch-cluster touch-cluster-${cluster}`} role="group" aria-label={label}>
          {InputConfig.Controls.filter((control) => control.cluster === cluster).map((control) => (
            <CommandButton key={control.action} control={control} disabled={disabled} input={input}
              readiness={snapshot?.weapons.find((weapon) => weapon.id === control.action)} />
          ))}
        </div>
      ))}
    </>
  );
}
