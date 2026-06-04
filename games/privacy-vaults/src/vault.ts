// Pure vault model for Privacy Vault — no Phaser imports (testable core), in the
// spirit of habit-harbor's maze.ts. Adds lineOfSightClear: the raycast that both
// the patrol detection and the occluded vision-cone render share.
//
// '#' wall/cover · '.' floor · 'S' entry · 'E' exit door · 'L' data leak.

import { COLS, ROWS, CELL } from './constants';

export const LAYOUT: readonly string[] = [
  '###############',
  '#......E......#',
  '#.............#',
  '#..L...#...L..#',
  '#...#.....#...#',
  '#......#......#',
  '#...#.....#...#',
  '#..L...#...L..#',
  '#.............#',
  '#......S......#',
  '###############',
];

export type Coord = { c: number; r: number };
export type Leak = { c: number; r: number; sealed: boolean };
export type Patrol = { waypoints: Coord[]; speed: number; sweep: boolean };
export type VaultModel = {
  grid: string[][];
  spawn: Coord;
  exit: Coord;
  leaks: Leak[];
  cols: number;
  rows: number;
};

// Patrol routes (each bot loops its waypoints). Lanes lie on clear floor so a
// bot never tries to walk through a wall. `sweep` = pause + rotate at waypoints.
export const PATROLS: readonly Patrol[] = [
  { waypoints: [{ c: 2, r: 2 }, { c: 12, r: 2 }], speed: 92, sweep: true }, // top lane
  { waypoints: [{ c: 12, r: 8 }, { c: 2, r: 8 }], speed: 92, sweep: true }, // bottom lane
  { waypoints: [{ c: 12, r: 3 }, { c: 12, r: 7 }], speed: 80, sweep: false }, // right column
];

export function buildVault(): VaultModel {
  const grid: string[][] = [];
  let spawn: Coord | null = null;
  let exit: Coord | null = null;
  const leaks: Leak[] = [];
  for (let r = 0; r < LAYOUT.length; r++) {
    const rowStr = LAYOUT[r] ?? '';
    const rowArr: string[] = [];
    for (let c = 0; c < rowStr.length; c++) {
      const ch = rowStr.charAt(c);
      rowArr.push(ch);
      if (ch === 'S') spawn = { c, r };
      else if (ch === 'E') exit = { c, r };
      else if (ch === 'L') leaks.push({ c, r, sealed: false });
    }
    grid.push(rowArr);
  }
  if (!spawn) throw new Error('vault LAYOUT is missing an entry cell (S)');
  if (!exit) throw new Error('vault LAYOUT is missing an exit cell (E)');
  return { grid, spawn, exit, leaks, cols: COLS, rows: ROWS };
}

// Char at a cell; out-of-bounds reads as solid wall.
export function cellChar(m: VaultModel, c: number, r: number): string {
  if (r < 0 || r >= m.rows || c < 0 || c >= m.cols) return '#';
  return m.grid[r]?.[c] ?? '#';
}

// Only '#' blocks movement; floor / entry / exit / leak cells are all walkable.
export function isWall(m: VaultModel, c: number, r: number): boolean {
  return cellChar(m, c, r) === '#';
}

// Is the straight segment (x0,y0)->(x1,y1) free of walls? Samples the line at a
// fine step (CELL/4), skipping the two endpoint cells (the bot's + target's own
// cell). Used for BOTH patrol detection and the occluded cone render, so the
// flashlight that "stops at a wall" exactly matches what the bot can see.
export function lineOfSightClear(
  m: VaultModel,
  x0: number,
  y0: number,
  x1: number,
  y1: number
): boolean {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / (CELL / 4)));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = x0 + dx * t;
    const y = y0 + dy * t;
    if (isWall(m, Math.floor(x / CELL), Math.floor(y / CELL))) return false;
  }
  return true;
}

// BFS flood of every floor cell reachable from spawn (keys "c,r").
export function reachableCells(m: VaultModel): Set<string> {
  const seen = new Set<string>();
  const start = m.spawn;
  const queue: Coord[] = [start];
  seen.add(`${start.c},${start.r}`);
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ] as const;
  while (queue.length) {
    const cur = queue.shift() as Coord;
    for (const [dc, dr] of dirs) {
      const nc = cur.c + dc;
      const nr = cur.r + dr;
      const key = `${nc},${nr}`;
      if (seen.has(key)) continue;
      if (isWall(m, nc, nr)) continue;
      seen.add(key);
      queue.push({ c: nc, r: nr });
    }
  }
  return seen;
}

// Solvable = every leak and the exit are reachable on foot from the entry.
export function validateLayout(m: VaultModel): boolean {
  const reach = reachableCells(m);
  if (!reach.has(`${m.exit.c},${m.exit.r}`)) return false;
  return m.leaks.every((l) => reach.has(`${l.c},${l.r}`));
}
