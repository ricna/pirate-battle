import type { MatchRecord } from '../../application/records/MatchRecord';
import { EndReason } from '../../game/contracts/GameDomain';
import { Button } from '../components/Button';
import { uiAsset } from '../assets/UiAssets';
import { EndReasonLabels } from '../records/EndReasonLabels';
import { ResultScore } from '../records/ResultScore';

/** Completed-battle presentation receives a record and commands, never active domain entities. */
export function ResultScreen({
  record,
  pending,
  submitting,
  submissionBusy,
  error,
  onRetry,
  onPlayAgain,
  onMainMenu,
}: {
  record: MatchRecord;
  pending: boolean;
  submitting: boolean;
  submissionBusy: boolean;
  error: string | undefined;
  onRetry: () => void;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}) {
  return (
    <section className="panel result-panel">
      <p className="eyebrow">{record.reason === EndReason.Death ? 'Ship Sunk' : 'VICTORY'}</p>
      <h1>Battle result</h1>
      <p>
        {record.reason === EndReason.Time ? 'You survived! Congratulations!' : 'Your ship was lost at sea.'}
      </p>
      <div className="result-score">
        <img src={uiAsset('hud/icon_score')} alt="" />
        <ResultScore score={record.score} />
        <span>points</span>
      </div>
      <p>
        Time played: <strong>{record.duration.toFixed(1)} seconds</strong>
      </p>
      <p>
        End reason: <strong>{EndReasonLabels[record.reason]}</strong>
      </p>
      {record.statistics && (
        <dl className="battle-statistics">
          <div>
            <dt>Enemies sunk</dt>
            <dd>{record.statistics.enemiesSunk}</dd>
          </div>
          <div>
            <dt>Cannonballs fired</dt>
            <dd>{record.statistics.cannonballsFired}</dd>
          </div>
          <div>
            <dt>Cannonball hits</dt>
            <dd>{record.statistics.cannonballHits}</dd>
          </div>
          <div>
            <dt>Damage received</dt>
            <dd>{record.statistics.damageReceived}</dd>
          </div>
          <div>
            <dt>Health remaining</dt>
            <dd>{record.statistics.healthRemaining}</dd>
          </div>
        </dl>
      )}
      <p role="status">
        {pending
          ? submitting
            ? 'Saving battle…'
            : 'Battle saved locally. Submission pending.'
          : 'Battle registered in Ranking and Match History.'}
      </p>
      {error && <p role="alert">{error}</p>}
      {pending && (
        <Button disabled={submissionBusy} onClick={onRetry}>
          Retry submission
        </Button>
      )}
      <div className="button-row">
        <Button icon="icon_restart" onClick={onPlayAgain}>
          Play Again
        </Button>
        <Button variant="secondary" icon="icon_home" onClick={onMainMenu}>
          Main Menu
        </Button>
      </div>
    </section>
  );
}
