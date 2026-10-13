import type { Allegiance, Action } from '../domain';
import type { Point } from '../geometry';
import type { ShipVisualProfile } from '../configuration/types';
import type { CollisionContact } from '../core/ShipCollisionWorld';

export const ImpactKind = { Water: 'water', Coast: 'coast' } as const;
export type ImpactKind = typeof ImpactKind[keyof typeof ImpactKind];
export const FeedbackKind = { Shot: 'shot', Damage: 'damage', Sunk: 'sunk', Score: 'score', Contact: 'contact', ProjectileImpact: 'projectile-impact' } as const;

interface ShipEvent {
  readonly shipId: number;
  readonly allegiance: Allegiance;
  readonly point: Point;
}

export type FeedbackEvent =
  | (ShipEvent & { readonly kind: typeof FeedbackKind.Shot; readonly angle: number; readonly weapon: Action })
  | (ShipEvent & { readonly kind: typeof FeedbackKind.Damage; readonly amount: number })
  | (ShipEvent & { readonly kind: typeof FeedbackKind.Sunk; readonly angle: number; readonly visual: ShipVisualProfile })
  | { readonly kind: typeof FeedbackKind.Score; readonly shipId: number; readonly point: Point; readonly points: number }
  | { readonly kind: typeof FeedbackKind.Contact; readonly contact: CollisionContact; readonly playerId: number }
  | { readonly kind: typeof FeedbackKind.ProjectileImpact; readonly point: Point; readonly impact: ImpactKind };
