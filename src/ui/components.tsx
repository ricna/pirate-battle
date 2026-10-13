import { Component, useEffect, useRef } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { audio } from '../game/audio';
import { AudioConfig } from '../game/configuration/AudioConfig';
const files = import.meta.glob('../../assets/png/default/ui/**/*.png', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export function uiAsset(name: string) {
  const url = files[`../../assets/png/default/ui/${name}.png`]; if (!url) throw new Error(`Required UI asset ${name} is missing.`); return url;
}
export function Button({ children, className = '', onClick, variant = 'primary', icon, ...props }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary'; icon?: string }) {
  return <button {...props} className={`sprite-button ${variant} ${className}`}
    onClick={(event) => { audio.play(AudioConfig.Cues.Click); onClick?.(event); }}>{icon && <img className="button-icon" src={uiAsset(`controls/${icon}`)} alt="" />}{children}</button>;
}
export function Dialog({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current; if (!dialog) throw new Error('Authored dialog is missing.');
    const focused = document.activeElement; dialog.showModal();
    return () => { dialog.close(); if (focused instanceof HTMLElement && focused.isConnected) focused.focus(); };
  }, []);
  return <dialog ref={ref} className="panel dialog" aria-labelledby="dialog-title" onCancel={(e) => { e.preventDefault(); onClose(); }}>
    <h2 id="dialog-title">{title}</h2>{children}
  </dialog>;
}
export function ControlsHelp() {
  return <p className="controls-help"><kbd>W</kbd> / <kbd>↑</kbd> forward · <kbd>A</kbd><kbd>D</kbd> / <kbd>←</kbd><kbd>→</kbd> turn<br />
    <kbd>Space</kbd> front cannon · <kbd>Q</kbd> left broadside · <kbd>E</kbd> right broadside · <kbd>P</kbd> / <kbd>Esc</kbd> pause<br />
    On touch screens, hold movement and attack buttons together. Play in landscape.</p>;
}
export class GameLoadBoundary extends Component<{ children: ReactNode; onMenu: () => void }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (!this.state.error) return this.props.children;
    return <main className="app"><section className="panel result-panel" role="alert"><h1>Unable to load game engine</h1>
      <p>A required module could not load. Check your connection and reload to try again.</p>
      <Button onClick={() => location.reload()}>Reload and retry</Button><Button onClick={this.props.onMenu}>Main Menu</Button>
    </section></main>;
  }
}
