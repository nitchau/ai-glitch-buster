# Plan: Migration Phase 3 — Bad-Habit Harbor (Phaser rebuild)

## Summary
Rebuild the vanilla Bad-Habit Harbor maze game on the Phaser 3 + TS + Vite stack
at mechanic-for-mechanic parity, **and finally build the win path** (the vanilla
exit was visual-only; "onComplete intentionally NOT called — no win path yet").
A top-down boat navigates a fixed 15×9 dock maze, drives into 5 glitch-bots,
answers a bad-habits quiz to rescue each (opening its gate), then exits the
harbor mouth → celebration → stars → `markIslandCleared('habit-harbor')` →
Privacy Vault unlocks.

## User Story
As a kid playing Glitch Guardians, I want to pilot a boat through the harbor,
free the glitchy bots by answering good-habit questions, and escape through the
harbor mouth, so that I learn good AI habits and unlock the next island.

## Problem → Solution
Vanilla BHH (`legacy/GAME/screens/habit-harbor*.js`) runs on Canvas/DOM, has no
win/celebration/unlock, and isn't on the new stack → a `games/habit-harbor`
Phaser package at parity **plus** the win flow, tests, and the full bad-habits
bank, deployed under `/habit-harbor/`.

## Metadata
- **Complexity**: XL
- **Source PRD**: `.claude/PRPs/prds/glitch-guardians-migration.prd.md` (Phase 3)
- **PRD Phase**: Phase 3 — Bad-Habit Harbor rebuild
- **Estimated Files**: ~16 new (1 package) + 2 shared edits
- **Milestones**: 4 (A–D), each independently runnable/testable — sessions can pause between them.

---

## UX Design

### Before (vanilla)
```
Canvas/DOM maze • boat drives into bot • DOM quiz modal • rescue opens gate •
"Find the harbor mouth →" banner • ...then nothing (no win)
```
### After (Phaser)
```
PreloadScene → GameScene (Phaser maze + boat + bots + quiz overlay + HUD)
  rescue all 5 → drive into harbor mouth → CelebrationScene (stars, confetti)
  → markIslandCleared('habit-harbor', stars) → Privacy Vault unlocked
```

### Interaction Changes
| Touchpoint | Before | After | Notes |
|---|---|---|---|
| Quiz | DOM modal | Phaser overlay Container (4 tappable answer buttons) | game + timer pause while open |
| Win | none | drive into exit → CelebrationScene | the new Phase-4 win, built here |
| Persist | none | `gg.activeIsland='habit-harbor'` set/clear | refresh-resume (Phase 4 reads it) |

---

## Mandatory Reading

### Legacy (the mechanic spec — port faithfully)
| Priority | File | Lines | Why |
|---|---|---|---|
| P0 | `legacy/GAME/screens/habit-harbor-maze.js` | 1-143 | LAYOUT (copy verbatim), `build()`, `isWall`, `reachableCells`, `validateSolvable` |
| P0 | `legacy/GAME/screens/habit-harbor.js` | all (562) | movement, collision, bot/quiz/rescue/gate, HUD, timer, rendering colors |
| P1 | `legacy/GAME/screens/habit-harbor-questions.js` | 1-87 | quiz sourcing + `toChoices` (already in `@gg/shared`) |

