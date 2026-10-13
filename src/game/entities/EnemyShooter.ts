import { Action } from '../domain';
import { EnemyShip } from './EnemyShip';
import type { EnemyContext } from './EnemyShip';

export class EnemyShooter extends EnemyShip {
  override update(context: EnemyContext): void {
    if (!this.alive || !context.target.alive) return;
    const { inRange, aim } = this.follow(context, true);
    if (inRange && Math.abs(aim) < this.ai.firingCone) context.fire(this, Action.Front);
  }
}
