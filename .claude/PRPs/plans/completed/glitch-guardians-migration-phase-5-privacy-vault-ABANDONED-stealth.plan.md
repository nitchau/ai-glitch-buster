# Plan: Glitch Guardians Migration — Phase 5 (Privacy Vault)

## Summary
A brand-new top-down **stealth** island: the Guardian sneaks through a data vault, dodging
**snoop-bots** whose flashlight **vision cones are blocked by walls** (hide behind cover), to reach
**data leaks** and seal each one by answering a privacy quiz. Seal all leaks → the vault door opens →
reach it to win → unlock Hallucination Tower. Reuses the Bad-Habit Harbor engine wholesale; the only
genuinely new code is the `PatrolBot` (patrol + occluded vision cone + detection) and the playful
"spotted → gentle reset" flow.

## User Story
As a kid at the booth, I want to sneak through a vault and outsmart the guard-bots to plug data
leaks, so that I learn how to keep private information safe while having a fun stealth adventure.

## Problem → Solution
The landing map shows Privacy Vault as "✨ Soon" (built: false). → Build `games/privacy-vaults`, flip
the landing card to playable, and wire it into the deploy so clearing it lights the trail to
Hallucination Tower.

## Metadata
- **Complexity**: Large (new game + a new stealth mechanic; ~18 files; most reused from habit-harbor)
- **Source PRD**: `.claude/PRPs/prds/glitch-guardians-migration.prd.md`
- **PRD Phase**: 5 — Privacy Vault (stealth/timing, line-of-sight cones, quiz at junctions)
- **Island id**: `privacy-vaults` · **package**: `privacy-vaults` · **base**: `/privacy-vaults/` · **dev port**: 5175
- **Design (locked with user)**: spotted → **gentle reset, made fun** (no progress lost); vision → **hide behind cover** (walls occlude the cone)

---

## UX Design

### Loop (After)
```
┌──────────────────── Privacy Vault (top-down) ────────────────────┐
│  snoop-bots patrol with flashlight cones (blocked by walls/cover) │
│        ▒▒▒                                                        │
│   🤖<((( cone )))         📄 leak   ── walk into a leak ──▶        │
│        ▒▒▒                                  ┌─ privacy quiz ─┐    │
│   [hide behind a pillar to break the beam]  │ A B C D        │    │
│   spotted? → "Caught! Sneak again 👀" → fun  └────────────────┘    │
│              zip back to entry (sealed leaks STAY sealed)         │
│   seal all 4 leaks → 🚪 vault door opens → reach it → WIN         │
└──────────────────────────────────────────────────────────────────┘
   WIN → CelebrationScene → markIslandCleared('privacy-vaults')
        → unlocks 🗼 Hallucination Tower (map trail lights up)
```

### Interaction Changes
| Touchpoint | Bad-Habit Harbor (reused) | Privacy Vault (new) |
|---|---|---|
| Move | row the boat (per-axis) | sneak the Guardian (same per-axis movement) |
| Quiz target | drive into a glitch-bot | walk into a data **leak** |
| On correct | bot turns green, gate opens | leak **sealed** (turns safe/green) |
| Hazard | (none) | **snoop-bot vision cone** → spotted → fun gentle reset |
| Win | sail into the harbor mouth | reach the **vault door** (opens once all sealed) |
| Unlock | Privacy Vaults | **Hallucination Tower** (next in ISLANDS) |

---

