import type { ButtonHTMLAttributes } from 'react';
import { uiAsset } from '../assets/UiAssets';
import { audio } from '../../game/audio/AudioManager';
import { AudioConfig } from '../../game/configuration/AudioConfig';
export function Button({ children, className = '', onClick, onPointerEnter, variant = 'primary', icon, ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary'; icon?: string }) {
  const handlePointerEnter: ButtonHTMLAttributes<HTMLButtonElement>['onPointerEnter'] = (event) => {
    if (event.pointerType === 'mouse') audio.playUi(AudioConfig.Cues.Hover, 'ui-hover');
    onPointerEnter?.(event);
  };
  const handleClick: ButtonHTMLAttributes<HTMLButtonElement>['onClick'] = (event) => {
    audio.playUi(AudioConfig.Cues.Click, 'ui-click');
    onClick?.(event);
  };

  return <button {...props} className={`sprite-button ${variant} ${className}`}
    onPointerEnter={handlePointerEnter} onClick={handleClick}>
    {icon && <img className="button-icon" src={uiAsset(`controls/${icon}`)} alt="" />}
    {children}
  </button>;
}
