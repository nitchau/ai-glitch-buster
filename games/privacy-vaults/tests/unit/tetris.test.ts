import { describe, it, expect } from 'vitest';
import {
  COLS,
  ROWS,
  PIECE_IDS,
  emptyGrid,
  spawn,
  cells,
  collides,
  merge,
  clearLines,
  move,
  rotate,
  dropPosition,
  SevenBag,
} from '../../src/tetris';

describe('spawn', () => {
  it('centres a tetromino at the top, fully visible (4 cells, top row at 0)', () => {
    const t = spawn('T');
    expect(cells(t).length).toBe(4);
    expect(Math.min(...cells(t).map((p) => p.r))).toBe(0);
  });
  it('spawns the I-piece as a horizontal bar of 4 across one row', () => {
    const i = spawn('I');
    expect(cells(i).length).toBe(4);
    expect(new Set(cells(i).map((p) => p.r)).size).toBe(1);
  });
});

describe('collides', () => {
  const g = emptyGrid();
  it('detects the floor and the side walls', () => {
    expect(collides(g, { ...spawn('O'), y: ROWS })).toBe(true); // below the floor
    expect(collides(g, { ...spawn('O'), x: -1 })).toBe(true); // past the left wall
    expect(collides(g, { ...spawn('O'), x: COLS })).toBe(true); // past the right wall
  });
  it('allows a legal piece on an empty board', () => {
    expect(collides(g, spawn('T'))).toBe(false);
  });
  it('detects an overlap with a filled cell', () => {
    const o = spawn('O');
    expect(collides(merge(g, o), o)).toBe(true);
  });
});

describe('clearLines', () => {
  it('removes one full row and drops the block above into it', () => {
    const g = emptyGrid();
    g[ROWS - 1] = new Array<number>(COLS).fill(3); // full bottom row
    g[ROWS - 2]![0] = 5; // a lone block one row up
    const { grid, cleared } = clearLines(g);
    expect(cleared).toBe(1);
    expect(grid[ROWS - 1]![0]).toBe(5); // the lone block fell to the bottom
    expect(grid[ROWS - 1]!.slice(1).every((v) => v === 0)).toBe(true);
  });
  it('does not clear a row with a gap', () => {
    const g = emptyGrid();
    g[ROWS - 1] = new Array<number>(COLS).fill(2);
    g[ROWS - 1]![3] = 0; // gap -> not full
    expect(clearLines(g).cleared).toBe(0);
  });
  it('clears four rows at once (a tetris)', () => {
    const g = emptyGrid();
    for (let r = ROWS - 4; r < ROWS; r++) g[r] = new Array<number>(COLS).fill(1);
    expect(clearLines(g).cleared).toBe(4);
  });
});

describe('move & rotate', () => {
  const g = emptyGrid();
  it('move returns a piece when free and null when blocked', () => {
    const t = spawn('T');
    expect(move(g, t, 0, 1)).not.toBeNull();
    expect(move(g, t, -100, 0)).toBeNull();
  });
  it('rotate wall-kicks off the right wall and stays legal', () => {
    let i = spawn('I');
    for (;;) {
      const n = move(g, i, 1, 0); // shove to the right edge
      if (!n) break;
      i = n;
    }
    const r = rotate(g, i, 1);
    expect(r).not.toBeNull();
    expect(collides(g, r!)).toBe(false);
  });
});

describe('dropPosition', () => {
  it('drops a piece to the floor on an empty board', () => {
    const landed = dropPosition(emptyGrid(), spawn('O'));
    expect(Math.max(...cells(landed).map((p) => p.r))).toBe(ROWS - 1);
  });
});

describe('SevenBag', () => {
  it('yields all seven pieces before any repeat', () => {
    const bag = new SevenBag(() => 0.42); // deterministic RNG
    const seen = new Set<string>();
    for (let i = 0; i < 7; i++) seen.add(bag.next());
    expect(seen.size).toBe(7);
    expect([...seen].sort()).toEqual([...PIECE_IDS].sort());
  });
});