### Phaser patterns to mirror (the HOW — bias-breaker is the template)
| Priority | File | Why |
|---|---|---|
| P0 | `games/bias-breaker/package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `index.html` | copy the package scaffold (change `bias-breaker`→`habit-harbor`, base `/habit-harbor/`) |
| P0 | `games/bias-breaker/src/main.ts` | Phaser.Game config + scene array + `__TEST_SEAM__` → `window.__GAME__` |
| P0 | `games/bias-breaker/src/scenes/GameScene.ts` | scene state object, `update(time,delta)` loop, `__GAME_STATE__()` seam, per-frame manual movement |
| P0 | `games/bias-breaker/src/scenes/CelebrationScene.ts` | win screen + `markIslandCleared` + confetti + Back-to-Map |
| P0 | `games/bias-breaker/src/level/{types.ts,buildLevel.ts}` | pure, unit-testable model module (mirror for `maze.ts`) |
| P0 | `games/bias-breaker/src/scoring.ts` | `timeToStars` (90/120 tiers — same for BHH) |
| P1 | `games/bias-breaker/src/entities/Tortoise.ts` | **manual** (non-Arcade) per-frame mover + procedural texture (mirror for Boat/Bot) |
| P1 | `games/bias-breaker/src/ui/{Banner.ts,Hud.ts}` | camera-fixed UI widgets |
| P1 | `games/bias-breaker/tests/unit/{level,scoring}.test.ts`, `tests/e2e/happy-path.spec.ts` | test structure to mirror |
| P0 | `games/_shared/src/{profile.ts,quizData.ts,types.ts,theme.ts}` | `markIslandCleared`, `pickN('bad-habits')`, `toChoices`, `ISLANDS`, theme |
| P1 | `vercel.json` | add a `/habit-harbor/` rewrite |

## External Documentation
No external research needed — feature uses established internal (Phaser + bias-breaker) patterns already proven in Phase 2.

---

## Patterns to Mirror

### PACKAGE_SCAFFOLD
// SOURCE: games/bias-breaker/package.json + vite.config.ts
- `package.json`: same scripts (dev/build/typecheck/lint/test/e2e), deps `phaser` + `@gg/shared` workspace, devdeps vite/vitest/playwright/eslint/ts.
- `vite.config.ts`: `base: '/habit-harbor/'`, `define: { __TEST_SEAM__: JSON.stringify(process.env.NODE_ENV !== 'production') }`.
- `playwright.config.ts`: `webServer.url: 'http://localhost:5173/habit-harbor/'`, `baseURL: 'http://localhost:5173'`.

### PURE_MODEL_MODULE (mirror for maze.ts)
// SOURCE: games/bias-breaker/src/level/buildLevel.ts — pure, no Phaser import, returns a typed model; unit-tested headless.

### SCENE_STATE + SEAM
// SOURCE: games/bias-breaker/src/scenes/GameScene.ts
```ts
type GameState = { /* ...fields... */ };
update(_time: number, delta: number): void { /* manual movement, collision, ... */ }
if (__TEST_SEAM__) {
  (window as unknown as { __GAME_STATE__: () => unknown }).__GAME_STATE__ = () => ({ /* snapshot */ });
}
```

### MANUAL_MOVER (mirror for Boat — NO Arcade physics)
// SOURCE: games/bias-breaker/src/entities/Tortoise.ts — manual per-frame position update + procedural `generateTexture`. BHH boat moves by `BOAT_SPEED_PER_S * delta/1000` with per-axis `isWall` checks (legacy habit-harbor.js:122-134).

### WIN + UNLOCK
// SOURCE: games/bias-breaker/src/scenes/{GameScene.enterDoor, CelebrationScene}
```ts
const stars = timeToStars(finalSec);
this.scene.start('CelebrationScene', { stars, time: finalSec, rescued });
// CelebrationScene: const saved = markIslandCleared('habit-harbor', data.stars);
```

### TEST_STRUCTURE
// SOURCE: games/bias-breaker/tests/unit/level.test.ts (Vitest) + tests/e2e/happy-path.spec.ts (Playwright via __GAME__/__GAME_STATE__ seam, re-park-on-fall pattern).

---

## Files to Change

| File | Action | Justification |
|---|---|---|
| `games/habit-harbor/package.json` `tsconfig.json` `vite.config.ts` `vitest.config.ts` `playwright.config.ts` `index.html` `public/.gitkeep` | CREATE | package scaffold (mirror bias-breaker) |
| `games/habit-harbor/src/main.ts` | CREATE | Phaser.Game + scenes + test seam |
| `games/habit-harbor/src/constants.ts` | CREATE | COLS=15, ROWS=9, CELL=64, BOAT_SPEED(_PER_S), BOAT_R, BOT_HIT, colors, STAR tiers |
| `games/habit-harbor/src/maze.ts` | CREATE | LAYOUT (verbatim) + `buildMaze`, `isWall`, `reachableCells`, `validateSolvable`, helpers (pure) |
| `games/habit-harbor/src/scoring.ts` | CREATE | `timeToStars` (mirror bias) |
| `games/habit-harbor/src/entities/Boat.ts` | CREATE | manual mover + per-axis collision + procedural boat+kid texture |
| `games/habit-harbor/src/entities/Bot.ts` | CREATE | glitch/happy render + jitter; rescued flag |
| `games/habit-harbor/src/ui/{Banner.ts,Hud.ts,QuizModal.ts}` | CREATE | banner, HUD (rescued/timer), quiz overlay |
| `games/habit-harbor/src/scenes/{PreloadScene,GameScene,CelebrationScene}.ts` | CREATE | boot → maze game → win |
| `games/habit-harbor/tests/unit/{maze,scoring}.test.ts` `tests/e2e/happy-path.spec.ts` | CREATE | Vitest + Playwright |
| `games/_shared/src/quizData.ts` | UPDATE | full bad-habits bank port (index.html:1876-2477) |
| `games/_shared/tests/unit/quizData.test.ts` | UPDATE | assert `bad-habits` length >= 50 |
| `vercel.json` | UPDATE | add `/habit-harbor/` rewrite |
| `.claude/PRPs/prds/...migration.prd.md` | UPDATE | Phase 3 → in-progress (done by prp-plan) |

## NOT Building
- **No avatar picker** for BHH (player is a boat with a kid; boot straight to GameScene). Could reuse `@gg/shared` avatar later — out of scope.
- **No procedural maze generation** — the LAYOUT is fixed/hand-authored (parity). `validateSolvable` is a *test/guard*, not a generator.
- **No Arcade physics** — manual grid movement + collision (matches vanilla; simpler).
- **No multiplayer / mobile-portrait / audio assets** (synth only, per project scope).
- **Main-app launcher cutover** — that's Phase 4.

---

## Step-by-Step Tasks

### Milestone A — Package + maze model + boat movement

**A1: Scaffold the package** — copy bias-breaker's package.json/tsconfig/vite/vitest/playwright/index.html; rename to `habit-harbor`, base `/habit-harbor/`. `pnpm install`. VALIDATE: `pnpm -F habit-harbor typecheck` (after a stub main.ts).

**A2: constants.ts** — COLS=15, ROWS=9, CELL=64, CANVAS_W=960, CANVAS_H=576, BOAT_SPEED=3 (+ `BOAT_SPEED_PER_S = 3*60 = 180`), BOAT_R=CELL*0.30, BOT_HIT=CELL*0.6, RESCUE_COUNT=5, STAR_TIME_GOLD=90, STAR_TIME_SILVER=120, and the color palette (water `#0c3a4a`/`#0a2738`, dock `#7c5734`/`#5a3f24`, gate body `#1a1a22` + stripe `#ffce3a`, exit `#43e97b`, bot-bad `#e7402f`, bot-good `#43e97b`, boat hull `#bd8550`/`#7d4f27`). MIRROR bias constants.ts. GOTCHA: keep per-frame (`BOAT_SPEED`) AND per-second (`_PER_S`) — move by `_PER_S * delta/1000` for frame-rate independence (the kite lesson).