## Mandatory Reading (the template = Bad-Habit Harbor)
| Priority | File | Why |
|---|---|---|
| P0 | `games/habit-harbor/src/scenes/GameScene.ts` | The whole scene shape to mirror: create/update, manual movement, `hitsWall`, quiz flow, win/`enterExit`, HUD/banner, camera supersample (`setZoom(RENDER_SCALE)`+`centerOn`), D-pad, test seam |
| P0 | `games/habit-harbor/src/maze.ts` | Pure model pattern → `vault.ts` (LAYOUT + `isWall` + a NEW `lineOfSightClear` raycast + `validateLayout`) |
| P0 | `games/habit-harbor/src/entities/Boat.ts` | Manual per-axis mover (`px,py`, `update(dir,dtSec,hitsWall)`) → `Guardian.ts` |
| P0 | `games/habit-harbor/src/entities/Bot.ts` | Walk-into quiz target (state flip on correct) → `Leak.ts` |
| P1 | `games/habit-harbor/src/ui/{QuizModal,Hud,Banner}.ts` | Reuse near-verbatim (relabel) |
| P1 | `games/habit-harbor/src/scenes/CelebrationScene.ts` | Reuse; change unlock copy → "Hallucination Tower"; `markIslandCleared('privacy-vaults')` |
| P1 | `games/habit-harbor/src/{constants,scoring,main}.ts` + `tests/**` | Constants (incl. `RENDER_SCALE`, `TEXT_RES`, `STAR_TIME_*`), scoring, bootstrap, test patterns |
| P1 | `games/_shared/src/{quizData,profile,types}.ts` | `pickN('privacy', n)` + `toChoices`; `markIslandCleared` cascade (ISLANDS: …→privacy-vaults→**reality-tower**→the-core); `Question` |
| P2 | `scripts/assemble-dist.cjs`, `vercel.json`, `landing/index.html`, `.github/workflows/ci.yml` | Wire the 3rd game into deploy/CI/landing |

### Key facts
- `pickN('privacy', n)` → privacy bank (8 starter Qs; refills). `markIslandCleared('privacy-vaults', stars)` sets cleared + **unlocks `reality-tower`** (ISLANDS order).
- Landing already links `/privacy-vaults/` and shows "Soon" until `built:true`. Same-origin profile sharing is automatic.

---

## Patterns to Mirror
### MANUAL_MOVER (Guardian = Boat)
// SOURCE: games/habit-harbor/src/entities/Boat.ts
```ts
update(dir, dtSec, hitsWall) {
  const dx=(dir.right?1:0)-(dir.left?1:0), dy=(dir.down?1:0)-(dir.up?1:0);
  const step = SPEED_PER_S * dtSec;            // frame-rate-independent
  if (dx) { const nx=this.px+dx*step; if(!hitsWall(nx,this.py)) this.px=nx; } // per-axis slide
  if (dy) { const ny=this.py+dy*step; if(!hitsWall(this.px,ny)) this.py=ny; }
}
```
### WALK_INTO_QUIZ (Leak = Bot)
// SOURCE: habit-harbor GameScene.checkBotCollision + Bot.rescue → here checkLeakCollision + Leak.seal
```ts
if (dx*dx+dy*dy < HIT*HIT) { this.openQuiz(leak); }   // correct → leak.seal(); sealed++
```
### WIN + UNLOCK (mirror enterExit + CelebrationScene)
// SOURCE: habit-harbor GameScene.enterExit + CelebrationScene
```ts
if (sealed>=TOTAL && atExit()) enterExit();  // → scene.start('CelebrationScene', {stars,time,sealed})
markIslandCleared('privacy-vaults', stars);  // unlocks reality-tower
```
### SUPERSAMPLE + CRISP TEXT
// SOURCE: habit-harbor GameScene.create + constants
```ts
this.cameras.main.setZoom(RENDER_SCALE); this.cameras.main.centerOn(CANVAS_W/2, CANVAS_H/2);
// UI: logical coords + scrollFactor 1 (NOT 0 under zoom); text styles use resolution: TEXT_RES
```

---

## NEW MECHANIC — PatrolBot + occluded vision cone (the heart of this island)

### vault.ts additions (pure, unit-tested)
- `LAYOUT` (char grid, CELL=64): `#` wall · `.` floor · `S` entry · `E` exit door · `L` leak · cover pillars are `#`.
- `isWall(m,c,r)` (OOB = wall) — same as maze.
- **`lineOfSightClear(m, x0,y0, x1,y1)`**: sample the segment from (x0,y0)→(x1,y1) in small steps (≈ CELL/4); return false if any sampled cell `isWall`. (Used by both detection and the cone render.)
- `validateLayout(m)`: BFS floor-reachability from `S` reaches every `L` and `E` (solvable ignoring patrols).
- `PATROLS`: array of `{ waypoints: {c,r}[], speed, sweep?:bool }` — each bot loops its waypoints; optional pause+rotate ("sweep") at each waypoint.

