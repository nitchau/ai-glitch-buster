# Bad-Habit Harbor

**Project:** Glitch Guardians, inside the `AI Glitch Buster` web app (`C:\Users\nitin\ai-glitch-buster`)
**Phase:** 3 of N — second playable island (the "Bad Habits in AI" pillar)
**Date:** 2026-05-28
**Authors:** Mishika & team, Nitin, Claude Opus 4.7
**Status:** DRAFT — awaiting user review
**Builds on:** Bias Breaker platformer (`docs/superpowers/specs/2026-05-27-bias-breaker-platformer-design.md`, latest commit `8a48ce3`)

---

## Problem Statement

Glitch Guardians has exactly one playable island (Bias Breaker / fairness). The other three AI-safety pillars are still "Coming Soon" cards, so at the national-finals booth the team can only show a single mechanic and a single lesson. We need a **second, mechanically distinct island** that teaches the "Bad Habits in AI" pillar to walk-up kids with no adult guidance — both to deepen the booth experience and to demonstrate to the finals interviewers that the team is committed to continued development of the tool.

## Evidence

- The game ships with a rich, age-appropriate `quizData["bad-habits"]` bank (~60 questions in `index.html`, lines 1878–2468) that is currently unused by the game layer — strong signal the topic is ready to teach but has no gameplay home yet.
- Bias Breaker proved the format works (the team won State and Regional with this app), but it is one keyboard platformer — a booth crowd seeing the same mechanic twice would not show range.
- The map (`GAME/screens/map.js`) and `state.js` already define and auto-unlock `habit-harbor` after Bias Breaker is cleared, but clicking it falls through to the `island-intro` "Coming Soon" placeholder.
- User direction (this session): primary player is the **booth walk-up kid**; the lesson is delivered **through the quiz questions**; the island **must feel clearly different** from Bias Breaker.

## Proposed Solution

Build **Bad-Habit Harbor** as a **top-down single-screen harbor maze**. The player steers a small boat (the citizen kid aboard) through water channels walled by docks/crates to reach **5 stranded helper-bots**, each visibly glitching with a bad habit. Driving into a bot opens a **tappable quiz** drawn from `quizData["bad-habits"]`; a correct answer **fixes the bot (glitch-red → happy-green) and lifts a gate** that opens the next stretch of maze. Rescue all 5, drive through the harbor-mouth gate, and the island is healed → celebration → Privacy Vault unlocks.

This approach was chosen over a tap-only "Bot Repair Bay" and a fast "Arcade" because the user explicitly wanted a fuller, more game-like experience that matches the original roadmap blurb ("teamwork puzzles in the harbor maze"). The booth-walk-up priority is protected by **on-screen D-pad controls (plus keyboard)**, a **no-fail design** (no drowning/lava/respawn; every gate is openable by answering), and **drive-into-bot auto-triggering** the quiz (no extra button to discover). It reuses ~70% of the Bias Breaker runtime (game loop, HUD, banner, sound, celebration, cleanup, refresh-persist, router pattern, question adapter), so the new work is concentrated in the maze model, top-down movement, and the rescue interaction.

## Key Hypothesis

We believe a **no-fail top-down harbor maze that gates progress behind "fix the AI's bad habit" quizzes** will **teach the bad-habits pillar to an unguided booth kid** for **walk-up players aged ~8–13**.
We'll know we're right when **a booth kid completes the island start-to-finish with no adult explaining (a), can name one AI bad habit and its fix afterward (b), and the play experience reads as clearly different from Bias Breaker (c)**.

## What We're NOT Building

