// Time-based star rating for a completed harbor run. Extracted so it can be
// unit-tested directly; the win flow reads finalSeconds and the CelebrationScene
// renders these stars. Same tiers as Bias Breaker.

import { STAR_TIME_GOLD, STAR_TIME_SILVER } from './constants';

export type Stars = 1 | 2 | 3;

/** <= STAR_TIME_GOLD (90s) → 3, <= STAR_TIME_SILVER (120s) → 2, else → 1. */
export function timeToStars(seconds: number): Stars {
  if (seconds <= STAR_TIME_GOLD) return 3;
  if (seconds <= STAR_TIME_SILVER) return 2;
  return 1;
}
