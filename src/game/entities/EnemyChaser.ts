import { EnemyShip } from './EnemyShip';
import type { EnemyContext } from './EnemyShip';
import { GameEvent } from '../domain';

export class EnemyChaser extends EnemyShip {
  override update(context: EnemyContext): void {
    if (!this.alive || !context.target.alive) return;
    this.follow(context, false);
    if (context.world.areTouching(this, this.hullRadius, context.target, context.target.hullRadius)) {
      context.damage(context.target, this.ai.ramDamage, false); context.damage(this, this.health, false);
      context.event(GameEvent.ShipCollision);
    }
  }
}