### PatrolBot.ts (new entity)
- State: `px,py` (cell-centre start), `facing` (radians), waypoint index, a small "look" timer.
- `update(dtSec, isWall)`: move toward the next waypoint at `speed*dtSec` (per-axis like the boat); `facing` = travel direction; at a waypoint, if `sweep`, pause and rotate `facing` (e.g. ±50° over ~1.2s) before moving on.
- **Vision cone**: half-angle `CONE_HALF` (~32°), range `CONE_RANGE` (~4.2·CELL).
- **Detection** (`sees(gx,gy, isWall)`): `dist=hypot(gx-px,gy-py)`; if `dist>CONE_RANGE` → false; `ang=angleDiff(atan2(gy-py,gx-px), facing)`; if `|ang|>CONE_HALF` → false; else return `lineOfSightClear(px,py, gx,gy)`. (One ray → in-range + in-angle + no wall = spotted.)
- **Render** (`drawCone(g)`): fan of `RAYS≈26` directions across `[facing-CONE_HALF, facing+CONE_HALF]`; for each, march from the bot until `isWall` or `CONE_RANGE`; collect endpoints; fill polygon `[bot, ...endpoints]` with a translucent warm-yellow gradient (alpha ~0.16) + a soft edge. Redraw each frame (bot moves/sweeps). This makes the beam visibly stop at walls → kids see they can hide.
- Body: a little glowing-eye snoop-bot drawn facing `facing` (reuse Bot's container-graphics style, recoloured).

### "Spotted" → gentle-but-fun reset (GameScene)
- On `sees` true (and not already resetting): set `state.busted=true` (freezes input/cone-checks), then a short playful sequence (~0.7s, mirror habit-harbor's `flashBanner` + tweens):
  1. The spotting bot flashes + an "❗" pops above it; a quick red screen-edge flash (`cameras.main.flash(180, ...)`).
  2. Banner: a rotating funny line — "Caught! Sneak again 👀" / "Busted! Try another route 🕵️".
  3. The Guardian does a spin + sparkle and **zips back to the entry `S`** (tween position; sealed leaks UNCHANGED).
  4. `delayedCall(700)` → `state.busted=false` (re-enable). No lives, no progress loss — just a fun "whoops, again!".
- Track `state.spottedCount` (shown small on the HUD as "👀 ×n" for a cheeky stat; no penalty).

---

## Files to Change
| File | Action | Notes |
|---|---|---|
| `games/privacy-vaults/**` | CREATE | New package (scaffold copied from habit-harbor; renamed; base `/privacy-vaults/`; port 5175) |
| `…/src/vault.ts` | CREATE | Pure: LAYOUT + isWall + `lineOfSightClear` + `validateLayout` + PATROLS |
| `…/src/entities/{Guardian,Leak,PatrolBot}.ts` | CREATE | Guardian (mover), Leak (quiz target), **PatrolBot (cone+LOS)** |
| `…/src/scenes/{Preload,Game,Celebration}Scene.ts` | CREATE | mirror habit-harbor; GameScene adds patrols + spotted flow |
| `…/src/ui/{Hud,Banner,QuizModal}.ts`, `constants.ts`, `scoring.ts`, `main.ts` | CREATE | mirror habit-harbor (relabel HUD "🔒 Sealed n/4") |
| `…/tests/unit/{vault,scoring}.test.ts`, `…/tests/e2e/happy-path.spec.ts` | CREATE | layout + **LOS-occlusion** unit tests; seam-driven e2e |
| `scripts/assemble-dist.cjs` | UPDATE | `GAMES = [...,'privacy-vaults']` |
| `vercel.json` | UPDATE | add `pnpm -F privacy-vaults build` to buildCommand |
| `landing/index.html` | UPDATE | privacy-vaults `built:true` (card flips from "Soon" to playable when unlocked) |
| `.github/workflows/ci.yml` | UPDATE | add privacy-vaults e2e step |

## NOT Building
- No multi-room vault (one room, ~4 leaks, ~3 patrol bots).
- No "lives"/game-over (gentle reset only, per user).
- No avatar picker (boot straight into the vault, like Harbor).
- No deploy (push still blocked) — landing/cutover already point at the placeholder Vercel URL.
- Full privacy-bank port is OPTIONAL (Milestone D) — the 8-question starter already plays fine.

---

## Step-by-Step Tasks (Milestones)

### Milestone A — Scaffold + vault model + Guardian
- **A1 Scaffold** `games/privacy-vaults` by copying habit-harbor's config (package/tsconfig/vite/vitest/playwright/index.html); rename `habit-harbor`→`privacy-vaults`, base `/privacy-vaults/`, title "Privacy Vault", dev port 5174→5175. `pnpm install`.
- **A2 constants.ts** — copy habit-harbor's (keep `RENDER_SCALE`, `TEXT_RES`, `STAR_TIME_*`); add `GUARDIAN_SPEED_PER_S`, `LEAK_HIT`, `CONE_HALF`, `CONE_RANGE`, `SEAL_TOTAL`, vault colours.
- **A3 vault.ts** (pure) — LAYOUT (≈15×11), `buildVault`, `isWall`, **`lineOfSightClear`**, `validateLayout` (BFS reaches all `L` + `E`), `PATROLS`.
- **A4 GameScene static render** — vault floor + walls/cover (themed: dark vault, tech panels), leaks (glowing), exit door (closed), entry. Camera supersample + centerOn. D-pad + keys.
- **A5 Guardian.ts** — top-down hero sprite + manual per-axis movement (mirror Boat); spawns at `S`.
- **VALIDATE**: typecheck/lint; `validateVault` unit test green; in-browser the Guardian moves + collides with walls.

### Milestone B — Patrol bots + vision cones + spotted
- **B1 PatrolBot.ts** — patrol waypoints + facing + sweep; cone detection (`sees`) + occluded cone render (`drawCone`).
- **B2 Wire patrols** into GameScene update (move bots, redraw cones each frame).
- **B3 Detection + spotted** — each frame (not busy), if any `bot.sees(guardian)` → the fun gentle-reset sequence (flash, banner, zip-to-entry, brief input lock); sealed leaks persist.
- **VALIDATE**: in-browser, a cone is blocked by a pillar (stand behind cover = safe; step into the lit cone = "Caught!" + zip back). Unit-test `lineOfSightClear` (clear vs wall-blocked cases).
- **STOP if pausing.**

### Milestone C — Leaks + seal-quiz + HUD + win + celebration
- **C1 Leak.ts** — glowing leak; on seal → safe/green (mirror Bot).
- **C2 Quiz/seal** — walk-into (`dist²<LEAK_HIT²`) → `QuizModal` with `pickN('privacy',…)`; correct → `leak.seal()` + `sealed++` + banner; wrong → nudge.
- **C3 HUD/Banner** — "🔒 Sealed n/4" + timer (pauses during quiz/busted) + a cheeky "👀 ×n" spotted tally.
- **C4 Win** — when `sealed>=SEAL_TOTAL`, open the vault door; reaching the exit cell → `enterExit` → CelebrationScene.
- **C5 CelebrationScene** — time-stars + "🗼 Hallucination Tower unlocked!" + confetti + `markIslandCleared('privacy-vaults', stars)`; refresh-persist `gg.activeIsland`.
- **VALIDATE**: seal all → door opens → exit → celebration → profile `privacy-vaults.cleared` + `reality-tower.unlocked`.
- **STOP if pausing.**

### Milestone D — Tests + deploy wiring + closeout
- **D1 Unit** — `vault.test.ts` (structure: 1 S, 1 E, 4 L; isWall; **LOS occlusion**; validateLayout true) + `scoring.test.ts`.
- **D2 Playwright happy-path** — seam-driven (mirror habit-harbor): teleport Guardian onto each leak, answer correct; move to exit; assert CelebrationScene + profile `privacy-vaults.cleared` + `reality-tower.unlocked`. (Disable/ignore patrols in the e2e via the seam so it's deterministic.)
- **D3 Deploy/CI** — `assemble-dist` GAMES += privacy-vaults; `vercel.json` build; `landing` `built:true`; CI e2e step. Verify combined `dist/privacy-vaults/` + landing card playable.
- **D4 (optional)** full privacy-bank port (index.html privacy bank → `_shared/quizDataPrivacy`, 8→~60) + bump `quizData.test.ts` privacy assertion.
- **D5 Closeout** — report, PRD Phase 5 complete, archive plan, memory.

---

## Testing Strategy
### Unit (Vitest)
| Test | Expected |
|---|---|
| `buildVault` | 1 spawn, 1 exit, 4 leaks; cols/rows correct |
| `isWall` | border + cover solid; floor open |
| `lineOfSightClear` | open line → true; line crossing a wall cell → **false** |
| `validateLayout` | BFS from S reaches all L + E |
| `timeToStars` | 90/120 tiers |

### E2E (Playwright, seam-driven, patrols off)
boot → seed profile → seal 4 leaks → reach exit → assert celebration + `privacy-vaults.cleared` + `reality-tower.unlocked`.

### Manual / in-browser
- [ ] Move + wall collision; [ ] cone blocked by cover (hide = safe); [ ] step in cone → fun reset, sealed leaks persist; [ ] seal all → door opens → win → Hallucination Tower unlocks on the map.

---

## Validation Commands
```bash
pnpm -F privacy-vaults typecheck && pnpm -F privacy-vaults lint && pnpm -F privacy-vaults test
pnpm -F privacy-vaults build
pnpm -F bias-breaker build && pnpm -F habit-harbor build && pnpm -F privacy-vaults build && node scripts/assemble-dist.cjs
find dist -maxdepth 2 -name index.html   # EXPECT dist/{index.html, bias-breaker/, habit-harbor/, privacy-vaults/}
git diff --cached --name-only | grep -iE '\.pdf$|/dist/|node_modules'   # EXPECT empty (never stage the 4 root PDFs)
```

## Acceptance Criteria
- [ ] Sneak/seal/win loop plays; patrol cones occlude on walls (hide behind cover works)
- [ ] Spotted = gentle reset (sealed leaks persist) + a fun "Caught!" moment
- [ ] Win → CelebrationScene → profile `privacy-vaults.cleared` + `reality-tower.unlocked`
- [ ] Landing card playable; combined `dist/privacy-vaults/` ships; monorepo typecheck/lint/test green; e2e green
- [ ] No PDFs/dist/node_modules staged

## Risks
| Risk | L | I | Mitigation |
|---|---|---|---|
| Occluded-cone render perf (3 bots × 26 rays/frame) | M | L | Coarse step (CELL/3), cap RAYS; it's a small grid |
| Stealth too hard/frustrating for kids | M | M | Slow bots, generous cover, gentle reset (no loss), tune patrols by playtest |
| Cone render vs detection mismatch (look unfair) | M | M | Both use the SAME `lineOfSightClear`; sample finely enough |
| Vault not solvable / patrols make a leak unreachable | L | M | `validateLayout` (reachability) + playtest patrol timing |

## Notes
- IslandId is **`privacy-vaults`** (plural) to match ISLANDS + the landing link `/privacy-vaults/` + the Harbor celebration copy ("Privacy Vaults unlocked").
- Deploy still deferred (push blocked) — everything commits locally on `main`.
- Per user: keep it gentle (no game-over) but **fun** — lean into the playful "Caught!" moment and bouncy feedback.
