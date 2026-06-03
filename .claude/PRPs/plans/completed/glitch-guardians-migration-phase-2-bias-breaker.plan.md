# Plan: Migration Phase 2 — Bias Breaker Rebuild (Phaser+TS+Vite)

## Summary
Port the entire vanilla Bias Breaker game (v13.3) from `legacy/GAME/screens/bias-breaker*.js`
into the `games/bias-breaker/` package as idiomatic Phaser 3 + TypeScript scenes.
Mechanic-for-mechanic parity (no redesign): scrolling stage with 5 platform sections,
parametric kid avatar, gravity + jumping physics, drifting answer-flyers + dwell-to-confirm,
carrier-flyer transition, lava fall + respawn, tortoise mini-enemy, time-based stars,
celebration, and `markIslandCleared('bias-breaker', stars)` unlocking Habit Harbor.

## User Story
As a kid who clicked **Bias Breaker** on the deployed game site, I want the same fairness
platformer I played in the vanilla version — run, jump, pick the right answer, ride the
flyer across, beat the level, see the stars — so I get the proven gameplay on the new
agentic stack with smoother visuals and a clean unlock chain to Habit Harbor.

## Problem → Solution
A `HelloScene` stub at `games/bias-breaker/` and 1900 lines of hand-rolled vanilla
canvas at `legacy/GAME/screens/bias-breaker.js` (the spec) →
A playable Phaser game at `games/bias-breaker/src/scenes/` with feature parity, green
Vitest + Playwright tests, and the shared profile SDK driving the unlock state.

## Metadata
- **Complexity**: XL (full game port; may take 2–3 `prp-implement` sessions to land all 5 milestones)
- **Source PRD**: `.claude/PRPs/prds/glitch-guardians-migration.prd.md`
- **PRD Phase**: Phase 2 — Bias Breaker rebuild
- **Estimated Files**: ~12 new under `games/bias-breaker/src/` + 1 modified (`@gg/shared/src/quizData.ts` — full bias bank port)
- **Confidence**: 7/10. The mechanics are well-understood and exhaustively documented in legacy code; the risk is Phaser-API specifics that can eat time without changing player-visible behavior.

---

## UX Design

### Before
```
games/bias-breaker/ at http://localhost:5173/
┌────────────────────────────────────────────┐
│  Dark navy background                       │
│       Hello Glitch Guardians!  (pulse)     │
└────────────────────────────────────────────┘
```

### After
```
games/bias-breaker/ at http://localhost:5173/  (mirrors legacy v13.3)
┌──────────────────────────────────────────────────────────────────┐
│ Section: 1/5    ⏱ 12s    ★ 0 pts                                 │
│ ┌───────────────────────────────────────────────┐               │
│ │  Why is it a problem if AI only recommends ... │   (banner)    │
│ └───────────────────────────────────────────────┘               │
│         ☁ Because it treats…  ☁ Because science…                │
│             ☁ Because girls…   ☁ Because AI is…                 │
│  🚪[entry]                                                       │
│  🧒(player)  ▄▄▄▄▄                       ▄▄▄▄▄                  │
│  🌋🌋🌋🌋🌋🌋🌋 LAVA 🌋🌋🌋🌋🌋🌋🌋  (below = respawn)         │
└──────────────────────────────────────────────────────────────────┘
Controls: A/D or ← → walk, Space/W/↑ jump, dwell 1.5s on a flyer to commit.
```

### Interaction Changes
| Touchpoint | Phase 1 | Phase 2 |
|---|---|---|
| Click game URL | Static "Hello" text | Playable Bias Breaker level |
| Keyboard | none | Arrows/WASD/Space |
| Persistence | none | `gg.activeIsland` + completion state via `@gg/shared` profile SDK |
| Win flow | n/a | Reach door → CelebrationScene → `markIslandCleared` → "Bad-Habit Harbor unlocked!" |

---

## Mandatory Reading

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 | `legacy/GAME/screens/bias-breaker.js` | all (~1900) | THE SPEC. Every mechanic must replicate this file's behavior. |
| P0 | `legacy/GAME/screens/bias-breaker-celebration.js` | all | Win screen behaviour to port |
| P0 | `legacy/GAME/screens/bias-breaker-questions.js` | all | The adapter pattern (already have `@gg/shared/quizData.ts`) |
| P0 | `index.html` | 1274–1875 | Full bias quiz bank (~60 questions) to port |
| P1 | `legacy/GAME/screens/bias-breaker-avatar.js` | all | SVG kid avatar — port as Phaser graphics |
| P1 | `legacy/GAME/glitch-guardians.css` | `.gg-bb-*` rules | Visual color palette |
| P0 | `games/_shared/src/profile.ts` | all | `markIslandCleared` is the unlock contract |
| P0 | `games/bias-breaker/src/main.ts` | all | Phaser.Game bootstrap to extend |
| P0 | `games/bias-breaker/vite.config.ts` | `__TEST_SEAM__` | Test seam already in place |

