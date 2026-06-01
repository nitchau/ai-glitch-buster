// Bias Breaker v13.3 constants — ported verbatim from
// legacy/GAME/screens/bias-breaker.js:24-62, with per-second conversions for
// Phaser Arcade Physics (vanilla used per-frame at 60fps).
//
// CONVENTION: NAME_PER_S = NAME * 60   for velocities
//             NAME_PER_S = NAME * 60*60 for accelerations
// Keep both versions when both are useful.

// Canvas
export const CANVAS_W = 1800;
export const CANVAS_H = 780;

// Physics (vanilla per-frame values from legacy lines 26-29)
export const GRAVITY = 0.65;           // px/frame^2
export const JUMP_SPEED = -13;         // px/frame (negative = up)
export const WALK_SPEED = 3.5;         // px/frame
export const FRICTION = 0.82;

// Phaser-friendly per-second equivalents (Arcade Physics uses px/s and px/s^2)
export const GRAVITY_PER_S = GRAVITY * 60 * 60;       // 2340 px/s^2
export const JUMP_SPEED_PER_S = JUMP_SPEED * 60;      // -780 px/s
export const WALK_SPEED_PER_S = WALK_SPEED * 60;      // 210 px/s

// Player
export const PLAYER_W = 50;
export const PLAYER_H = 100;

// Platforms
export const SOLID_Y = 620;
export const SOLID_W = 340;
export const SOLID_H = 30;
export const SECTION_SPACING = 770;

// Flyers
// Drift advances on the per-FRAME clock (animFrame), matching the vanilla rAF
// loop. (An earlier port keyed this off elapsed seconds, which ran ~60x too
// slow — clouds crawled.) Slightly brisker than the legacy 0.008 so a reachable
// cloud comes around without a long wait.
export const FLYER_DRIFT_SPEED = 0.012;
export const FLYER_Y_TOP = 240;
export const FLYER_Y_STEP = 90;
export const FLYER_TYPES = ['cloud', 'bird', 'kite', 'helicopter', 'quadcopter'] as const;
export type FlyerType = (typeof FLYER_TYPES)[number];
export const ANSWER_COLORS = ['#43e97b', '#f5576c', '#ffd166', '#8b5cf6'] as const;

// Dwell-to-confirm (frames at 60fps). The circular ring above the player fills
// over this many frames while they stand still on an answer cloud.
export const COMMIT_FRAMES = 120;  // 2s
export const CRASH_FRAMES = 120;   // 2s anti-camp

// Lava
export const LAVA_Y = CANVAS_H - 70;

// Tortoise (v13.1 slowed)
export const TORTOISE_W = 56;
export const TORTOISE_H = 38;
export const TORTOISE_SPEED = 1.0;             // px/frame
export const TORTOISE_SPEED_PER_S = TORTOISE_SPEED * 60;
export const TORTOISE_FIRST_DELAY = 180;       // ~3s
export const TORTOISE_RESPAWN_MIN = 360;       // ~6s
export const TORTOISE_RESPAWN_MAX = 600;       // ~10s
export const TORTOISE_STOMP_POINTS = 20;
export const TORTOISE_DEATH_FRAMES = 50;

// Time-based stars (v13.3)
export const STAR_TIME_GOLD = 90;     // <= 90s
export const STAR_TIME_SILVER = 120;  // 91-120s; else 1 star