- **A keyboard-only platformer reskin** — would fail success-criterion (c) "different from Bias Breaker."
- **A fail-state / respawn / drowning system** — deliberately omitted for booth psychology (no public failure, no dead-time).
- **Procedural maze generation** — the maze is a single fixed, hand-authored layout (curated difficulty, ES5-simple, no pathfinding lib).
- **Scrolling camera / multi-room harbor** — single screen only (chosen for booth readability).
- **A boss fight** — Bias Breaker dropped its boss for continuous play; the maze's finale is the harbor-mouth gate, not a boss.
- **New questions / an AI quiz engine** — we source the existing `quizData["bad-habits"]` bank; the AI generator remains a later phase.
- **Changes to `state.js` unlock logic** — it already unlocks `privacy-vaults` when `habit-harbor` clears.
- **Mobile-specific layout work beyond touch-capable controls** — desktop/tablet/touchscreen at the booth is the target; phone portrait is not.

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Unguided completion | A booth kid finishes without adult help | Playtest observation (finals dry-run + home test with Mishika's peers) |
| Learning takeaway | Kid names ≥1 AI bad habit + its fix after playing | Ask the kid post-play |
| Distinctiveness | Reads as clearly different from Bias Breaker | Self/observer judgment — no keyboard-runner physics, top-down maze |
| Performance | Smooth ~60fps on a Chromebook, no console errors | Manual run on Chromebook-class device |
| Automated tests | All existing + new tests pass in `GAME/test.html` | Run test suite |
| App regression | AI Glitch Buster behaves identically (visual + functional) | Manual smoke test of the main app |

## Open Questions

- [ ] Exact time→star tiers (start at ≤120s = 3★, ≤180s = 2★, >180s = 1★; tune in playtest the way Bias Breaker's tiers were tuned from 30/40 → 90/120).
- [ ] Boat art: a simple boat sprite vs. the existing parametric kid avatar seated in a boat (lean: kid-in-boat for continuity).
- [ ] Does the follower-train "teamwork" reward make v1, or defer to a polish pass? (Scoped as *Should*.)
- [ ] One maze layout for both grade bands, or a slightly simpler path for `explorer`? (Lean: one layout, tuned gentle.)
- [ ] D-pad on-screen placement on very small / very wide stages (reuse the edge-to-edge stage approach from Bias Breaker v6).

---

## Users & Context

**Primary User — the booth walk-up kid**
- **Who**: A child roughly 8–13 at the Presidential AI Challenge national-finals booth, possibly with a small crowd watching.
- **Current behavior**: Walks up cold, no instructions, short attention, may never have seen the game.
- **Trigger**: Curiosity — sees motion/color on the screen and wants to try.
- **Success state**: Drives the boat, rescues the bots by answering, reaches the harbor mouth, and walks away having taught the bots to behave — understanding that AI copies behavior and needs clear, kind guidance.

**Secondary User — the continuer**
- A kid (or Mishika's classmates / home players) progressing island-by-island after Bias Breaker. Cares about stars and completing the map.

**Secondary Audience — the finals interviewers**
- Judges evaluating the team. The island's existence and polish demonstrate roadmap execution and continued development.

**Job to Be Done**
When **I walk up to the booth with no instructions**, I want to **steer a boat and fix the glitchy helper-bots by answering what they're doing wrong**, so I can **heal the harbor and learn how AI picks up (and can drop) bad habits**.

**Non-Users**
- Phone-portrait players (target is booth touchscreen/tablet/laptop).
- The "power" at-home player wanting deep challenge — accommodated by stars, but not the design center.
- Non-readers far below the `explorer` band — the quiz text assumes early-reader literacy (same as Bias Breaker).

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | Top-down single-screen harbor maze (fixed hand-authored layout) | The core "different from Bias Breaker" experience |
| Must | 4-direction boat movement + wall collision | The navigation verb |
| Must | On-screen D-pad **and** keyboard (arrows/WASD) controls | Booth walk-up has no keyboard; must be touch/mouse capable |
| Must | 5 glitch-bots; drive-into-bot auto-opens a tappable quiz | The teaching + progression trigger |
| Must | Correct answer fixes the bot + lifts a gate; wrong = friendly explanation + new question, never punishes | Gating + the "never punish" philosophy from Bias Breaker |
| Must | `habit-harbor-questions.js` adapter sourcing `quizData["bad-habits"]` | The content engine (cloned from `bias-breaker-questions.js`) |
| Must | Win → celebration → `markIslandCleared('habit-harbor', stars)` → Privacy Vault unlocks | Closes the loop and proves the roadmap |
| Must | Time-based 1–3 star scoring | User decision; consistency with Bias Breaker |
| Must | Refresh-persist + clean exit (reuse `gg.activeIsland` + `GG._activeCleanup`) | Don't regress the hard-won Bias Breaker v12 fixes |
| Should | Rescued bots follow the boat in a cheering "teamwork" train | Honors the blurb's "teamwork" word; cheap visual payoff |
| Should | Synthesized sound effects (move blip, rescue chime, gate, win) | Reuse Bias Breaker's Web Audio helpers |
| Could | A subtle water-current animation / floating debris for ambience | Booth eye-candy |
| Could | Per-bot themed bad-habit visual (rude bot vs. rambling bot) | Deeper flavor; not required to teach |
| Won't | Fail-state, respawn, boss, scrolling camera, maze generation, new questions | Explicitly out of scope (see "What We're NOT Building") |

### MVP Scope

A single fixed harbor maze, 5 glitch-bots, D-pad + keyboard movement, drive-into-bot tappable quiz from `quizData["bad-habits"]`, correct-answer fix + gate lift, win → celebration → Privacy Vault unlock, time-based stars, refresh-persist, clean exit. (Follower-train, sound, and ambience are *Should/Could* — added if the timeline allows, cut without breaking the MVP.)

### User Flow (critical path)

```
Map → click Bad-Habit Harbor (unlocked, post-Bias-Breaker)
  → Maze loads: boat at harbor entrance, 5 glitch-bots visible behind gates, HUD "Rescued 0/5", timer starts
  → Kid drives (D-pad/keys) through open channels to the nearest reachable bot
  → Drives into bot → quiz modal (bad habit + 4 tappable answers)
       Correct → bot turns happy, gate lifts, "Rescued 1/5", (Should: bot joins follower-train)
       Wrong   → friendly "here's why" + new question (no punishment)
  → Repeat until "Rescued 5/5" → harbor-mouth boom gate opens
  → Drive through the harbor mouth → celebration overlay (confetti, time, stars)
       → markIslandCleared('habit-harbor', stars) → Privacy Vault unlocked
  → Back to Map: Bad-Habit Harbor shows cleared + stars; Privacy Vault now glows
```

---

## Technical Approach

**Feasibility**: **MEDIUM** — reuses ~70% of the Bias Breaker runtime; new work is concentrated and lower-risk than the platformer's physics.

**Architecture Notes**

Files (mirrors the Bias Breaker file shape under `GAME/screens/`):

```
GAME/
├── screens/
│   ├── habit-harbor.js              ← NEW. Orchestrates the maze: canvas, loop, movement, rescue, win.
│   ├── habit-harbor-questions.js    ← NEW. Adapter → quizData["bad-habits"] (clone of bias-breaker-questions.js).
│   ├── habit-harbor-maze.js         ← NEW. The hand-authored maze data model (grid, walls, bot spawns, gates) + helpers.
│   ├── habit-harbor-celebration.js  ← NEW. Win screen (clone of bias-breaker-celebration.js, harbor copy).
│   └── ...existing screens unchanged...
├── glitch-guardians.css             ← MODIFIED. Add .gg-hh-* styles (maze, D-pad, quiz modal, bots, gates, celebration).
└── glitch-guardians.js              ← MODIFIED. Router special-case: unlocked habit-harbor → habit-harbor.js (mirrors the bias-breaker branch).
```

- **No `state.js` change** — `markIslandCleared('habit-harbor', stars)` already exists and already unlocks `privacy-vaults`.
- **Rendering**: HTML5 `<canvas>` 2D, single logical resolution scaled by CSS to fill the stage (same approach as Bias Breaker). Top-down: water tiles, dock/crate walls, gates, bots, boat.
- **Movement**: position += velocity per axis with a "stop if the target cell is a wall" AABB check. No gravity. Grid-aligned walls; the boat can move freely within channels.
- **Controls**: keyboard handlers (arrows/WASD) reused from Bias Breaker + new on-screen D-pad (four large buttons with `pointerdown`/`pointerup` setting the same key-state flags — one input model, two surfaces).
- **Quiz**: reaching a bot sets `isPaused` and shows a tappable modal (4 big buttons). Reuse the shuffle + correct-index handling from the question adapter; reuse the "wrong = explain + new question" loop.
- **Reused wholesale**: rAF loop skeleton, HUD builder pattern, floating banner, Web Audio sfx helpers, celebration confetti, `GG._activeCleanup` cleanup, `gg.activeIsland` refresh-persist, the router/`onComplete({cleared, stars})` contract.

**Technical Risks**

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| On-screen D-pad feels laggy or fights keyboard input | M | Single shared key-state object; D-pad buttons just set/clear the same flags. Test press-and-hold + multitouch early. |
| Maze layout has an unreachable bot/dead-end after a gate | M | Gates only ever *open* more maze; author the layout so rescuing in any reachable order always exposes the next bot. Add a test asserting all 5 bots + exit are reachable from spawn given gates open on rescue. |
| Top-down collision lets the boat clip through thin walls at speed | M | Cap per-frame movement to < wall thickness; resolve collision per-axis (move X then resolve, move Y then resolve). |
| "Different from Bias Breaker" not actually felt | L | Top-down + no-jump + no-fail + D-pad is structurally different; validate in playtest. |
| Regressing the Bias Breaker refresh/exit fixes by copy-paste drift | M | Reuse the exact cleanup + activeIsland patterns; add the island to the same DOMContentLoaded resume logic. |
| Scope creep via follower-train / per-bot art | M | Both are Should/Could; MVP defined without them. |

---

## Implementation Phases

<!--
  STATUS: pending | in-progress | complete
  PARALLEL: phases that can run concurrently
  DEPENDS: phases that must complete first
  PRP: link to generated plan file once created
-->

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|
| 1 | Foundation & maze model | Question adapter, maze data model, router wiring, static render of maze + boat, tests | complete | - | - | `.claude/PRPs/plans/completed/bad-habit-harbor-phase-1.plan.md` |
| 2 | Movement & controls | Top-down 4-dir movement, wall collision, on-screen D-pad + keyboard, water/wall rendering | pending | - | 1 | - |
| 3 | Bots, rescue & gates | Bot entities + glitch art, drive-into-bot quiz modal, correct=fix+lift gate, wrong=explain+new Q, HUD (rescued X/5, timer) | pending | - | 2 | - |
| 4 | Win, celebration & polish | Harbor-mouth gate, celebration clone, time-based stars, mark cleared→unlock, refresh-persist, cleanup, (Should) followers + sfx, PLAYTEST + QA | pending | - | 3 | - |

### Phase Details

**Phase 1: Foundation & maze model**
- **Goal**: A static Bad-Habit Harbor screen renders a fixed maze with the boat placed; content + routing plumbed.
- **Scope**: `habit-harbor-questions.js` (clone of bias adapter, source `quizData["bad-habits"]`, fallback pool for test.html); `habit-harbor-maze.js` (grid layout, wall map, 5 bot spawn points, gate definitions, reachability helper); router special-case in `glitch-guardians.js`; base `.gg-hh-*` CSS; tests (adapter returns N questions of valid shape; maze: all 5 bots + exit reachable from spawn when gates open on rescue).
- **Success signal**: Clicking Bad-Habit Harbor (unlocked) shows the maze + boat, no console errors; new tests pass in `test.html`.

**Phase 2: Movement & controls**
- **Goal**: The kid can drive the boat around the maze on touch and keyboard.
- **Scope**: shared key-state input; keyboard arrows/WASD; on-screen D-pad (4 buttons, pointer events); per-axis wall collision; water + dock-wall rendering; single-screen (no camera).
- **Success signal**: Boat moves smoothly in 4 directions, cannot pass walls, works via both D-pad taps and keys on a Chromebook at ~60fps.

**Phase 3: Bots, rescue & gates**
- **Goal**: The full teach-and-progress loop works.
- **Scope**: 5 bot entities with glitch animation; collision with a bot opens the tappable quiz modal (pauses movement); correct → bot transforms + its gate lifts + "Rescued X/5"; wrong → friendly explanation + new question (never punishes); HUD with rescued count + timer; question no-repeat within a run.
- **Success signal**: Rescuing all 5 bots in any reachable order opens the path to the harbor mouth; wrong answers never block or punish.

**Phase 4: Win, celebration & polish**
- **Goal**: A complete, shippable island that closes the loop and unlocks the next.
- **Scope**: harbor-mouth boom gate after 5/5; drive-through win; celebration overlay (clone, harbor copy, confetti, time + stars); time-based star tiers; `markIslandCleared('habit-harbor', stars)` → Privacy Vault unlock + map reflects cleared/unlocked; refresh-persist via `gg.activeIsland`; clean exit via `GG._activeCleanup`; (Should) follower-train + synthesized sfx; extend `GAME/PLAYTEST.md`; final QA + main-app regression check.
- **Success signal**: Full playthrough from map → maze → win → map with Privacy Vault unlocked, no console errors; refresh mid-maze resumes; Back-to-App exits cleanly; all tests pass.

### Parallelism Notes

Phases are essentially linear (each builds on the previous runtime). Within Phase 1, the question adapter is independent of the maze model and could be written in parallel, but the phase is small enough to do sequentially. Phase 4's *Should* items (followers, sfx) are independent of each other and can be added or cut individually.

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Core mechanic | Top-down Harbor Maze | Tap-only Bot Repair Bay; fast Arcade | User choice; matches roadmap blurb; fuller game feel while still booth-viable |
| Controls | On-screen D-pad + keyboard | Tap-to-move pathfinding; keyboard-only | Universal across touchscreen/tablet/mouse/laptop; protects booth walk-up; reuses key-state input |
| Maze size | Single-screen, 5 bots | Multi-room (3 linked); scrolling open harbor | Booth readability (no camera), mirrors Bias Breaker's 5, fits a short session |
| Scoring | Time-based stars | Accuracy-based; both | User choice; consistency with Bias Breaker |
| Fail behavior | No fail-state | Drowning/respawn like Bias Breaker's lava | Booth psychology — no public failure, no dead-time, always-forward progress |
| Quiz trigger | Drive into bot (collision) | Press a button near bot | Booth-simple; nothing to discover |
| Content source | `quizData["bad-habits"]` via adapter | Hand-author new questions | ~60 ready questions already in the app; reuse the proven adapter pattern |
| State changes | None | Add new unlock logic | `markIslandCleared` already unlocks `privacy-vaults` |

---

## Research Summary

**Market Context**
This is an internal educational mini-game, not a commercial product, so market research is light. The relevant "market" is the prior island: Bias Breaker established the format (canvas + quiz-gated progression + celebration + island unlock) that won State and Regional. The design intent for the maze is to demonstrate *range* across that proven format rather than to differentiate against external competitors.

**Technical Context**
Codebase grounding (this session):
- `quizData["bad-habits"]` exists in `index.html` (~60 questions, lines 1878–2468), same shape as `quizData.bias` (`{ question, options:[4], correct: index }`, correct at index 0 by convention, shuffled at display). The bank splits into "how do we fix it?" and "what habit is this?" flavors — both teach the pillar.
- `GAME/screens/bias-breaker-questions.js` is a thin adapter over `quizData.bias` with an in-bundle fallback — clones directly to `habit-harbor-questions.js`.
- `GAME/state.js` `markIslandCleared(islandId, stars)` already sets cleared/stars and unlocks the next island in order (`habit-harbor` → `privacy-vaults`). No change needed.
- `GAME/screens/map.js` already lists `habit-harbor` (🌊 Bad-Habit Harbor) and renders unlock state from the profile.
- `GAME/glitch-guardians.js` routes `bias-breaker` (when unlocked) to real gameplay and everything else to the `island-intro` "Coming Soon" card — add a parallel branch for `habit-harbor`.
- Reusable runtime in `GAME/screens/bias-breaker.js`: rAF loop, HUD builder, floating banner, Web Audio sfx, `GG._activeCleanup`, `gg.activeIsland` refresh-persist, and the `onComplete({cleared, stars})` router contract.

---

*Generated: 2026-05-28*
*Status: DRAFT — needs validation*