## External Documentation

| Topic | Source | Takeaway |
|---|---|---|
| Phaser Scene | https://newdocs.phaser.io/docs/3.80.0/Phaser.Scene | `init()/preload()/create()/update(time, delta)` |
| Arcade Physics | https://newdocs.phaser.io/docs/3.80.0/Phaser.Physics.Arcade | `setGravityY`, `setVelocityY`, `body.blocked.down` for ground |
| Scene transitions | https://newdocs.phaser.io/docs/3.80.0/Phaser.Scenes.ScenePlugin | `this.scene.start('X', { stars })` passes data |
| Tweens | https://newdocs.phaser.io/docs/3.80.0/Phaser.Tweens.TweenManager | For carrier-flyer + animations |
| Keyboard | https://newdocs.phaser.io/docs/3.80.0/Phaser.Input.Keyboard.KeyboardPlugin | `input.keyboard.addKeys('A,D,W,S,SPACE')` |
| Cameras | https://newdocs.phaser.io/docs/3.80.0/Phaser.Cameras.Scene2D.Camera | `startFollow(player)` for horizontal scroll |

---

## Patterns to Mirror

### LEVEL_LAYOUT (legacy bias-breaker.js:132–212)
```ts
// games/bias-breaker/src/level/buildLevel.ts
import type { Question } from '@gg/shared';
import { CANVAS_W, SOLID_W, SOLID_Y, SECTION_SPACING } from '../constants';

export type Solid = { x: number; y: number; w: number; h: number };
export type Flyer = {
  type: 'cloud' | 'bird' | 'kite' | 'helicopter' | 'quadcopter';
  travelLeft: number; travelRight: number;
  baseY: number; x: number; y: number; w: number; h: number;
  phase: number; driftSpeed: number; rowIndex: number;
  optionIndex: 0 | 1 | 2 | 3; optionText: string; isCorrect: boolean;
  state: 'live' | 'crashing' | 'gone'; carrying: boolean;
};
export type Section = { question: Question; solid: Solid; flyerType: Flyer['type']; flyers: Flyer[]; answered: boolean };
export type Level = {
  sections: Section[];
  finalSolid: Solid & { isFinish: true };
  door: { x: number; y: number; w: number; h: number; open: boolean };
  entryDoor: { x: number; y: number; w: number; h: number };
  firstSolidX: number; totalWidth: number;
};

export function buildLevel(questions: Question[]): Level { /* port of legacy lines 132–212 */ }
```

### PLAYER_PHYSICS (legacy 1342–1364)
```ts
// games/bias-breaker/src/entities/Player.ts
create() {
  this.player = this.physics.add.sprite(spawnX, spawnY, 'player');
  this.player.setSize(PLAYER_W, PLAYER_H);
  this.player.body.setGravityY(GRAVITY_PER_S);   // constants module does the conversion
  this.player.setMaxVelocity(WALK_SPEED_PER_S, 900);
}

update() {
  const k = this.keys;
  if (k.left.isDown || k.A.isDown) this.player.setVelocityX(-WALK_SPEED_PER_S);
  else if (k.right.isDown || k.D.isDown) this.player.setVelocityX(WALK_SPEED_PER_S);
  else if (this.player.body.blocked.down) this.player.setVelocityX(this.player.body.velocity.x * FRICTION);

  const jump = k.SPACE.isDown || k.W.isDown || k.up.isDown;
  if (jump && this.player.body.blocked.down) this.player.setVelocityY(JUMP_SPEED_PER_S);
}
```

### FLYER_DRIFT (legacy 484–493)
```ts
// games/bias-breaker/src/entities/Flyer.ts
update(time: number) {
  if (this.state !== 'live') return;
  const t = (Math.sin(time * 0.001 * this.driftSpeed + this.phase) + 1) * 0.5;
  this.sprite.x = this.data.travelLeft + t * (this.data.travelRight - this.data.travelLeft);
  this.sprite.y = this.data.baseY + Math.cos(time * 0.001 * this.driftSpeed * 0.7 + this.phase) * 6;
}
```

### DWELL_TO_CONFIRM (legacy 544–565)
```ts
// games/bias-breaker/src/scenes/GameScene.ts
const COMMIT_TICKS = 90;   // ~1.5s at 60fps
update() {
  if (!this.onFlyer) { this.dwellTicks = 0; return; }
  const stillEnough = Math.abs(this.player.body.velocity.x) < WALK_SPEED_PER_S * 0.5
                   && Math.abs(this.player.body.velocity.y) < 1;
  if (stillEnough) {
    this.dwellTicks++;
    if (this.dwellTicks % 8 === 0 && this.dwellTicks < COMMIT_TICKS) this.sound.play('tick');
    if (this.dwellTicks >= COMMIT_TICKS) this.commitAnswer(this.onFlyer);
  } else {
    this.dwellTicks = Math.max(0, this.dwellTicks - 2);
  }
}
```

