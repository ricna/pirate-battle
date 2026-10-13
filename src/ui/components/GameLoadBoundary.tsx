import { Component } from 'react';
import type { ReactNode } from 'react';
import { Button } from './Button';
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
