// Privacy Vault constants. A top-down stealth room (manual movement, no Arcade
// physics) reusing the Bad-Habit Harbor engine. Per-second speeds for
// frame-rate-independent motion; RENDER_SCALE supersample + TEXT_RES for crisp
// rendering (same pattern as habit-harbor).

export const COLS = 15;
export const ROWS = 11;
export const CELL = 64;
export const CANVAS_W = COLS * CELL; // 960 (logical world width)
export const CANVAS_H = ROWS * CELL; // 704 (logical world height)

// Supersample: backing store is RENDER_SCALE× the logical size; the camera zooms
// to match so vector shapes (not just text) stay crisp when FIT-scaled.
export const RENDER_SCALE = 2;

// Guardian (the sneaking hero)
export const GUARDIAN_SPEED = 3.2; // px/frame @60fps
export const GUARDIAN_SPEED_PER_S = GUARDIAN_SPEED * 60; // 192 px/s
export const GUARDIAN_R = CELL * 0.3; // collision radius

// Leaks (the quiz targets)
export const SEAL_TOTAL = 4;
export const LEAK_HIT = CELL * 0.6; // walk-into radius

// Patrol-bot vision cones
export const CONE_HALF = 0.56; // ~32° half-angle (radians)
export const CONE_RANGE = CELL * 4.2; // how far the flashlight reaches
export const CONE_RAYS = 26; // rays across the cone for the occluded render

// Time-based stars (same tiers as the other islands)
export const STAR_TIME_GOLD = 90;
export const STAR_TIME_SILVER = 120;

// Text render-resolution multiplier (DPR-aware; guarded for jsdom tests).
const DPR = typeof window !== 'undefined' && window.devicePixelRatio ? window.devicePixelRatio : 1;
export const TEXT_RES = Math.max(2, Math.min(3, Math.ceil(DPR * 1.75)));

// Palette — a dark steel data-vault.
export const COLOR = {
  floor: 0x121a30,
  floorAlt: 0x0e1626,
  grid: 0x24345c,
  wall: 0x2d3c68,
  wallTop: 0x3c4f86,
  wallDark: 0x161f3a,
  bolt: 0x55689c,
  leak: 0xff5168,
  leakGlow: 0xff8a9a,
  sealed: 0x43e97b,
  exit: 0x43e97b,
  exitClosed: 0x6b7aa8,
  entry: 0x38a8f9,
  cone: 0xffe14d,
  guardianCloak: 0x3aa0e6,
  guardianCloakDk: 0x1d6bb0,
  guardianHood: 0x9be0ff,
  skin: 0xfcd9a8,
  ink: 0x0a1226,
} as const;