### CARRIER_FLYER (legacy 430–481, INCLUDING v13.3 snap-when-close fix)
```ts
// games/bias-breaker/src/entities/Flyer.ts
updateCarrier(player: Phaser.Physics.Arcade.Sprite, nextSolid: Solid) {
  const targetX = nextSolid.x + 30;
  const targetY = nextSolid.y;
  const remX = targetX - this.sprite.x;
  const remY = targetY - this.sprite.y;
  const dist = Math.hypot(remX, remY);
  // v13.3 SNAP-WHEN-CLOSE — avoids the exponential-lerp asymptote bug
  if (dist < 20) {
    this.sprite.x = targetX; this.sprite.y = targetY;
  } else {
    this.sprite.x += remX * 0.18;  // decay 0.18, not 0.06
    this.sprite.y += remY * 0.18;
  }
  player.setVelocity(0, 0);
  player.x = this.sprite.x + this.sprite.width / 2 - PLAYER_W / 2;
  player.y = this.sprite.y - PLAYER_H;
  if (Math.abs(this.sprite.x - targetX) < 4 && Math.abs(this.sprite.y - targetY) < 4) {
    this.arrive(player, nextSolid);
  }
}
```

### LAVA_RESPAWN (legacy 597–663, INCLUDING v13.2 NaN-free reset)
```ts
// games/bias-breaker/src/scenes/GameScene.ts
checkLava() {
  if (this.state.teleporting || this.state.doorEntered) return;
  if (this.player.y + PLAYER_H < LAVA_Y) return;
  if (this.player.body.blocked.down) return;
  this.state.teleporting = true;
  this.cameras.main.fadeOut(400, 0, 0, 0);
  this.time.delayedCall(400, () => {
    const sec = this.level.sections[this.state.currentSection];
    this.player.setPosition(sec.solid.x + 30, sec.solid.y - PLAYER_H);
    this.player.setVelocity(0, 0);
    // v13.2 FIX: clear state that NaN'd flyers in vanilla
    this.state.dwellTicks = 0;
    this.state.onFlyer = null;
    this.state.carryingFlyer = null;
    if (this.tortoise) this.tortoise.destroy();
    this.resetSection(this.state.currentSection);
    this.state.teleporting = false;
    this.cameras.main.fadeIn(200, 0, 0, 0);
  });
}
```

### HUD_PATTERN (legacy 381–396)
```ts
// games/bias-breaker/src/ui/Hud.ts
import Phaser from 'phaser';

export class Hud extends Phaser.GameObjects.Container {
  private sectionText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    super(scene, 16, 16);
    const style = { fontFamily: 'Arial', fontSize: '20px', color: '#cfeefe', backgroundColor: 'rgba(0,0,0,0.4)', padding: { x: 8, y: 6 } } as Phaser.Types.GameObjects.Text.TextStyle;
    this.sectionText = scene.add.text(0, 0, 'Section: 0/5', style).setScrollFactor(0);
    this.timerText = scene.add.text(0, 36, '⏱ 0s', { ...style, color: '#ffd700' }).setScrollFactor(0);
    this.scoreText = scene.add.text(0, 72, '★ 0 pts', { ...style, color: '#38f9d7' }).setScrollFactor(0);
    this.add([this.sectionText, this.timerText, this.scoreText]);
    scene.add.existing(this);
    this.setScrollFactor(0).setDepth(1000);
  }
  setSection(cur: number, total: number) { this.sectionText.setText(`Section: ${cur}/${total}`); }
  setTimer(s: number) { this.timerText.setText(`⏱ ${s}s`); }
  setScore(n: number) { this.scoreText.setText(`★ ${n} pts`); }
}
```

### SCENE_TRANSITION + MARK_CLEARED
```ts
// games/bias-breaker/src/scenes/GameScene.ts (win flow)
winLevel() {
  const finalSec = Math.floor(this.state.timeMs / 1000);
  const stars = finalSec <= 90 ? 3 : finalSec <= 120 ? 2 : 1;
  this.scene.start('CelebrationScene', { stars, time: finalSec, score: this.state.score });
}

// games/bias-breaker/src/scenes/CelebrationScene.ts
import { markIslandCleared } from '@gg/shared';
create(data: { stars: number; time: number; score: number }) {
  // ...render confetti, stars, score, time, banner "Bad-Habit Harbor unlocked!"
  const r = markIslandCleared('bias-breaker', data.stars);
  if (!r.ok) console.warn('Could not save profile:', r.reason);
}
```

