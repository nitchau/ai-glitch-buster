// Bad-Habit Harbor constants — ported from legacy/GAME/screens/habit-harbor*.js.
// Top-down maze with MANUAL grid movement (no Arcade physics). Keeps the vanilla
// per-frame speed plus a per-second conversion for frame-rate-independent motion.

export const COLS = 15;
export const ROWS = 9;
export const CELL = 64;
export const CANVAS_W = COLS * CELL; // 960
export const CANVAS_H = ROWS * CELL; // 576

// Boat
export const BOAT_SPEED = 3; // px/frame at 60fps (legacy habit-harbor.js:111)
export const BOAT_SPEED_PER_S = BOAT_SPEED * 60; // 180 px/s — move by this * delta/1000
export const BOAT_R = CELL * 0.3; // collision radius (< half a corridor, so 1-cell channels fit)

// Bots
export const RESCUE_TOTAL = 5;
export const BOT_HIT = CELL * 0.6; // drive-into-bot radius (legacy 242)

// Time-based stars (same tiers as Bias Breaker)
export const STAR_TIME_GOLD = 90; // <= 90s → 3
export const STAR_TIME_SILVER = 120; // <= 120s → 2; else 1

// Text render-resolution multiplier. The 960×576 canvas is FIT-scaled UP to the
// window (and again by devicePixelRatio on HiDPI), which softens text. Rendering
// glyphs at this multiple keeps them crisp. Guarded for the jsdom test env.
const DPR = typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1;
export const TEXT_RES = Math.max(2, Math.min(3, Math.ceil(DPR * 1.75)));

// Palette (hex, from the vanilla canvas render)
export const COLOR = {
  waterTop: 0x0c3a4a,
  waterBot: 0x0a2738,
  ripple: 0x78dce6,
  dockTop: 0x7c5734,
  dockBot: 0x5a3f24,
  dockSeam: 0x281a0c,
  dockRimLight: 0xffe4aa,
  dockRimDark: 0x120b05,
  gateBody: 0x1a1a22,
  gateStripe: 0xffce3a,
  gatePost: 0x785a32,
  exit: 0x43e97b,
  botBad: 0xe7402f,
  botGood: 0x43e97b,
  botAntennaDot: 0xffce3a,
  boatHull: 0x9c6633,
  boatHullDark: 0x46290f,
  boatDeck: 0xceac74,
  boatSeat: 0x8a5a2b,
  kidShirt: 0x43e97b,
  kidHair: 0xe3a86b,
  kidFace: 0xfce8b8,
  oar: 0x7a4f25,
  oarBlade: 0xcaa06a,
  ink: 0x0a2738,
} as const;