**A3: maze.ts (pure)** — copy LAYOUT verbatim from `habit-harbor-maze.js:19-29` (legend `# . S E 1-5 a-e`). Port `buildMaze()` (parse → `{ grid, spawn, exit, bots[], gates[] }`), `cellChar`, `isWall(model,c,r,openGates)`, `reachableCells(model,openGates)` (BFS 4-dir, visited `"c,r"`), `validateSolvable(model)` (the rescue-chain BFS, lines 108-131). Export typed `MazeModel`. MIRROR buildLevel.ts (pure, no Phaser). VALIDATE: typecheck.

**A4: GameScene static render** — render water gradient, docks (wall cells, wood texture), gates (closed/open per `openGates`), exit (glowing harbor mouth). World 960×576, camera fit. MIRROR GameScene.create background/platforms. Use Graphics (procedural). GOTCHA: re-render gates when `openGates` changes (a gate layer redrawn on rescue).

**A5: Boat entity + input + movement** — `Boat.ts`: procedural boat+kid texture (hull gradient + green-shirt kid), manual position `px/py` (spawn cell centre), `angle`. Keyboard (arrows + WASD) + on-screen D-pad (4 Phaser buttons → shared key flags). Per-axis movement with `isWall` collision (legacy 122-134): resolve dx then dy separately so the boat slides along walls. MIRROR Tortoise.ts (manual mover) + bias keyboard setup. VALIDATE: boat moves, can't cross walls/closed gates; `pnpm -F habit-harbor typecheck`.