### REFRESH_PERSIST + TEST_SEAM
```ts
// GameScene.create()
try { localStorage.setItem('gg.activeIsland', 'bias-breaker'); } catch { /* ignore */ }

// Test seam exposes scene state for Playwright
declare const __TEST_SEAM__: boolean;
if (__TEST_SEAM__) {
  (window as unknown as { __GAME_STATE__: () => unknown }).__GAME_STATE__ = () => ({
    section: this.state.currentSection,
    stars: this.state.lastStarsAwarded,
    timeMs: this.state.timeMs,
    score: this.state.score,
  });
}
```

---

## Files to Change

| File | Action | Justification |
|---|---|---|
| `games/_shared/src/quizData.ts` | UPDATE | Port full bias bank from `index.html:1274-1875` (~60 questions) |
| `games/_shared/tests/unit/quizData.test.ts` | UPDATE | Strengthen "bias bank ≥ 50" assertion (catches truncation) |
| `games/bias-breaker/src/constants.ts` | CREATE | All v13.3 constants with per-second conversions for Phaser |
| `games/bias-breaker/src/level/buildLevel.ts` | CREATE | Port of legacy `buildLevel()` |
| `games/bias-breaker/src/level/types.ts` | CREATE | `Level`, `Section`, `Solid`, `Flyer` types |
| `games/bias-breaker/src/scenes/PreloadScene.ts` | CREATE | Phaser asset preload — minimal |
| `games/bias-breaker/src/scenes/GameScene.ts` | CREATE | Main scene — player, flyers, physics, dwell, carrier, lava, tortoise, HUD, banner |
| `games/bias-breaker/src/scenes/CelebrationScene.ts` | CREATE | Win screen — stars, time, score, `markIslandCleared` |
| `games/bias-breaker/src/scenes/HelloScene.ts` | DELETE | Replaced by Game/Celebration |
| `games/bias-breaker/src/entities/Player.ts` | CREATE | Parametric kid + animation state |
| `games/bias-breaker/src/entities/Flyer.ts` | CREATE | Flyer drift, dwell-target, crash, carrier-snap |
| `games/bias-breaker/src/entities/Tortoise.ts` | CREATE | Walking enemy — stomp/bump |
| `games/bias-breaker/src/ui/Hud.ts` | CREATE | Section/timer/score container |
| `games/bias-breaker/src/ui/Banner.ts` | CREATE | Floating question/feedback banner |
| `games/bias-breaker/src/audio/sfx.ts` | CREATE (stub) | Synth SFX façade |
| `games/bias-breaker/src/main.ts` | UPDATE | Register Preload → Game → Celebration scenes |
| `games/bias-breaker/tests/unit/level.test.ts` | CREATE | `buildLevel` shape + flyer bounds |
| `games/bias-breaker/tests/unit/scoring.test.ts` | CREATE | time→stars logic |
| `games/bias-breaker/tests/e2e/happy-path.spec.ts` | CREATE | Full happy path |
| `games/bias-breaker/tests/e2e/hello.spec.ts` | DELETE | Replaced by happy-path |

## NOT Building (Phase 2)
- **Full sound effects** — synth SFX façade only; rich audio is a polish pass.
- **Pixel/raster art** — Phaser Graphics (vector shapes) only.
- **Mobile portrait layout** — desktop/landscape per PRD.
- **A separate boss fight** — vanilla dropped it; we don't reintroduce.
- **Habit Harbor or other islands** — their own phases.

---

## Step-by-Step Tasks

Organized into **5 milestones**. Each milestone is independently playable / testable; sessions can pause between them.

### Milestone A — Static world + player movement  ✅ DONE (commit `1b5f443`, Session 1)

**A1: Constants module**
- **ACTION**: Create `games/bias-breaker/src/constants.ts` with every v13.3 constant.
- **IMPLEMENT**: Copy values from `legacy/GAME/screens/bias-breaker.js:24-61` (and the tortoise + star constants at 44–55) verbatim. Add per-second conversions for Phaser Arcade Physics.
- **MIRROR**: legacy `bias-breaker.js:24-61`.
- **GOTCHA**: v13.3 constants are *per-frame at 60fps*. Phaser Arcade Physics uses *per-second*. So `GRAVITY = 0.65 px/frame²` becomes `GRAVITY_PER_S = 0.65 * 60 * 60 = 2340 px/s²` for `setGravityY`. Document the conversion inline.
- **VALIDATE**: `pnpm -F bias-breaker typecheck` — no errors.

**A2: Level types + `buildLevel`**
- **ACTION**: Create `games/bias-breaker/src/level/types.ts` and `buildLevel.ts`.
- **IMPLEMENT**: Port the level builder from `legacy/GAME/screens/bias-breaker.js:132-212` as a pure function. Input: `Question[]` (5 questions). Output: typed `Level`. Use LEVEL_LAYOUT pattern.
- **MIRROR**: LEVEL_LAYOUT.
- **GOTCHA**: Vanilla uses `Math.random()`. Keep that — same RNG semantics. Don't seed.
- **VALIDATE**: Vitest test (E1) covers this.

