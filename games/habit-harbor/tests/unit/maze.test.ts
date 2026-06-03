import { describe, it, expect } from 'vitest';
import {
  buildMaze,
  isWall,
  cellChar,
  reachableCells,
  validateSolvable,
  BOT_IDS,
  GATE_IDS,
} from '../../src/maze';

describe('buildMaze', () => {
  it('parses a 15×9 grid with spawn, exit, 5 bots and 5 gates', () => {
    const m = buildMaze();
    expect(m.cols).toBe(15);
    expect(m.rows).toBe(9);
    expect(m.spawn).toEqual({ c: 1, r: 1 });
    expect(m.exit).toEqual({ c: 13, r: 7 });
    expect(m.bots.length).toBe(5);
    expect(m.gates.length).toBe(5);
  });

  it('maps bot N to the Nth gate (1→a, 2→b, …, 5→e)', () => {
    const m = buildMaze();
    for (const b of m.bots) {
      const i = (BOT_IDS as readonly string[]).indexOf(b.id);
      expect(b.gate).toBe(GATE_IDS[i]);
    }
    for (const g of m.gates) {
      const i = (GATE_IDS as readonly string[]).indexOf(g.id);
      expect(g.openedBy).toBe(BOT_IDS[i]);
    }
  });
});

describe('cellChar / isWall', () => {
  const m = buildMaze();

  it('reads out-of-bounds as solid wall', () => {
    expect(cellChar(m, -1, 0)).toBe('#');
    expect(cellChar(m, 99, 99)).toBe('#');
    expect(cellChar(m, 1, 1)).toBe('S');
  });

  it('treats walls as solid and water as open', () => {
    expect(isWall(m, 0, 0, {})).toBe(true); // border wall
    expect(isWall(m, 1, 1, {})).toBe(false); // spawn (water)
  });

  it('treats a gate as solid until its bot is rescued', () => {
    // gate 'a' lives at column 8, row 1
    expect(cellChar(m, 8, 1)).toBe('a');
    expect(isWall(m, 8, 1, {})).toBe(true);
    expect(isWall(m, 8, 1, { a: true })).toBe(false);
  });
});

describe('reachableCells', () => {
  const m = buildMaze();

  it('cannot reach the exit while gates are shut, but can once all open', () => {
    const exitKey = `${m.exit.c},${m.exit.r}`;
    expect(reachableCells(m, {}).has(exitKey)).toBe(false);
    const allOpen = { a: true, b: true, c: true, d: true, e: true };
    expect(reachableCells(m, allOpen).has(exitKey)).toBe(true);
  });
});

describe('validateSolvable', () => {
  it('confirms the shipped layout is winnable via the rescue chain', () => {
    expect(validateSolvable(buildMaze())).toBe(true);
  });
});