**MILESTONE A SUCCESS**: navigable maze, boat slides along walls, gates block. **STOP if pausing.**

### Milestone B — Bots, quiz, rescue, gates, HUD

**B1: Bot entity** — `Bot.ts`: glitch render (red `#e7402f`, antenna, "?" thought, jitter `sin(t*0.25+c*1.7)*2`) vs rescued render (green, smile). 5 bots from `model.bots` ({id,c,r,gate,rescued}). MIRROR Tortoise procedural draw + per-frame jitter.

**B2: Drive-into-bot detection** — each frame (when not paused), `dist² < BOT_HIT²` to an unrescued bot → `openQuiz(bot)` (legacy 235-244).

**B3: QuizModal (ui/QuizModal.ts)** — Phaser overlay Container: dark scrim + panel + question text + 4 answer buttons (from `toChoices(q)`), tappable. On correct → callback `onCorrect`; on wrong → re-render same bot + nudge banner ("Not quite — look for the kind, clear, honest choice!"). Pull questions via `pickN('bad-habits', ...)` pool (refill when empty). GOTCHA: set `state.paused=true` on open (freezes boat + timer), false on close. MIRROR Banner.ts (Container UI) + bias dwell/commit answer logic.

**B4: rescue + gate-open** — on correct: `bot.rescued=true`, `state.openGates[bot.gate]=true` (movement reads it immediately), `state.rescued++`, redraw that gate as open + that bot as happy, banner ("Fixed! A gate opened ✓"; all done → "All bots freed! Find the harbor mouth →"). Legacy 224-234.

**B5: HUD + banner + timer** — `Hud.ts`: "🤖 Rescued n/5" + "⏱ Ns". Timer counts up in `update` only when `!paused` (legacy 529-534). Banner like bias. MIRROR Hud.ts/Banner.ts.

**MILESTONE B SUCCESS**: drive into a bot → quiz → correct rescues + opens gate + happy bot; wrong nudges; timer pauses during quiz; HUD updates. **STOP if pausing.**

### Milestone C — Win + celebration + unlock + persist

**C1: Win-at-exit** — when `state.rescued >= 5`, watch for the boat entering the exit cell (centre within ~BOAT_R). Then freeze, fade, and after ~900ms `scene.start('CelebrationScene', { stars: timeToStars(finalSec), time: finalSec, rescued })`. This is the **new** win (vanilla had none). MIRROR GameScene.checkDoor/enterDoor.

**C2: CelebrationScene** — stars (⭐/☆), time + tier badge (⚡ ≤90 / Quick ≤120), "🛡️ Privacy Vault unlocked!", Back-to-Map → `/`. Confetti (tweened rects). Call `markIslandCleared('habit-harbor', stars)` (→ unlocks `privacy-vaults` via ISLANDS cascade); on `!ok` show "Couldn't save — play again". MIRROR bias CelebrationScene exactly.

**C3: Refresh-persist** — GameScene.create sets `localStorage.gg.activeIsland='habit-harbor'`; CelebrationScene.create + Back-to-Map clear it. MIRROR bias.

**C4: Test seam** — `__GAME_STATE__()` exposes `{ rescued, total, timeMs, paused, won, atExit }` + enough for the e2e (e.g. a way to position the boat / trigger rescue). Expose `scene` internals like bias (the e2e reaches in). MIRROR bias `__GAME_STATE__`.

**MILESTONE C SUCCESS**: rescue all 5 → reach exit → celebration → profile shows `habit-harbor` cleared + `privacy-vaults` unlocked. **STOP if pausing.**

### Milestone D — Tests + full bad-habits bank

**D1: Vitest** — `tests/unit/maze.test.ts`: `validateSolvable(buildMaze())` is true; `isWall` respects walls + closed/open gates; exactly 5 bots + 5 gates + 1 spawn + 1 exit. `tests/unit/scoring.test.ts`: time→stars tiers. MIRROR bias level/scoring tests.