**A3: PreloadScene + Main wiring**
- **ACTION**: Create `PreloadScene.ts` and update `main.ts` for new scene array.
- **IMPLEMENT**: `PreloadScene.create()` just starts GameScene. Delete `HelloScene.ts`. Update `main.ts`: `scene: [PreloadScene, GameScene, CelebrationScene]`. Keep the `__TEST_SEAM__` block.
- **GOTCHA**: Order of scenes in the array matters — first one auto-starts.
- **VALIDATE**: `pnpm -F bias-breaker dev` — blank GameScene, no console errors.

**A4: GameScene — static world (platforms + lava + background)**
- **ACTION**: `GameScene.create()` builds level via `buildLevel`, renders platforms + final platform + lava + background.
- **IMPLEMENT**: Use `this.physics.add.staticGroup()` for platforms. For each `level.sections[i].solid`, add a `Phaser.GameObjects.Rectangle` styled greenish-blue (`#43e97b` family). Lava: rectangle at `LAVA_Y..CANVAS_H` colored orange. Sky: gradient via `this.add.graphics().fillGradientStyle(...)`.
- **MIRROR**: legacy `drawSolid`, `drawLava` (lines 920–977).
- **GOTCHA**: Phaser bodies are *centered* by default; use `setOrigin(0,0)` on rectangles for top-left semantics. Static bodies need `refreshBody()` after manual size/pos changes.
- **VALIDATE**: dev server shows 5 platforms + final platform + lava strip + door at expected positions.

**A5: Player + camera + keyboard**
- **ACTION**: Add parametric kid avatar, keyboard input, gravity, jumping, friction. Horizontal camera follow.
- **IMPLEMENT**: `entities/Player.ts` wraps `Phaser.Physics.Arcade.Sprite` with a procedurally-drawn texture. In `GameScene.create()`, instantiate Player at `level.sections[0].solid.x + 160, SOLID_Y - PLAYER_H`. `keys = scene.input.keyboard.addKeys('A,D,W,S,SPACE,LEFT,RIGHT,UP')`. In `update(t, dt)` apply PLAYER_PHYSICS. `this.cameras.main.startFollow(player, true, 0.12, 0)`.
- **MIRROR**: PLAYER_PHYSICS.
- **GOTCHA**: Phaser's `body.touching.down` is only true the frame of impact. Use `body.blocked.down` for "is grounded." Convert per-frame constants to per-second (A1 GOTCHA).
- **VALIDATE**: kid on platform 1, A/D moves, Space jumps with parabolic arc, friction slows on ground.

**MILESTONE A SUCCESS SIGNAL**: a kid stands on a platform and can run/jump. **STOP if pausing.**

---

### Milestone B — Question flow (flyers, dwell, carrier, banner)  ✅ DONE (commit `1b5f443`, Session 1)

**B1: Flyer entity + drift animation**
- **ACTION**: Create `entities/Flyer.ts`.
- **IMPLEMENT**: Class wrapping `Phaser.Physics.Arcade.Sprite`. Per-tick `update(time)` uses FLYER_DRIFT. Render shape per `flyerType` (cloud/bird/kite/helicopter/quadcopter).
- **MIRROR**: FLYER_DRIFT, legacy 419–495.
- **GOTCHA**: Flyers are sensors — player stands on top, doesn't get blocked horizontally. Set `checkCollision.up = true`, `down/left/right = false` for one-way-platform behavior.
- **VALIDATE**: 4 flyers drift between platforms 1 and 2 with sine motion.

**B2: Answer labels on flyers + question banner**
- **ACTION**: Build `Banner` showing the current section's question; per flyer attach a text label.
- **IMPLEMENT**: `ui/Banner.ts` — centered top text. Per flyer in section N, `scene.add.text(flyer.x, flyer.y - 28, flyer.optionText)`; reposition in flyer's `update`.
- **MIRROR**: legacy 408–415, 230–243, 1288–1306.
- **GOTCHA**: Don't forget `setOrigin(0.5)` so labels center over the flyer.
- **VALIDATE**: banner shows section-0 question; 4 flyers each carry a different answer label.

**B3: Dwell-to-confirm mechanic**
- **ACTION**: Detect player on flyer; count `dwellTicks` while still; commit at `COMMIT_TICKS`.
- **IMPLEMENT**: In `GameScene.update`, after physics, iterate live flyers of current section. If player overlaps a flyer (`physics.world.overlap`), set `state.onFlyer = flyer`. Apply DWELL_TO_CONFIRM. Reset `dwellTicks` when stepping off.
- **MIRROR**: DWELL_TO_CONFIRM, legacy 544–565.
- **GOTCHA**: "still enough" check needs BOTH axes (vx + vy near zero). Without vy check, jumping in place would commit.
- **VALIDATE**: Stand on a flyer ~1.5s → answer commits.

