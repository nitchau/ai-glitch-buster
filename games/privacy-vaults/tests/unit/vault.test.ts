import { describe, it, expect } from 'vitest';
import { buildVault, isWall, lineOfSightClear, validateLayout } from '../../src/vault';

describe('buildVault', () => {
  it('parses a 15×11 vault with entry, exit and 4 leaks', () => {
    const m = buildVault();
    expect(m.cols).toBe(15);
    expect(m.rows).toBe(11);
    expect(m.spawn).toEqual({ c: 7, r: 9 });
    expect(m.exit).toEqual({ c: 7, r: 1 });
    expect(m.leaks.length).toBe(4);
    expect(m.leaks.every((l) => !l.sealed)).toBe(true);
  });
});

describe('isWall', () => {
  const m = buildVault();
  it('blocks walls/cover, allows floor/entry/exit/leak', () => {
    expect(isWall(m, 0, 0)).toBe(true); // border
    expect(isWall(m, 7, 3)).toBe(true); // a centre pillar (cover)
    expect(isWall(m, 7, 9)).toBe(false); // entry (walkable)
    expect(isWall(m, 7, 1)).toBe(false); // exit (walkable)
    expect(isWall(m, 3, 3)).toBe(false); // a leak (walkable)
  });
  it('reads out-of-bounds as solid', () => {
    expect(isWall(m, -1, 5)).toBe(true);
    expect(isWall(m, 99, 99)).toBe(true);
  });
});

describe('lineOfSightClear (the hide-behind-cover raycast)', () => {
  const m = buildVault();
  it('is clear along an open corridor', () => {
    // row 2 is all floor: from cell (2,2) centre to (12,2) centre
    expect(lineOfSightClear(m, 2 * 64 + 32, 2 * 64 + 32, 12 * 64 + 32, 2 * 64 + 32)).toBe(true);
  });
  it('is blocked when a wall/pillar sits on the line', () => {
    // straight up the centre column (x=480) from the entry to the exit crosses the
    // col-7 pillars (rows 3/5/7) → occluded.
    expect(lineOfSightClear(m, 7 * 64 + 32, 9 * 64 + 32, 7 * 64 + 32, 1 * 64 + 32)).toBe(false);
  });
});

describe('validateLayout', () => {
  it('confirms every leak and the exit are reachable from the entry', () => {
    expect(validateLayout(buildVault())).toBe(true);
  });
});
