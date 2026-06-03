import { describe, it, expect } from 'vitest';
import { timeToStars } from '../../src/scoring';

describe('timeToStars', () => {
  // <=90s gold (3), <=120s silver (2), else bronze (1) — boundaries matter.
  it.each([
    [0, 3],
    [30, 3],
    [90, 3],
    [91, 2],
    [120, 2],
    [121, 1],
    [300, 1],
  ])('%i seconds → %i stars', (seconds, stars) => {
    expect(timeToStars(seconds)).toBe(stars);
  });
});