**B4: commitAnswer — correct → carrier flyer**
- **ACTION**: On correct flyer, mark `flyer.carrying = true`, crash siblings, transition to next platform via CARRIER_FLYER.
- **IMPLEMENT**: `commitAnswer(flyer)` in GameScene. If `flyer.isCorrect`: mark answered, `state.carryingFlyer = flyer`, crash siblings (set state='crashing'). Per frame while `carryingFlyer` set, run `Flyer.updateCarrier()` until arrival; then snap player to `nextSolid.x + 40, nextSolid.y - PLAYER_H`, `state.currentSection += 1`, `hud.setSection(...)`. At final section, open the door.
- **MIRROR**: CARRIER_FLYER, legacy 566–586, 430–481.
- **GOTCHA**: During carrier transit player must have ZERO velocity AND `setAllowGravity(false)` — otherwise gravity drags them off. **USE THE v13.3 SNAP FIX** (snap when dist < 20) — the lerp-only version had the 1.3s "floating in the air" bug.
- **VALIDATE**: Correct answer → flyer + player transition to next platform in ~0.5s.

**B5: commitAnswer — wrong → flyer crash + banner**
- **ACTION**: On wrong flyer, set `state = 'crashing'` for that flyer; player falls (handled by Milestone C); show wrong banner.
- **IMPLEMENT**: `crashFlyer(flyer, msg)` sets `flyer.state='crashing'`, tweens it falling, shows banner. Other flyers stay live.
- **MIRROR**: legacy 588–595.
- **GOTCHA**: Wrong answer must NOT advance the section. Player respawns at the SAME section via Milestone C's `checkLava`/`resetSection`.
- **VALIDATE**: Wrong answer → flyer falls, banner appears.

**MILESTONE B SUCCESS SIGNAL**: complete all 5 sections via correct answers. **STOP if pausing.**

---

### Milestone C — Hazards (lava + tortoise) + respawn  ✅ DONE (commit `e788ee2`, Session 2)

**C1: Lava fall + respawn**
- **ACTION**: When player crosses LAVA_Y while airborne, fade to black, respawn at current section, reset section flyers.
- **IMPLEMENT**: Per LAVA_RESPAWN. `checkLava()` from `update()`. Use `this.cameras.main.fadeOut/fadeIn`. `resetSection(currentSection)` rebuilds flyers (mirrors v13.2 fix — set `travelLeft`/`travelRight` to avoid NaN).
- **MIRROR**: LAVA_RESPAWN, legacy 597–663.
- **GOTCHA**: **USE THE v13.2 FIX** — when respawning, ALSO clear `dwellTicks`, `onFlyer`, `carryingFlyer`, and the tortoise. Without this, the player floats on a stale onFlyer reference or commits a leftover dwell counter.
- **VALIDATE**: Walk off platform 1 → fall → fade → respawn with flyers reset. No NaN flicker.

**C2: Tortoise enemy**
- **ACTION**: Tortoise walks on current section's solid; stomp from above kills it (+20 pts); side-bump nudges the player.
- **IMPLEMENT**: `entities/Tortoise.ts` — slow walker. `spawnTortoise()` on a timer (FIRST_DELAY first, then RESPAWN_MIN..MAX). `checkTortoiseCollision()` per frame: if player.vy > 0 AND playerBottom < tortoise.y + 22 → stomp (+20, kill, bounce); else side-bump.
- **MIRROR**: legacy 664–796.
- **GOTCHA**: TORTOISE_SPEED = 1.0 px/frame in legacy = 60 px/s in Phaser. Don't make it faster. Despawn when section advances.
- **VALIDATE**: ~3s after entering a platform, tortoise appears, walks across, stompable (+20 pts in HUD).

**C3: HUD wires + scoring state**
- **ACTION**: Wire `Hud` to game state — section, timer, score.
- **IMPLEMENT**: Create `ui/Hud.ts` per HUD_PATTERN. Update timer in scene's `update` (timeMs += dt; setTimer once per second). Increment score on tortoise stomp.
- **MIRROR**: HUD_PATTERN, legacy 381–396.
- **GOTCHA**: Pause the timer during carrier-flyer transit and during celebration.
- **VALIDATE**: HUD shows `Section: 1/5 ⏱ 12s ★ 20 pts` etc., updates each second.

**MILESTONE C SUCCESS SIGNAL**: hazards work, falls reset cleanly, tortoises stompable. **STOP if pausing.**

---

### Milestone D — Win + Celebration + Profile  ✅ DONE (commit `10494b6`, Session 2)

**D1: Final door + win detection**
- **ACTION**: When all 5 sections answered, open the door; on player-door overlap, trigger win.
- **IMPLEMENT**: In `update()`, when `state.currentSection >= 5`, mark `level.door.open = true` and show prompt. On overlap, set `state.doorEntered = true`, fade avatar, call `winLevel()` after 900ms.
- **MIRROR**: legacy 815–858.
- **GOTCHA**: `state.doorEntered` blocks further updates. Camera shouldn't follow the avatar's fade-out.
- **VALIDATE**: Reach final platform → walk into door → fade → ~1s → CelebrationScene.

