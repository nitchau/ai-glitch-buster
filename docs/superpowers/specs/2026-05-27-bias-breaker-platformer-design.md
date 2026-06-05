# Glitch Guardians — Bias Breaker Platformer (Phase 2)

**Project:** Glitch Guardians, inside `AI Glitch Buster` web app
**Phase:** 2 of N — first real island gameplay
**Date:** 2026-05-27
**Authors:** Mishika & team, Nitin, Claude Opus 4.7
**Status:** Draft — awaiting user review
**Builds on:** Phase 1 shell (`docs/superpowers/specs/2026-05-26-glitch-guardians-shell-design.md`, tag `gg-phase1-shell`)

---

## 1. Purpose

Replace the Bias Breaker "Coming Soon" intro card with **playable platformer gameplay**: a side-scrolling 2D level where the player runs and jumps across 5 platforms, answers a fairness/bias question at each gap to make the next platform appear, then defeats the "Unfair Gatekeeper" boss with 3 final questions. Win → mark Bias Breaker cleared → unlock Habit Harbor → celebration screen.

This is the first real **game loop** in the project: real-time input, physics, animation, win/lose conditions. It establishes the runtime architecture that Phases 5+ (the other 3 islands) will plug their own gameplay into.

## 2. Scope

### In scope for Phase 2

- A new screen `GAME/screens/bias-breaker.js` that *replaces* the island-intro for Bias Breaker (other islands keep their "Coming Soon" intros for now).
- HTML5 `<canvas>` rendering for background, platforms, and boss.
- An inline SVG **player avatar** layered on top of the canvas, animated each frame.
- Player physics: gravity, jumping, horizontal movement, ground/platform collision.
- Controls: **A / Left Arrow** = left, **D / Right Arrow** = right, **Space / W / Up Arrow** = jump.
- 5 platform segments with gaps. Each gap is initially impassable; answering a question correctly spawns the next platform.
- A **question modal** that pauses the game when the player reaches a gap. Multiple-choice (4 options, shuffled). Wrong = explanation + a NEW question loaded; never punishes by falling.
- A **boss encounter** after platform 5: the "Unfair Gatekeeper" requires 3 correct questions to defeat. Each correct hit shows the gatekeeper visually weakening; each wrong loads a new question (no damage to player).
- **Fall = section restart** (current platform segment only — not whole level). The player respawns on the last cleared platform.
- A small set of **8 hand-authored questions** in a JSON file (5 for traversal + 3 for boss — randomly selected at run time, never repeating in one playthrough).
- **Celebration screen** on win: confetti, story text ("You freed the city's game-and-sports AI!"), star count (1-3 based on falls), "Back to Map" button, and the island marked cleared in `state.js` → Habit Harbor unlocked.
- Persistent updates to `gg.profile.progress["bias-breaker"]`: `unlocked: true` (unchanged), `cleared: true` (new), `stars: 1-3` (new), `attempts` count (new), `lastQuestionsSeen` array of question IDs (for no-repeat tracking).
- Story-arc bonus: when Habit Harbor unlocks, the corresponding confused-kid (top-right on the map) gets a "freed" variant on the next map render.

### Out of scope for Phase 2