**D2: Playwright happy-path** — `tests/e2e/happy-path.spec.ts`: boot → seed profile → GameScene; for each bot, drive/teleport the boat onto it via the seam and answer correctly (reach into `scene` like bias parked the player); after 5 rescued, move boat to exit; assert CelebrationScene + profile `habit-harbor.cleared` + `privacy-vaults.unlocked`. MIRROR bias happy-path (re-park-on-fall, `test.setTimeout`, gate on a scene being active).

**D3: Full bad-habits bank port** — one-off extraction script (mirror the Phase-2 bias port): eval `index.html`'s `"bad-habits": [...]` (line 1876), shape-check, emit TS, replace `quizDataBadHabits` in `_shared/quizData.ts` (8 → ~60). Update `quizData.test.ts` to assert `bad-habits` length >= 50. Prettier-normalise. VALIDATE: `pnpm -r test`.

**D4: Vercel + CI** — add `/habit-harbor/` rewrite to `vercel.json` (mirror bias entry). CI already runs `pnpm -r` (picks up the new package) — verify the workflow doesn't hardcode package names.

**MILESTONE D SUCCESS**: maze/scoring unit tests green, Playwright happy-path green, full bad-habits bank ported. **PHASE 3 COMPLETE.**

---

## Testing Strategy

### Unit (Vitest)
| Test | Where | Expected |
|---|---|---|
| `validateSolvable(buildMaze())` true | `maze.test.ts` | Pass |
| `isWall` walls + closed gate true, open gate false | `maze.test.ts` | Pass |
| 5 bots / 5 gates / 1 spawn / 1 exit parsed | `maze.test.ts` | Pass |
| time→stars tiers (90/120/+) | `scoring.test.ts` | 6 cases |
| `bad-habits` length >= 50 | `_shared/quizData.test.ts` | Green after port |

### E2E (Playwright)
| Test | Expected |
|---|---|
| rescue all 5 → exit → celebration → privacy-vaults unlocked | Pass headless <90s |

### Edge Cases Checklist
- [ ] Boat can't cross walls or closed gates (per-axis slide)
- [ ] Rescuing a bot opens exactly its gate (movement reads it same frame)
- [ ] Timer pauses during quiz; resumes on close
- [ ] Wrong answer re-prompts same bot (no rescue, no advance)
- [ ] Exit win only fires after all 5 rescued
- [ ] `markIslandCleared` ok / storage-blocked banner
- [ ] `gg.activeIsland` cleared on win

---

## Validation Commands
```bash
pnpm -F habit-harbor typecheck      # zero errors
pnpm -F habit-harbor lint           # clean
pnpm -r test                        # all unit tests green (incl. _shared bad-habits >=50)
pnpm -F habit-harbor build          # builds
pnpm -F habit-harbor e2e            # happy-path green (chromium already installed)
pnpm -F habit-harbor dev            # manual: http://localhost:5173/habit-harbor/
```

## Acceptance Criteria
- [ ] All milestones A–D complete; mechanic parity with vanilla BHH
- [ ] The win/celebration/unlock (never built in vanilla) now exists
- [ ] typecheck + lint clean; unit tests + e2e green; build OK
- [ ] Full bad-habits bank (>=50) in `@gg/shared`

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Per-axis grid collision feel differs from vanilla | M | M | Port `hitsWall` math exactly; tune BOAT_R; manual playtest |
| Headless e2e timing (proven ~38fps) | M | L | Frame-rate-independent movement (`_PER_S*delta`); re-park-on-fall; `test.setTimeout(120s)` |
| Quiz overlay input vs game input overlap | M | M | `state.paused` gate (boat ignores input while modal open) |
| bad-habits bank has brackets/quotes breaking eval | L | M | Same shape as bias (worked); shape-check in the script |

## Notes
- BHH needs **no Arcade physics** — manual movement keeps it simple and matches vanilla.
- `timeToStars` duplicated in `habit-harbor/src/scoring.ts` (could later hoist to `@gg/shared`); keep per-game now to avoid touching bias.
- GitHub push still blocked (org auth); all work commits locally on `main`.
- Realistic estimate: 2–3 sessions (A / B+C / D), mirroring Phase 2's cadence.