**D2: CelebrationScene**
- **ACTION**: Win screen with stars, time, score, banner, Back-to-Map button → `markIslandCleared`.
- **IMPLEMENT**: Per SCENE_TRANSITION + MARK_CLEARED. Confetti via Phaser particles or tween of falling rectangles. ★/☆ pips per `stars`. Time-tier badge: ⚡ Lightning! (≤90s), Quick! (≤120s).
- **MIRROR**: legacy `bias-breaker-celebration.js` + v13 time tiers.
- **GOTCHA**: `markIslandCleared('bias-breaker', stars)` unlocks Habit Harbor. If `r.ok === false`, show banner "Couldn't save — play again to keep it".
- **VALIDATE**: After win, CelebrationScene shows time + score + stars + unlock. `localStorage.getItem('gg.profile')` shows `habit-harbor.unlocked === true`.

**D3: Refresh-persist**
- **ACTION**: Set `gg.activeIsland` in GameScene.create; clear in CelebrationScene.create and Back-to-Map.
- **IMPLEMENT**: REFRESH_PERSIST pattern.
- **MIRROR**: legacy 254–256 + cleanup 1436–1454.
- **GOTCHA**: Phase 4's landing page reads this flag; here we only set/clear it.
- **VALIDATE**: Start game, refresh, you stay in the game. Win → flag cleared.

**D4: Back-to-Map button**
- **ACTION**: Button on CelebrationScene → `/`.
- **IMPLEMENT**: Clickable rect: `window.location.href = '/'`.
- **MIRROR**: legacy 60–66.
- **GOTCHA**: Phase 2 has no landing page yet. `/` 404s on Vercel — fine, gets built in Phase 4.
- **VALIDATE**: Click → navigates.

**MILESTONE D SUCCESS SIGNAL**: full game start-to-finish, celebration, profile shows Habit Harbor unlocked. **STOP if pausing.**

---

### Milestone E — Tests + full quiz port  ✅ DONE (commit `9e0c6c4`, Session 3)

**E1: Vitest unit tests**
- **ACTION**: Add `tests/unit/level.test.ts` and `scoring.test.ts`.
- **IMPLEMENT**:
  ```ts
  // level.test.ts
  import { describe, it, expect } from 'vitest';
  import { buildLevel } from '../../src/level/buildLevel';
  import { quizDataBias } from '@gg/shared';

  describe('buildLevel', () => {
    it('builds 5 sections from 5 questions', () => {
      const lv = buildLevel(quizDataBias.slice(0, 5));
      expect(lv.sections.length).toBe(5);
      lv.sections.forEach(s => {
        expect(s.flyers.length).toBe(4);
        s.flyers.forEach(f => expect(f.travelLeft).toBeLessThan(f.travelRight));
      });
    });
  });

  // scoring.test.ts
  function timeToStars(s: number) { return s <= 90 ? 3 : s <= 120 ? 2 : 1; }
  describe('time→stars', () => {
    it.each([[30,3],[90,3],[91,2],[120,2],[121,1],[300,1]])('%i s → %i stars', (s, exp) => {
      expect(timeToStars(s)).toBe(exp);
    });
  });
  ```
- **MIRROR**: existing `_shared/tests/unit/*.test.ts` style.
- **GOTCHA**: import `quizDataBias` from `@gg/shared` to validate full bank (catches truncation).
- **VALIDATE**: `pnpm -F bias-breaker test` — all green.

**E2: Playwright e2e — happy path**
- **ACTION**: Replace `tests/e2e/hello.spec.ts` with `happy-path.spec.ts`.
- **IMPLEMENT**: navigate to `/`, wait for `window.__GAME__` and `window.__GAME_STATE__`. For each of 5 sections: read `__GAME_STATE__` for correct answer index, walk right via `page.keyboard.down('KeyD')` etc., wait for dwell, assert section advanced. After section 5, walk to door, wait for celebration, assert profile shows `habit-harbor.unlocked === true`.
- **GOTCHA**: Use `page.keyboard.down/up` (not `press`). Use `page.waitForFunction` for state transitions.
- **VALIDATE**: `pnpm -F bias-breaker e2e` — happy path green. Time budget per test: <90s.

**E3: Full bias bank port to `@gg/shared`**
- **ACTION**: Replace the 8-question starter `quizDataBias` with the full ~60-question port from `index.html:1274-1875`.
- **IMPLEMENT**: Read `index.html:1274-1875`, copy each question object verbatim. Preserve order. Preserve `correct: 0` convention.
- **MIRROR**: existing structure (just expand the array).
- **GOTCHA**: Watch for apostrophes in strings — use double-quoted TS literals where they appear.
- **VALIDATE**: `pnpm -F @gg/shared test` still passes; `quizDataBias.length >= 50`.

