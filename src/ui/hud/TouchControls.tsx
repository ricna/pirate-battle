import { useRef, type CSSProperties } from 'react';
import type { Snapshot } from '../../game/runtime/GameManager';
import { Action } from '../../game/contracts/GameDomain';
import { InputConfig } from '../../game/configuration/InputConfig';
import { retinaAsset } from '../assets/UiAssets';
import { LayoutAxes } from './LayoutAxes';
import './GameHud.css';

export interface TouchInput {
  press: (source: string, action: Action) => void;
  steer: (source: string, angle: number | null) => void;
  release: (source: string) => void;
  /** Keeps keyboard focus on the arena while a touch button is held. */
  focusArena: () => void;
}

type Control = (typeof InputConfig.Controls)[number];
type ForwardGesture = { startX: number; startY: number; axes: LayoutAxes };

function CommandButton({
  control,
  disabled,
  readiness,
  input,
}: {
  control: Control;
  disabled: boolean;
  readiness: Snapshot['weapons'][number] | undefined;
  input: TouchInput;
}) {
  const { action, label, icon } = control;
  const forwardGestures = useRef(new Map<number, ForwardGesture>());
  const releasePointer = (pointerId: number, button: HTMLElement) => {
    input.release(`touch-${pointerId}`);
    input.release(`touch-${pointerId}-turn`);
    forwardGestures.current.delete(pointerId);
    delete button.dataset.held;
  };
  const updateForwardTurn = (pointerId: number, clientX: number, clientY: number) => {
    const gesture = forwardGestures.current.get(pointerId);
    if (!gesture) return;
    const deltaX = clientX - gesture.startX;
    const deltaY = clientY - gesture.startY;
    // Steer toward the drag as the player sees it, also when the portrait layout is rotated.
    const drag = gesture.axes.fromScreen(deltaX, deltaY);
    const angle =
      Math.hypot(deltaX, deltaY) > InputConfig.ForwardDragThresholdPx ? Math.atan2(drag.x, -drag.y) : null;
    input.steer(`touch-${pointerId}-turn`, angle);
  };
  // Remaining reload fraction darkens the button face clockwise; a ready weapon looks exactly like the reference.
  const cooldownStyle = readiness ? ({ '--cooldown': 1 - readiness.progress } as CSSProperties) : undefined;

  return (
    <button
      type="button"
      className={`hud-round-button command command-${action}`}
      aria-label={label}
      disabled={disabled}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        input.focusArena();
        input.press(`touch-${event.pointerId}`, action);
        if (action === Action.Forward) {
          forwardGestures.current.set(event.pointerId, {
            startX: event.clientX,
            startY: event.clientY,
            axes: LayoutAxes.of(event.currentTarget),
          });
        }
        event.currentTarget.dataset.held = 'true';
      }}
      onPointerMove={(event) => updateForwardTurn(event.pointerId, event.clientX, event.clientY)}
      onPointerUp={(event) => releasePointer(event.pointerId, event.currentTarget)}
      onPointerCancel={(event) => releasePointer(event.pointerId, event.currentTarget)}
      onLostPointerCapture={(event) => releasePointer(event.pointerId, event.currentTarget)}
      onKeyDown={(event) => {
        if (event.code !== 'Space' && event.code !== 'Enter') return;
        event.preventDefault();
        input.press(`button-${action}`, action);
      }}
      onKeyUp={() => input.release(`button-${action}`)}
      onBlur={() => input.release(`button-${action}`)}
    >
      <img src={retinaAsset(`ui/controls/icon_${icon}`)} alt="" />
      {readiness && (
        <span
          className="weapon-cooldown"
          style={cooldownStyle}
          role="progressbar"
          aria-label={`${label} readiness`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(readiness.progress * 100)}
        />
      )}
    </button>
  );
}

/** Bottom touch clusters of `assets/sample.png`: movement on the left, weapons on the right. */
export function TouchControls({
  snapshot,
  disabled,
  input,
}: {
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
        <div
          key={cluster}
          className={`touch-cluster touch-cluster-${cluster}`}
          role="group"
          aria-label={label}
        >
          {InputConfig.Controls.filter((control) => control.cluster === cluster).map((control) => (
            <CommandButton
              key={control.action}
              control={control}
              disabled={disabled}
              input={input}
              readiness={snapshot?.weapons.find((weapon) => weapon.id === control.action)}
            />
          ))}
        </div>
      ))}
    </>
  );
}
