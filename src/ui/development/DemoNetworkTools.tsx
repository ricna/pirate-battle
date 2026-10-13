import { Button } from '../components/Button';
import { SCENARIOS } from '../../infrastructure/network/NetworkSimulator';
import type { Scenario } from '../../infrastructure/network/NetworkSimulator';

/** Collapsed demo controls for the MSW scenarios, docked in the bottom-left corner outside the menu board. */
export function DemoNetworkTools({
  scenario,
  onSelect,
  onReset,
}: {
  scenario: Scenario;
  onSelect: (scenario: Scenario) => void;
  onReset: () => void;
}) {
  const select = (value: string) => {
    const selected = SCENARIOS.find((candidate) => candidate === value);
    if (!selected) throw new Error(`Unknown network scenario ${value}.`);
    onSelect(selected);
  };

  return (
    <details className="network-tools">
      <summary>Demo network scenarios</summary>
      <p>These simulated APIs run locally with MSW. Real gameplay keeps working when the service fails.</p>
      <label>
        Network scenario
        <select value={scenario} onChange={(event) => select(event.target.value)}>
          {SCENARIOS.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      <Button className="compact" onClick={onReset}>
        Reset demo server
      </Button>
    </details>
  );
}
