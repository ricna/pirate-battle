import { distance } from '../geometry';
import { EnemyShip } from './EnemyShip';
import type { EnemyContext } from './EnemyShip';

export class EnemyChaser extends EnemyShip {
  override update(context: EnemyContext): void {
    if (!this.alive || !context.target.alive) return;
    this.follow(context, false);
    if (distance(this, context.target) < this.radius + context.target.radius) {
      context.damage(context.target, this.ai.ramDamage, false); context.damage(this, this.health, false);
    }
  }
}
