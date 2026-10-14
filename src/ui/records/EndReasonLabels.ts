import { EndReason } from '../../game/contracts/GameDomain';

/** Player-facing end reasons shared by the result screen and Match History. */
export const EndReasonLabels: Readonly<Record<EndReason, string>> = Object.freeze({
  [EndReason.Time]: 'Time expired',
  [EndReason.Death]: 'Ship destroyed',
});