- AI Quiz Engine and Guardian Watch validator (Phases 3 & 4 — Phase 2's question pool is hand-written).
- Other islands' gameplay (Phases 5+).
- Avatar customization picker (player gets a default citizen avatar; picker is Phase 5+).
- Sound effects and music (can be a Phase 2.5 polish pass if requested).
- Mobile/touch controls (Phase 2 is desktop-first; touch controls are a follow-up).
- Multiplayer / class codes / leaderboards (much later phase).
- Internationalization.
- Infection system / reform-or-defeat choice (later phases).
- More than 8 questions in the bias pool (Phase 3 introduces AI generation for unlimited questions).

## 3. Architecture

### Files added or modified

```
GAME/
├── screens/
│   ├── bias-breaker.js              ← NEW. Main Phase 2 screen: canvas + game loop.
│   ├── bias-breaker-questions.js    ← NEW. Hand-authored question pool (8 items).
│   ├── bias-breaker-avatar.js       ← NEW. Builds + animates the player SVG.
│   ├── bias-breaker-boss.js         ← NEW. Renders the Unfair Gatekeeper on canvas.
│   ├── bias-breaker-celebration.js  ← NEW. Win screen.
│   └── ...existing screens unchanged...
├── glitch-guardians.css             ← MODIFIED. Add .gg-bb-* styles for level + modal + celebration.
└── glitch-guardians.js              ← MODIFIED. Router gets a special-case: clicking
                                       Bias Breaker (when unlocked) routes to bias-breaker.js
                                       instead of island-intro.js.
```

State persistence:

```
GAME/state.js                        ← MODIFIED. Add markIslandCleared(islandId, stars).
                                       Updates progress, sets cleared=true, awards stars,
                                       and unlocks the next island in island-order.
                                       Add 2 new unit tests covering this.
```

Test file:

```
GAME/test.js                         ← MODIFIED. Add 5 new tests covering markIslandCleared
                                       and the question pool's structural invariants.
```

Visual order (z-index inside the level screen):

```
┌─ rootEl (gg-screen container) ──────────────────┐
│  ┌─ .gg-bb-stage (positioned wrapper) ────────┐ │
│  │  <canvas class="gg-bb-canvas">             │ │  Layer 0: background + platforms + boss
│  │  <svg class="gg-bb-avatar">                │ │  Layer 1: player kid (absolutely positioned)
│  │  <div class="gg-bb-hud"> (stars, lives)    │ │  Layer 2: HUD
│  └──────────────────────────────────────────  │ │
│  <div class="gg-bb-modal" hidden>             │ │  Layer 10: question modal (when shown)
│  <div class="gg-bb-celebration" hidden>       │ │  Layer 20: win screen (when shown)
└──────────────────────────────────────────────  ┘
```

### How it integrates with the router

In `glitch-guardians.js`, the `goToIslandIntro(screenEl, profile, islandId)` function checks:

```js
function goToIslandIntro(screenEl, profile, islandId) {
  if (islandId === 'bias-breaker' && profile.progress['bias-breaker'].unlocked) {
    // Real gameplay
    GG.screens.biasBreaker.render(screenEl, profile, function(result) {
      // result: { cleared: bool, stars: 0-3 }
      if (result.cleared) {
        GG.state.markIslandCleared('bias-breaker', result.stars);
      }
      // reload profile and re-render map (now with Habit Harbor unlocked)
      var freshProfile = GG.state.load() || profile;
      goToMap(screenEl, freshProfile, true);
    });
  } else {
    // Fallback to "Coming Soon" intro for everything else
    GG.screens.islandIntro.render(screenEl, islandId, function() {
      goToMap(screenEl, profile, true);
    });
  }
}
```

## 4. Components (each file's job)

### `GAME/screens/bias-breaker.js`

**Job:** orchestrate the whole Bias Breaker level — set up canvas, manage the game state, run the game loop, show modals, transition to celebration.

**Public interface:**
- `GG.screens.biasBreaker.render(rootEl, profile, onComplete)` — paints the level. Calls `onComplete({ cleared: bool, stars: 0-3 })` when the player wins, gives up (via Back to Map), or runs out of time.

**Internal game state:**
- `currentSegment` (0–4 for the 5 platforms, or `'boss'`)
- `playerX`, `playerY`, `playerVX`, `playerVY` (position + velocity in canvas pixels)
- `facing` (`'left'` | `'right'`)
- `onGround` (boolean)
- `falls` (counter for stars calculation)
- `seenQuestionIds` (array — never repeat within one playthrough)
- `bossHP` (3 when boss appears, decremented on each correct boss question)
- `isPaused` (true while a modal is open)
- `running` (false on exit/cleanup)

**Game loop:**
- `requestAnimationFrame` driven; target 60fps
- Each tick: read input → update physics → check collisions → check gap-reach → render canvas → render avatar → check win condition

**Cleanup:**
- On `onComplete` callback, sets `running = false`, removes keyboard listeners, releases canvas.

### `GAME/screens/bias-breaker-questions.js`

**Job:** hand-authored question pool. Loaded synchronously at level start.

**Shape:**
```js
GG.biasBreakerQuestions = [
  {
    id: 'bb-001',
    grade: 'both',           // 'explorer' | 'guardian' | 'both'
    question: "A game AI keeps rejecting players just because of their school. What's wrong with that?",
    options: [
      { text: 'Nothing — schools matter',                       correct: false, explanation: "School shouldn't decide if you get to play." },
      { text: "It's unfair to judge people by their group",      correct: true,  motivation: 'Exactly! Fair AI treats everyone the same.' },
      { text: 'Only newer schools count',                        correct: false, explanation: 'Age of school has nothing to do with playing.' },
      { text: 'The AI should pick only winners',                 correct: false, explanation: 'That would just keep some people locked out.' }
    ]
  },
  // ... 7 more (5 traversal + 3 boss-tier)
];
```

### `GAME/screens/bias-breaker-avatar.js`

**Job:** build the player avatar SVG (re-using the existing parametric `buildKid()` pattern from `map.js`) and provide a per-frame update function that animates the limbs based on state (idle / running / jumping / falling) and facing direction.

**Public interface:**
- `GG.biasBreakerAvatar.build(initialState)` → returns the SVG element
- `GG.biasBreakerAvatar.update(svg, state)` — called each frame; mutates the SVG's limb positions and translation to match `{ x, y, facing, animState }`

**Animation states:**
- `idle`: gentle bob
- `running`: legs alternate, arms swing
- `jumping`: legs tuck, arms reach up
- `falling`: arms windmill slightly

Implementation: each animState corresponds to a small set of leg/arm path data. The update function swaps the `d` attribute of the limb paths each frame.

### `GAME/screens/bias-breaker-boss.js`

**Job:** the Unfair Gatekeeper boss. Drawn on canvas (not SVG, since it's a one-off enemy at the end). Owns its own animation state.

**Public interface:**
- `GG.biasBreakerBoss.draw(ctx, state)` — renders the gatekeeper sprite into the canvas context based on `{ hp, animationTime, hitFlash }`

**Visual:** a tall geometric figure (rounded rectangle body, square head, glowing red "eyes" that are X's). Each correct answer cracks one of its segments and dims the glow. Defeated state: collapses into pixels that float upward.

### `GAME/screens/bias-breaker-celebration.js`

**Job:** the win screen. Confetti animation, story text, star count, Back to Map button.

**Public interface:**
- `GG.biasBreakerCelebration.show(rootEl, { stars, onContinue })` — paints the celebration overlay; calls `onContinue()` when the player clicks Back to Map.

**Star calculation:**
- 0 falls → 3 stars
- 1-2 falls → 2 stars
- 3+ falls → 1 star

(Min 1 — every completion is worth a star.)

### `GAME/state.js` (modified)

Add:
```js
GG.state.markIslandCleared = function(islandId, stars) {
  var profile = load();
  if (!profile) return { ok: false, reason: 'no-profile' };
  if (!profile.progress[islandId]) return { ok: false, reason: 'unknown-island' };

  profile.progress[islandId].cleared = true;
  profile.progress[islandId].stars = Math.max(profile.progress[islandId].stars || 0, stars);

  // Unlock next island in canonical order
  var order = ['bias-breaker', 'habit-harbor', 'privacy-vaults', 'reality-tower', 'the-core'];
  var idx = order.indexOf(islandId);
  if (idx >= 0 && idx + 1 < order.length) {
    var next = order[idx + 1];
    profile.progress[next].unlocked = true;
  }
  return save(profile);
};
```

Tests added (5 total new):
1. `markIslandCleared('bias-breaker', 2)` sets `cleared=true`, `stars=2`
2. `markIslandCleared('bias-breaker', 2)` then `('bias-breaker', 3)` keeps stars at 3 (best-of)
3. `markIslandCleared('bias-breaker', 1)` unlocks `habit-harbor`
4. `markIslandCleared('the-core', 3)` does NOT crash (no next island to unlock)
5. Question pool sanity: exactly 8 items, each with `id`, `question`, exactly 4 options, exactly 1 correct

## 5. Game flow

```
   Map screen
       │
       │ click Bias Breaker (unlocked)
       ▼
   Bias Breaker level loads:
   - Canvas painted with neon-cyber background (parallax scan-lines, faint digital rain)
   - First platform visible; player avatar spawned on it
   - HUD shows "Platforms: 0/5"
       │
       ▼
   Player moves right with A/D + Space
       │
       │  reaches gap edge
       ▼
   Game pauses → Modal appears (4 shuffled options + question text)
       │
   ┌───┴───┐
   │       │
   Correct Wrong
   │       │
   │       └─→ "Here's why: <explanation>" → load NEW question → reshow modal
   │
   ▼
   Platform spawns across the gap with a brief "data assembling" animation
   Modal closes, game resumes, player jumps onto the new platform
   HUD updates: "Platforms: 1/5"
   ... repeat for 4 more platforms ...
       │
       ▼
   Final platform reached → boss arena appears
   Unfair Gatekeeper drops down (boss HP = 3)
   Modal appears with a boss question
       │
   ┌───┴───┐
   Correct Wrong
   │       │
   │       └─→ explanation + new boss-tier question
   │
   ▼
   Hit lands → bossHP -= 1, visual crack animation
   ... repeat until bossHP = 0 ...
       │
       ▼
   Boss collapses → celebration screen overlays
   Stars awarded (3 = no falls, 2 = 1-2 falls, 1 = 3+ falls)
   state.markIslandCleared('bias-breaker', stars) called
   "Habit Harbor unlocked!" toast
       │
       │ click Back to Map
       ▼
   Map re-renders: Bias Breaker shows cleared (small star count), Habit Harbor now unlocked.
   Top-right confused kid (Bad-Habit Harbor's citizen) gets "freed" variant pose.
```

### Fall behavior
If the player falls off a platform:
- 200ms fade-to-black
- Respawn on the last cleared platform with the next gap's question state intact
- `falls` counter increments
- No "lives" — players can fall infinite times. Stars at the end reflect the total falls.

### Pause behavior
- Pressing Escape opens a tiny pause overlay with "Resume" and "Back to Map" buttons
- Back to Map = same as winning except `cleared` is NOT set (it's a give-up exit)

## 6. Visual style

- **Background**: canvas filled with a deep navy-purple gradient. Faint horizontal scan-lines (1px every 4px, opacity 0.04). Slow vertical "digital rain" — short cyan vertical streaks drifting upward at varying speeds.
- **Platforms**: rounded rectangles with a greenish-blue glow (matching the GDD's "greenish-blue platforms" spec). Each platform has a faint pulsing inner light.
- **Player avatar**: parametric kid SVG (re-used from `map.js`'s `buildKid()` pattern), default = the bottom-left citizen design (blonde curly + green shirt) but with a confident pose (no frown, eyes open and forward-looking). Sits at z-index above canvas.
- **Boss**: large hand-drawn cyber-gatekeeper using canvas rounded-rect + line drawing. Red X-shaped eyes that glow. Each correct hit cracks a body segment.
- **HUD**: top-left of the stage, shows "Platforms: X/5" and a small heart-row only present during the boss fight ("HP: 3 → 2 → 1 → 0").
- **Modal**: slides up from bottom, full-width band on bottom 40% of the screen. White background, dark navy text, large readable font (~22px on desktop). 4 answer buttons stacked, kid-finger sized.
- **Celebration**: confetti (canvas particles), big "You freed the city!" headline, animated star pips fill in (1, 2, or 3), unlock notification toast.

## 7. Game loop & physics

```js
var GRAVITY     = 0.8;   // px/frame^2
var JUMP_SPEED  = -14;   // negative = upward
var WALK_SPEED  = 4;     // px/frame
var FRICTION    = 0.85;  // multiplier per frame on ground
```

Each tick:
1. **Read input**: hold-state of A/D/Left/Right/Space/W/Up. Touch fallback later.
2. **Update velocity**:
   - If left held: `vx = -WALK_SPEED`
   - If right held: `vx = WALK_SPEED`
   - If neither held + on ground: `vx *= FRICTION`
   - If space pressed AND `onGround`: `vy = JUMP_SPEED`, `onGround = false`
   - Always: `vy += GRAVITY`
3. **Apply velocity**: `x += vx`, `y += vy`
4. **Collision check**: for each platform, if player rect overlaps and player was above last frame, snap to top: `y = platform.top - playerHeight`, `vy = 0`, `onGround = true`
5. **Check fall**: if `y > canvasHeight + 100`, trigger fall → fade → respawn
6. **Check gap-reach**: if at the right edge of the current platform AND next platform doesn't exist yet, pause and show the next unanswered question
7. **Render canvas**: clear → draw background → draw platforms (only those answered into existence + the starting one) → draw boss (if at boss segment)
8. **Render avatar SVG**: position `translate(playerX, playerY)`, set `scaleX(-1)` if facing left, set animState based on `vx` and `onGround`

## 8. Error handling & edge cases

| Trigger | Handling |
|---|---|
| Player presses keys while modal is open | Input ignored — modal has its own keyboard handler (Tab to switch options, Enter to select) |
| Player exits via Back to App during gameplay | Cleanup: cancel rAF, remove keypress listeners, save current `falls` to profile, exit. No partial-win. |
| All 8 questions exhausted before boss defeated | The pool should never exhaust under normal play (5 + 3 = 8 minimum needed). If somehow exhausted (wrong answers eating multiple Qs), reuse the LEAST recently seen question. |
| `markIslandCleared` called with unknown ID | Returns `{ ok: false, reason: 'unknown-island' }`. No crash. |
| `markIslandCleared('the-core', ...)` | Sets cleared on The Core but skips the "unlock next" step (no next island). |
| localStorage blocked at win time | `markIslandCleared` returns `{ ok: false, reason: 'storage-blocked' }`. Celebration still shows but a small banner appears: "Couldn't save your progress — play again to keep it." |
| Browser back button during gameplay | Same as Phase 1: history popstate triggers `doExit` → game loop is cancelled. |
| Canvas resize | Game uses fixed internal coordinates (800×500 logical), Canvas scales via CSS to fit. No physics re-tuning needed. |

## 9. Testing

### Automated (Phase 2 additions to `GAME/test.js`)

1. `markIslandCleared('bias-breaker', 2)` sets cleared=true, stars=2 in the profile.
2. `markIslandCleared('bias-breaker', 2)` then `('bias-breaker', 3)` keeps stars at 3 (best-of).
3. `markIslandCleared('bias-breaker', 1)` sets `progress['habit-harbor'].unlocked = true`.
4. `markIslandCleared('the-core', 3)` does NOT crash and does NOT touch any non-existent next island.
5. Question pool: exactly 8 items, each with `id`, `question`, exactly 4 options, exactly 1 correct.

Total tests after Phase 2: **7 (existing) + 5 (new) = 12 automated tests**.

### Manual playtest (extend `GAME/PLAYTEST.md`)

Add a section for Bias Breaker:
- Click Bias Breaker from the map → level loads, neon cyber background, player avatar visible on starting platform
- Press D — player runs right; avatar legs alternate; faces right
- Press A — avatar flips to face left; runs left
- Press Space — avatar jumps; descends with gravity; lands on a platform
- Walk to right edge of starting platform — game pauses, question modal appears with 4 options
- Pick wrong answer — friendly explanation shows, then a new question loads
- Pick right answer — explanation disappears, platform spawns across the gap with a brief "assemble" animation, modal closes, game resumes
- Repeat 4 more times → boss arena appears
- Boss Unfair Gatekeeper visible; HP indicator shows 3 hearts
- Modal appears with a boss-tier question; correct hit cracks one body segment, dims one eye
- 3 correct hits → boss collapses; celebration overlay shows with confetti
- Click Back to Map → map re-renders; Bias Breaker shows cleared with star count; Habit Harbor now glows (unlocked)
- Top-right map citizen (Bad-Habit Harbor's representative) shows "freed" pose

### Edge case manual checks

- Fall off a platform → fade-to-black → respawn on last cleared platform → questions state preserved
- Press Escape mid-jump → pause overlay → Resume → game continues from same state
- Press Back to App mid-level → main app returns, profile not marked cleared (only marked at celebration)

### Not in Phase 2 (deferred)

- Playwright automated UI tests for the platformer (manual is enough for this phase)
- Performance benchmarking (we're not pushing limits)

## 10. Success criteria

Phase 2 is done when:

1. A fresh user can: launch the game, complete onboarding, click Bias Breaker, play through 5 platforms answering questions, defeat the Gatekeeper, see the celebration, return to the map, and find Habit Harbor unlocked — **without seeing a console error**.
2. All 12 automated tests in `GAME/test.html` pass.
3. The expanded `GAME/PLAYTEST.md` passes 100%.
4. The existing AI Glitch Buster app behavior is unchanged (visual + functional).
5. A returning player's saved progress correctly preserves cleared state + stars.
6. The game runs at a smooth ~60fps on a typical Chromebook (no jank, no frame stutters during platform spawns).
7. Code organized: Phase 2 adds at most 5 new files under `GAME/screens/` plus modifications to `state.js`, `glitch-guardians.js`, and `glitch-guardians.css`.

## 11. Risks & Open Questions

| Risk | Mitigation |
|---|---|
| Limb animation on the SVG kid feels janky if updated naively | Pre-compute 4 pose-keyframes per animState; lerp between them. ~150 lines of avatar code. |
| Canvas + SVG hybrid layering has unexpected event-handling quirks | Avatar SVG gets `pointer-events: none` since we use keyboard input only. |
| Hand-authored questions feel repetitive across replays | 8 questions for 5+3 = 8 needed, so often re-played in same order. Phase 3's AI engine fixes this fully. For Phase 2, shuffle the order each playthrough and only repeat if exhausted (never expected). |
| Kids on phones/iPads can't play (no keyboard) | Phase 2 desktop-only. Document this. Phase 2.5 can add tap-to-jump + on-screen left/right buttons. |
| Star calculation feels harsh | Default thresholds (0 falls = 3★, 1-2 = 2★, 3+ = 1★) tunable via constants — verify in playtest with kids. |
| Story arc: when Habit Harbor unlocks, the corner citizen needs a "freed" variant | Reuse `buildKid` with a new pose option (smile + thumbs-up) — small extension to the parametric function. |

**Open questions for the implementation step:**

1. **Default avatar choice:** Pick one of the 4 citizen designs as the player's default avatar (leaning toward the bottom-left "shrugger" — blonde curly + green shirt — feels approachable). Final choice during implementation.
2. **Color palette numbers**: greenish-blue for platforms — pick exact `#43e97b` vs `#38f9d7` vs blend, during implementation.
3. **Confetti style**: square pixels (cyber) or round circles (friendly)? Default cyber, can tweak.

These don't block the spec; they get answered during the build.

## 12. What Phase 3 will bring (preview, NOT in this spec)

Phase 3 replaces `bias-breaker-questions.js`'s hand-authored pool with the **AI Quiz Engine** (Model A) that generates fresh questions on demand. The game loop and modal stay identical — only the question source swaps.

Phase 4 introduces Guardian Watch (Model B) which validates every question Model A produces before it ever reaches the kid.

Phase 5+ extends the same gameplay framework to Bad-Habit Harbor (teamwork maze), Privacy Vault (stealth), Hallucination Tower (climbing puzzle), and finally The Core escape room. Each gets its own design doc.

---

*Awaiting Nitin's review. Once approved, implementation plan is drafted via `everything-claude-code:prp-plan`.*