**MILESTONE E SUCCESS SIGNAL**: unit tests green, Playwright happy-path green, full bank ported. **PHASE 2 COMPLETE.**

---

## Testing Strategy

### Unit Tests (Vitest)
| Test | Where | Expected |
|---|---|---|
| `buildLevel` 5 sections + 4 flyers + travelLeft<travelRight | `tests/unit/level.test.ts` | Pass |
| time→stars tiers (90/120/+) | `tests/unit/scoring.test.ts` | 6 cases pass |
| `quizDataBias.length >= 50` | `_shared/tests/unit/quizData.test.ts` (updated) | Green after full port |

### E2E (Playwright)
| Test | Expected |
|---|---|
| Happy-path: start → 5 correct → win → habit-harbor unlocked | Pass in <90s |

### Edge Cases Checklist
- [x] Wrong answer never advances section
- [x] Carrier flyer's snap-when-close prevents v13.3 mid-air hang
- [x] Lava respawn clears dwellTicks/onFlyer/carryingFlyer (v13.2 fix)
- [x] Tortoise despawns when section advances
- [x] Final door only opens after section 5 cleared
- [x] `markIslandCleared` returns ok / storage-blocked banner otherwise
- [x] `gg.activeIsland` cleared on win
- [ ] (Phase 4) all-games landing page resume

---

## Validation Commands

```bash
# Static
pnpm -F bias-breaker typecheck
pnpm -F @gg/shared typecheck
# Unit
pnpm -r test
# Build
pnpm -F bias-breaker build
# E2E (one-time browser install)
pnpm -F bias-breaker exec playwright install --with-deps chromium
pnpm -F bias-breaker e2e
```

### Manual Validation
- [ ] `pnpm -F bias-breaker dev` — game playable
- [ ] Run/jump feels right (compare with legacy if needed)
- [ ] All 5 sections playable; correct answer carries you forward
- [ ] Wrong + fall + respawn works cleanly (no NaN, no stuck dwell)
- [ ] Tortoise appears, stompable, despawns on section advance
- [ ] Win → celebration → "Bad-Habit Harbor unlocked!"
- [ ] DevTools: `localStorage.getItem('gg.profile')` shows habit-harbor unlocked

---

## Acceptance Criteria
- [ ] All 5 milestones complete
- [ ] `pnpm -r typecheck && lint && test && build` green
- [ ] Playwright happy-path green
- [ ] Game playable start-to-finish, matches v13.3 mechanics
- [ ] `markIslandCleared('bias-breaker', stars)` succeeds + unlocks habit-harbor
- [ ] No console errors during a full playthrough

## Completion Checklist
- [ ] Phaser scenes follow `PreloadScene → GameScene → CelebrationScene`
- [ ] All v13.3 constants captured exactly (with per-second conversion)
- [ ] v13.2 lava-respawn fix applied (clears dwellTicks/onFlyer/carryingFlyer/tortoise)
- [ ] v13.3 carrier-snap fix applied (snap when dist < 20)
- [ ] Test seam stripped from prod build
- [ ] Full bias bank ported to `@gg/shared` (no starter truncation)

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Per-frame → per-second conversion off (player floaty/heavy) | M | Med | Compare side-by-side with legacy; tune until parity |
| `body.touching.down` vs `body.blocked.down` confusion | M | Low | Use `blocked.down`; document in constants |
| Carrier transit drops player (gravity not disabled) | M-H | Med | `setAllowGravity(false)` during transit; restore on arrival |
| Bias bank port introduces syntax error | M | Low | Mechanical port; Vitest catches quote-escape issues |
| Phaser camera follow stutters at section boundaries | L | Low | `startFollow(player, true, 0.12, 0)` matches legacy |
| Playwright keyboard simulation doesn't reach Phaser | L | High | `page.keyboard.down/up` (not `press`); test seam exposes state |

## Notes
- This is an XL phase. **Realistic estimate: 2–3 `prp-implement` sessions** (Milestones A+B first, C+D second, E third).
- The PRD says "mechanic-for-mechanic, no redesign." When in doubt, *port the legacy behavior* — polish passes come later.
- v13's hard-won fixes are MANDATORY: v13.2 NaN-free reset, v13.3 carrier snap, v13.1 tortoise speed.
- After Phase 2 completes: PRD Phase 2 → `complete`, archive plan, `prp-plan` for Phase 3 (BHH rebuild).
- **Push prerequisite:** GitHub auth for `wizkidzai/ai-glitch-buster` is currently broken (user is `nitchau`, repo is org-owned). Until resolved, all work commits locally to `main`. Phase 2 validation runs entirely against `pnpm dev` + local Vitest/Playwright.
