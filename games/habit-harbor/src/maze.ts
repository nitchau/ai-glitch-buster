// Pure maze model — ported verbatim from legacy/GAME/screens/habit-harbor-maze.js.
// No Phaser imports: this is the testable core (buildMaze / isWall / reachableCells
// / validateSolvable). The LAYOUT is the exact 15×9 grid from the shipped game.

import { COLS, ROWS } from './constants';

// '#' wall · '.' water (passable) · 'S' spawn · 'E' exit
// '1'-'5' helper-bots · 'a'-'e' gates (bot N opens the Nth gate)
export const LAYOUT: readonly string[] = [
  '###############',
  '#S..1...a...2.#',
  '#############.#',
  '#..c..3....b..#',
  '#.#############',
  '#...4...d..5.e#',
  '#############.#',
  '#############E#',
  '###############',
];

export const BOT_IDS = ['1', '2', '3', '4', '5'] as const;
export const GATE_IDS = ['a', 'b', 'c', 'd', 'e'] as const;

export type Coord = { c: number; r: number };
export type Bot = { id: string; c: number; r: number; gate: string; rescued: boolean };
export type Gate = { id: string; c: number; r: number; openedBy: string };
export type OpenGates = Record<string, boolean>;
export type MazeModel = {
  grid: string[][];
  spawn: Coord;
  exit: Coord;
  bots: Bot[];
  gates: Gate[];
  cols: number;
  rows: number;
};

// Parse the LAYOUT into a structured model (bots/gates extracted, spawn/exit located).
export function buildMaze(): MazeModel {
  const grid: string[][] = [];
  let spawn: Coord | null = null;
  let exit: Coord | null = null;
  const bots: Bot[] = [];
  const gates: Gate[] = [];

  for (let r = 0; r < LAYOUT.length; r++) {
    const rowStr = LAYOUT[r] ?? '';
    const rowArr: string[] = [];
    for (let c = 0; c < rowStr.length; c++) {
      const ch = rowStr.charAt(c);
      rowArr.push(ch);
      if (ch === 'S') spawn = { c, r };
      else if (ch === 'E') exit = { c, r };
      else {
        const bi = (BOT_IDS as readonly string[]).indexOf(ch);
        const gi = (GATE_IDS as readonly string[]).indexOf(ch);
        if (bi >= 0) bots.push({ id: ch, c, r, gate: GATE_IDS[bi] ?? '', rescued: false });
        else if (gi >= 0) gates.push({ id: ch, c, r, openedBy: BOT_IDS[gi] ?? '' });
      }
    }
    grid.push(rowArr);
  }

  if (!spawn) throw new Error('maze LAYOUT is missing a spawn cell (S)');
  if (!exit) throw new Error('maze LAYOUT is missing an exit cell (E)');
  return { grid, spawn, exit, bots, gates, cols: COLS, rows: ROWS };
}

// Char at a cell; out-of-bounds reads as solid wall (legacy cellChar).
export function cellChar(m: MazeModel, c: number, r: number): string {
  if (r < 0 || r >= m.rows || c < 0 || c >= m.cols) return '#';
  return m.grid[r]?.[c] ?? '#';
}

function isGateOpen(open: OpenGates, id: string): boolean {
  return open[id] === true;
}

// A cell blocks the boat if it's a wall, or a gate that hasn't been opened yet.
export function isWall(m: MazeModel, c: number, r: number, open: OpenGates): boolean {
  const ch = cellChar(m, c, r);
  if (ch === '#') return true;
  if ((GATE_IDS as readonly string[]).includes(ch)) return !isGateOpen(open, ch);
  return false;
}

// BFS flood-fill of every cell reachable from spawn given the currently-open gates.
// Keys are "c,r" strings (legacy reachableCells).
export function reachableCells(m: MazeModel, open: OpenGates): Set<string> {
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
      if (isWall(m, nc, nr, open)) continue;
      seen.add(key);
      queue.push({ c: nc, r: nr });
    }
  }
  return seen;
}

// Is the maze winnable? Repeatedly rescue every currently-reachable bot (opening its
// gate), until no more progress; then require all bots rescued AND the exit reachable.
export function validateSolvable(m: MazeModel): boolean {
  const open: OpenGates = {};
  const rescued: Record<string, boolean> = {};
  let progressed = true;
  while (progressed) {
    progressed = false;
    const reach = reachableCells(m, open);
    for (const b of m.bots) {
      if (rescued[b.id]) continue;
      if (reach.has(`${b.c},${b.r}`)) {
        rescued[b.id] = true;
        open[b.gate] = true;
        progressed = true;
      }
    }
  }
  if (m.bots.some((b) => !rescued[b.id])) return false;
  return reachableCells(m, open).has(`${m.exit.c},${m.exit.r}`);
}
