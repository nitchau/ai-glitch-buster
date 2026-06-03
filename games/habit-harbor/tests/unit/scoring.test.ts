import { describe, it, expect } from 'vitest';
import { timeToStars } from '../../src/scoring';

describe('timeToStars', () => {
  it('awards 3 stars at or under the gold tier (<=90s)', () => {
    expect(timeToStars(0)).toBe(3);
    expect(timeToStars(45)).toBe(3);
    expect(timeToStars(90)).toBe(3);
  });

  it('awards 2 stars between gold and silver (91-120s)', () => {
    expect(timeToStars(91)).toBe(2);
    expect(timeToStars(120)).toBe(2);
  });

  it('awards 1 star past the silver tier (>120s)', () => {
    expect(timeToStars(121)).toBe(1);
    expect(timeToStars(999)).toBe(1);
  });
});
