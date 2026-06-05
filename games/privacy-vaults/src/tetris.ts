// Pure, framework-free Tetris model for the Privacy Vault island. No Phaser here:
// just the board grid, the seven tetrominoes, gravity/collision, rotation (matrix
// rotate + a simple wall-kick), line clearing, and a 7-bag randomiser. Every export
// is a plain data transform (grid + piece -> grid|piece|bool), so the whole engine
// is unit-tested before a single pixel is drawn; GameScene is a thin renderer on top.

export const COLS = 10;
export const ROWS = 22;

export type PieceId = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
export const PIECE_IDS: PieceId[] = ['I', 'O', 'T', 'S', 'Z', 'J', 'L'];

// Colour id stored in the grid (1..7). 0 = empty. The render-side palette in
// constants.ts maps these ids to pastel fills.
export const COLOR_INDEX: Record<PieceId, number> = {
  I: 1,
  O: 2,
  T: 3,
  S: 4,
  Z: 5,
  J: 6,
  L: 7,
};

// Spawn-orientation matrices (1 = filled). Rotation is matrix rotation, so these
// are the SINGLE source of truth for each piece's shape across all four turns.
const SHAPES: Record<PieceId, number[][]> = {
  I: [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
    [0, 0, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
    [0, 0, 0],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
    [0, 0, 0],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
    [0, 0, 0],
  ],
};

export type Grid = number[][]; // ROWS x COLS; 0 empty, else colour id
export type Cell = { c: number; r: number };

export type Piece = {
  id: PieceId;
  matrix: number[][]; // current rotation (square)
  x: number; // grid column of matrix[0][0]
  y: number; // grid row of matrix[0][0]
};

export function emptyGrid(): Grid {
  return Array.from({ length: ROWS }, () => new Array<number>(COLS).fill(0));
}

// Rotate a square matrix 90deg clockwise: out[c][n-1-r] = m[r][c].
function rotateCW(m: number[][]): number[][] {
  const n = m.length;
  const out: number[][] = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let r = 0; r < n; r++) {
    const row = m[r]!;
    for (let c = 0; c < n; c++) {
      out[c]![n - 1 - r] = row[c]!;
    }
  }
  return out;
}

function rotateCCW(m: number[][]): number[][] {
  // three CW turns = one CCW turn (keeps a single tested primitive)
  return rotateCW(rotateCW(rotateCW(m)));
}

function minFilledRow(m: number[][]): number {
  for (let r = 0; r < m.length; r++) {
    if (m[r]!.some((v) => v === 1)) return r;
  }
  return 0;
}

/** A fresh piece centred at the top, fully visible (its top filled row at grid row 0). */
export function spawn(id: PieceId): Piece {
  const matrix = SHAPES[id].map((row) => row.slice());
  const w = matrix[0]!.length;
  const x = Math.floor((COLS - w) / 2);
  const y = -minFilledRow(matrix);
  return { id, matrix, x, y };
}

/** World cells occupied by the piece (filled matrix entries only). */
export function cells(p: Piece): Cell[] {
  const out: Cell[] = [];
  for (let r = 0; r < p.matrix.length; r++) {
    const row = p.matrix[r]!;
    for (let c = 0; c < row.length; c++) {
      if (row[c] === 1) out.push({ c: p.x + c, r: p.y + r });
    }
  }
  return out;
}

/** True if the piece is off the sides/bottom or overlaps a filled cell. Cells above
 *  the top (r < 0) are allowed, so a piece may sit/rotate partly above the board. */
export function collides(grid: Grid, p: Piece): boolean {
  for (const { c, r } of cells(p)) {
    if (c < 0 || c >= COLS || r >= ROWS) return true;
    if (r >= 0 && (grid[r]![c] ?? 0) !== 0) return true;
  }
  return false;
}

/** Lock the piece into a NEW grid (input is not mutated). */
export function merge(grid: Grid, p: Piece): Grid {
  const out = grid.map((row) => row.slice());
  const ci = COLOR_INDEX[p.id];
  for (const { c, r } of cells(p)) {
    if (r >= 0 && r < ROWS && c >= 0 && c < COLS) out[r]![c] = ci;
  }
  return out;
}

/** Remove full rows; return the new grid (fresh empty rows pushed on top) + count. */
export function clearLines(grid: Grid): { grid: Grid; cleared: number } {
  const kept = grid.filter((row) => row.some((v) => v === 0));
  const cleared = ROWS - kept.length;
  const out: Grid = [];
  for (let i = 0; i < cleared; i++) out.push(new Array<number>(COLS).fill(0));
  for (const row of kept) out.push(row);
  return { grid: out, cleared };
}

/** Move by (dx,dy); return the moved piece if legal, else null. */
export function move(grid: Grid, p: Piece, dx: number, dy: number): Piece | null {
  const next: Piece = { ...p, x: p.x + dx, y: p.y + dy };
  return collides(grid, next) ? null : next;
}

/** Rotate CW (dir=1) or CCW (dir=-1) with a simple horizontal wall-kick. */
export function rotate(grid: Grid, p: Piece, dir: 1 | -1): Piece | null {
  const matrix = dir === 1 ? rotateCW(p.matrix) : rotateCCW(p.matrix);
  for (const dx of [0, -1, 1, -2, 2]) {
    const next: Piece = { ...p, matrix, x: p.x + dx };
    if (!collides(grid, next)) return next;
  }
  return null;
}

/** Lowest legal position straight down (drives the ghost piece + hard drop). */
export function dropPosition(grid: Grid, p: Piece): Piece {
  let cur = p;
  for (;;) {
    const next = move(grid, cur, 0, 1);
    if (!next) return cur;
    cur = next;
  }
}

/** Standard 7-bag: each bag is a shuffled permutation of all seven pieces, so the
 *  player never suffers long droughts. RNG is injectable for deterministic tests. */
export class SevenBag {
  private bag: PieceId[] = [];
  constructor(private readonly rand: () => number = Math.random) {}

  next(): PieceId {
    if (this.bag.length === 0) {
      this.bag = PIECE_IDS.slice();
      for (let i = this.bag.length - 1; i > 0; i--) {
        const j = Math.floor(this.rand() * (i + 1));
        const tmp = this.bag[i]!;
        this.bag[i] = this.bag[j]!;
        this.bag[j] = tmp;
      }
    }
    return this.bag.pop()!;
  }
}
