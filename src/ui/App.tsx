import { GameCanvas } from './GameCanvas';
import './App.css';

export function App() {
  return (
    <main className="app">
      <header className="app__header">
        <p className="app__eyebrow">A naval adventure</p>
        <h1 className="app__title">Pirate Battle</h1>
        <p className="app__description">Your voyage starts here.</p>
      </header>

      <GameCanvas />
    </main>
  );
}
