// Privacy Vault = an old-school Tetris. Clean-modern look: a light board, soft
// drop-shadows, rounded pastel tiles. The grid model (COLS/ROWS) lives in tetris.ts;
// here we own the on-screen layout, timing, palette, and the RENDER_SCALE supersample
// + TEXT_RES crisp-text pattern shared across the islands.

import { COLS, ROWS } from './tetris';

// --- layout (logical px; the backing store is RENDER_SCALE× this) -------------
export const CELL = 32;
export const BOARD_W = COLS * CELL; // 320
export const BOARD_H = ROWS * CELL; // 640
export const PAD = 28; // outer margin
export const RAIL_W = 172; // right-hand info/controls rail

export const BOARD_X = PAD; // board top-left
export const BOARD_Y = PAD;
export const RAIL_X = PAD + BOARD_W + PAD; // 376

export const CANVAS_W = PAD + BOARD_W + PAD + RAIL_W + PAD; // 576
export const CANVAS_H = PAD + BOARD_H + PAD; // 696

// Supersample: backing store is RENDER_SCALE× the logical size; the camera zooms to
// match so vector shapes (not just text) stay crisp when FIT-scaled to the screen.
export const RENDER_SCALE = 2;

// --- rules --------------------------------------------------------------------
export const LINES_TO_WIN = 8;

// --- timing (ms) --------------------------------------------------------------
export const GRAVITY_MS = 700; // normal fall (one cell) when the piece is unlocked
export const LOCKED_GRAVITY_MS = 1100; // slow drift while locked, waiting for an answer [Milestone B]
export const SOFT_DROP_MS = 45; // fall speed while holding Down
export const LOCK_DELAY_MS = 420; // grace once a piece can no longer fall
export const DAS_MS = 150; // delay before a held Left/Right auto-repeats
export const ARR_MS = 50; // auto-repeat interval thereafter

// --- time-based stars (same tiers as the other islands) -----------------------
export const STAR_TIME_GOLD = 90;
export const STAR_TIME_SILVER = 120;

// Text render-resolution multiplier (DPR-aware; guarded for jsdom tests).
const DPR = typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1;
export const TEXT_RES = Math.max(2, Math.min(3, Math.ceil(DPR * 1.75)));

// --- palette: clean modern (light + soft) -------------------------------------
export const COLOR = {
  pageTop: 0xeef2fb,
  pageBottom: 0xdfe6f4,
  boardPanel: 0xf7f9ff,
  boardInner: 0xeef2fb,
  boardShadow: 0xc4cee4,
  grid: 0xe5ebf7,
  rail: 0xffffff,
  railEdge: 0xe2e8f5,
  textDark: 0x3b456a,
  textMute: 0x8b96b4,
  accent: 0x6f8cff, // progress bar / highlights
  ghostEdge: 0x9aa6c6,
} as const;

// Tetromino tile colours, indexed by the grid colour id (1..7); index 0 is a neutral
// fallback. Each is { fill, edge (shadow), light (top highlight) } for the 3-pass tile.
export type TileColor = { fill: number; edge: number; light: number };
export const PIECE_COLORS: TileColor[] = [
  { fill: 0xb8c0d8, edge: 0x95a0bd, light: 0xd6dcec }, // 0 fallback grey
  { fill: 0x7ecbd6, edge: 0x4f9aa6, light: 0xa9e2ea }, // 1 I  cyan
  { fill: 0xf2cf6b, edge: 0xcaa53e, light: 0xfbe6a2 }, // 2 O  butter
  { fill: 0xb69ae0, edge: 0x8c6dc0, light: 0xd6c4f0 }, // 3 T  lilac
  { fill: 0x8fcf9b, edge: 0x63ab70, light: 0xb8e4bf }, // 4 S  mint
  { fill: 0xef9a9a, edge: 0xc96f6f, light: 0xf8c4c4 }, // 5 Z  coral
  { fill: 0x8aa9e6, edge: 0x5f80c6, light: 0xb3c8f2 }, // 6 J  sky
  { fill: 0xf0b27a, edge: 0xc8854d, light: 0xf8d2ad }, // 7 L  peach
];
