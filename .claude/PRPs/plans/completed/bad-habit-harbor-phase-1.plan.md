# Plan: Bad-Habit Harbor — Phase 1 (Foundation & maze model)

## Summary
Stand up the skeleton of the second island, Bad-Habit Harbor: a question adapter over the app's existing `quizData["bad-habits"]` bank, a hand-authored top-down maze data model with a solvability guarantee, the router wiring, base CSS, and a minimal screen that renders the static maze + boat. No movement, rescue, or win yet — those are Phases 2–4.

## User Story
As a kid who just cleared Bias Breaker, I want clicking Bad-Habit Harbor to open a real harbor-maze screen (boat, water, dock walls, glitchy bots, gates) instead of a "Coming Soon" card, so that the next island feels like it has actually begun.

## Problem → Solution
Clicking the unlocked `habit-harbor` island routes to the generic `island-intro` "Coming Soon" card → Clicking it routes to a new `GG.screens.habitHarbor` screen that draws a fixed, solvable harbor maze with the boat at the entrance, backed by a real bad-habits question pool and covered by automated tests.

## Metadata
- **Complexity**: Medium
- **Source PRD**: `.claude/PRPs/prds/bad-habit-harbor.prd.md`
- **PRD Phase**: Phase 1 — Foundation & maze model
- **Estimated Files**: 4 new (`habit-harbor-questions.js`, `habit-harbor-maze.js`, `habit-harbor.js`, + tests in existing `test.js`), 4 modified (`glitch-guardians.js`, `glitch-guardians.css`, `index.html`, `GAME/test.html`)

---

## UX Design

### Before
```
Map → click Bad-Habit Harbor (🌊, unlocked)
        ↓
┌───────────────────────────────┐
│  🌊  Bad-Habit Harbor          │
│  Topic: Bad Habits in AI       │
│  "Glitch infected the bots..." │
│  🚧 Coming Soon!               │
│  [← Back to Map]               │
└───────────────────────────────┘
```

### After
```
Map → click Bad-Habit Harbor (🌊, unlocked)
        ↓
┌───────────────────────────────────────────┐
│  (dark level theme, edge-to-edge stage)    │
│  ████ dock walls ████   ~~~ teal water ~~~ │
│  🚤(boat at entrance)   🤖❓ glitch-bots   │
│  ▯ closed gates ▯       ⛵ harbor mouth (E) │
│  (static — no movement yet in Phase 1)     │
└───────────────────────────────────────────┘
```

### Interaction Changes
| Touchpoint | Before | After | Notes |
|---|---|---|---|
| Click unlocked `habit-harbor` | "Coming Soon" intro card | Static harbor-maze screen | Router special-case added |
| Exit (Back to App / browser back) | island-intro back-to-map | `GG._activeCleanup` tears down level theme + activeIsland flag | Mirrors Bias Breaker cleanup |
| Page refresh while inside | n/a (intro had no persist) | Resumes into the maze via `gg.activeIsland` | Reuses existing DOMContentLoaded resume |

---

## Mandatory Reading

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 | `GAME/screens/bias-breaker-questions.js` | 1–71 | The adapter to clone for `habit-harbor-questions.js` |
| P0 | `GAME/screens/bias-breaker.js` | 246–301, 1436–1457 | render() setup (stage/canvas/persist) + cleanup() to mirror |
| P0 | `GAME/glitch-guardians.js` | 36–57, 94–116, 133–164 | doExit(), goToIslandIntro() router branch, DOMContentLoaded resume |
| P0 | `GAME/test.js` | 1–119 | Test runner + assertion helpers + the two question-pool tests to mirror |
| P1 | `GAME/glitch-guardians.css` | 432–491 | `.gg-bb-stage/.gg-bb-active/.gg-bb-canvas/.gg-bb-overlay` to mirror as `.gg-hh-*` |
| P1 | `GAME/state.js` | 6, 65–82 | Island order + `markIslandCleared` (no change; confirms habit-harbor→privacy-vaults unlock) |
| P1 | `index.html` | 1876–2468, 3526–3536 | The `quizData["bad-habits"]` bank + the GAME `<script>` include block |
| P2 | `GAME/test.html` | 1–19 | Where to add the two new `<script>` includes |

## External Documentation
None needed — feature uses only established internal patterns (vanilla ES5 IIFE modules, `window.GG` namespace, canvas 2D, localStorage).

---

## Patterns to Mirror

### QUESTION_ADAPTER
```js
// SOURCE: GAME/screens/bias-breaker-questions.js:12-71
GG.biasBreakerQuestions = (function() {
  var FALLBACK = [
    { question: "...", options: ["correct","b","c","d"], correct: 0 },
    // ...8 items...
  ];
  function getSource() {
    try {
      if (typeof quizData !== 'undefined' && quizData && Array.isArray(quizData.bias) && quizData.bias.length > 0) {
        return quizData.bias;
      }
    } catch (e) { /* ignore */ }
    return FALLBACK;
  }
  function pickN(n) {
    var src = getSource(); var pool = src.slice();
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
    }
    return pool.slice(0, Math.min(n, pool.length));
  }
  function size() { return getSource().length; }
  return { pickN: pickN, size: size, getSource: getSource };
})();
```
For habit-harbor: source `quizData["bad-habits"]` (bracket key — hyphen) instead of `quizData.bias`; new FALLBACK of bad-habits questions; expose `GG.habitHarborQuestions`.

### SCREEN_RENDER_SETUP
```js
// SOURCE: GAME/screens/bias-breaker.js:246-301
function render(rootEl, profile, onComplete) {
  clearChildren(rootEl);
  var ggRoot = document.getElementById('gg-root');
  if (ggRoot) ggRoot.classList.add('gg-bb-active');               // → 'gg-hh-active'
  try { localStorage.setItem('gg.activeIsland', 'bias-breaker'); } catch (e) {}  // → 'habit-harbor'
  // ...build level/stage...
  var stageEl = document.createElement('div');
  stageEl.className = 'gg-bb-stage';                               // → 'gg-hh-stage'
  var canvas = document.createElement('canvas');
  canvas.className = 'gg-bb-canvas';                               // → 'gg-hh-canvas'
  canvas.width = CANVAS_W; canvas.height = CANVAS_H;
  stageEl.appendChild(canvas);
  rootEl.appendChild(stageEl);
  var ctx = canvas.getContext('2d');
  // ...
  requestAnimationFrame(tick);
}
```

### CLEANUP_HOOK
```js
// SOURCE: GAME/screens/bias-breaker.js:1436-1454
function cleanup() {
  state.running = false;
  document.removeEventListener('keydown', onKeyDown);
  document.removeEventListener('keyup',   onKeyUp);
  var ggRoot = document.getElementById('gg-root');
  if (ggRoot) ggRoot.classList.remove('gg-bb-active');            // → 'gg-hh-active'
  try { localStorage.removeItem('gg.activeIsland'); } catch (e) {}
  try { if (_audioCtx && _audioCtx.close) _audioCtx.close(); _audioCtx = null; } catch (e) {}
  if (window.GG && window.GG._activeCleanup === cleanup) window.GG._activeCleanup = null;
}
window.GG._activeCleanup = cleanup;
```
Phase 1 has no keyboard/audio yet, so the cleanup only needs: `state.running=false`, remove `gg-hh-active`, remove `gg.activeIsland`, release `_activeCleanup`.

### ROUTER_BRANCH
```js
// SOURCE: GAME/glitch-guardians.js:94-116 (goToIslandIntro)
function goToIslandIntro(screenEl, profile, islandId) {
  if (islandId === 'bias-breaker' &&
      profile.progress['bias-breaker'] &&
      profile.progress['bias-breaker'].unlocked &&
      GG.screens.biasBreaker) {
    GG.screens.biasBreaker.render(screenEl, profile, function(result) {
      if (result && result.cleared) {
        var saveResult = GG.state.markIslandCleared('bias-breaker', result.stars);
        if (!saveResult.ok) showSaveBanner(document.getElementById('gg-root'));
      }
      var freshProfile = GG.state.load() || profile;
      goToMap(screenEl, freshProfile, true);
    });
    return;
  }
  GG.screens.islandIntro.render(screenEl, islandId, function() {
    goToMap(screenEl, profile, true);
  });
}
```
Add a SECOND `if` block (before the islandIntro fallback) that is identical but for `'habit-harbor'` / `GG.screens.habitHarbor`.

### DOEXIT_THEME_REMOVE
```js
// SOURCE: GAME/glitch-guardians.js:48-54 (doExit)
if (ggRoot) {
  ggRoot.hidden = true;
  ggRoot.classList.remove('gg-bb-active');   // ADD a sibling line: remove('gg-hh-active')
  clearChildren(ggRoot);
}
```

### TEST_STRUCTURE
```js
// SOURCE: GAME/test.js:5-13, 102-119
function test(name, fn) {
  try { GG.state.reset(); fn(); results.push({ name: name, pass: true }); }
  catch (e) { results.push({ name: name, pass: false, error: e.message }); }
}
test('biasBreakerQuestions.pickN(5) returns 5 well-formed questions', function() {
  var qs = GG.biasBreakerQuestions.pickN(5);
  assertEq(qs.length, 5);
  qs.forEach(function(q, i) {
    assertTrue(!!q.question, 'q[' + i + '] missing question');
    assertEq(q.options.length, 4, 'q[' + i + '] should have 4 options');
    assertTrue(typeof q.correct === 'number' && q.correct >= 0 && q.correct < 4, '...');
  });
});
```

### CSS_STAGE_THEME
```css
/* SOURCE: GAME/glitch-guardians.css:432-481 — mirror each .gg-bb-* as .gg-hh-* */
.gg-bb-stage { position: relative; width: 98vw; max-width: 1900px; margin: 48px auto 20px auto;
  border-radius: 22px; overflow: hidden; box-shadow: ...; border: 1px solid rgba(67,233,123,.4); background: #0a0820; }
#gg-root.gg-bb-active { background: radial-gradient(...) , linear-gradient(135deg,#0a0820,#1a1247,#2a1857); padding:0; overflow:hidden; }
#gg-root.gg-bb-active::before, #gg-root.gg-bb-active::after { display:none; }
#gg-root.gg-bb-active .gg-screen { max-width:100%; width:100%; margin:0; position:static; display:flex; align-items:center; justify-content:center; min-height:100vh; }
#gg-root.gg-bb-active .gg-bb-stage { width:100%; max-width:100%; margin:0; border-radius:0; border:none; box-shadow:none; }
.gg-bb-canvas { display:block; width:100%; height:auto; }
```
For habit-harbor, a water-blue border tint is fine (e.g. `rgba(56,249,215,.4)`), but otherwise identical structure.

---

## Files to Change

| File | Action | Justification |
|---|---|---|
| `GAME/screens/habit-harbor-questions.js` | CREATE | Adapter over `quizData["bad-habits"]` + fallback pool |
| `GAME/screens/habit-harbor-maze.js` | CREATE | Maze layout + parser + reachability/solvability helpers |
| `GAME/screens/habit-harbor.js` | CREATE | Minimal screen: render static maze + boat, cleanup, persist |
| `GAME/glitch-guardians.js` | UPDATE | Router branch for habit-harbor + doExit `gg-hh-active` removal |
| `GAME/glitch-guardians.css` | UPDATE | `.gg-hh-*` stage/active/canvas styles |
| `index.html` | UPDATE | Add 4 `<script>` includes before `glitch-guardians.js` |
| `GAME/test.html` | UPDATE | Add 2 `<script>` includes (questions + maze) before `test.js` |
| `GAME/test.js` | UPDATE | Add question-pool tests + maze solvability/structure tests |

## NOT Building (Phase 1)
- Boat **movement**, wall collision, D-pad, keyboard input → Phase 2.
- Bot **rescue**, quiz modal, gate-lift on rescue, HUD → Phase 3.
- Win, celebration screen, time-based stars, `markIslandCleared` call, follower-train, sound → Phase 4.
- Any change to `state.js` (its unlock logic already covers habit-harbor→privacy-vaults).

---

## Maze Model Spec (the one genuinely new design)

**Grid:** 15 cols × 9 rows, `CELL = 64`px → logical canvas `960 × 576`. Single screen, no camera.

**Layout legend (ASCII rows):** `#`=wall (dock/crate), `.`=water (open), `S`=spawn, `E`=exit (harbor mouth), `1`–`5`=bot spawn cells, `a`–`e`=gate cells (gate `a` is opened by bot `1`, `b` by `2`, … `e` by `5`).

**Solvability principle — LINEAR CHAIN (guaranteed solvable):** bot *i* sits in the zone reachable after gate *i-1* opens; gate *i* (opened by bot *i*) guards the way to bot *i+1*; the exit sits beyond gate *e* (bot 5). bot 1 is in the start zone. This makes a deadlock impossible. A few cosmetic dead-end branches may be added for maze feel as long as `validateSolvable()` stays green.

**Candidate starting layout** (validated by `validateSolvable()` — tweak cells if the test ever fails):
```js
var LAYOUT = [
  "###############",
  "#S..1...a...2.#",
  "#############.#",
  "#..c..3....b..#",
  "#.#############",
  "#...4...d..5.e#",
  "#############.#",
  "#############E#",
  "###############"
];
```
Traversal: `S(1,1) → row1 → gate a → bot2(12,1) → down col13 → row3 (R→L): gate b → bot3 → gate c → down col1 → row5 (L→R): bot4 → gate d → bot5 → gate e → down col13 → E(13,7)`.

**Public interface (`GG.habitHarborMaze`):**
- `COLS, ROWS, CELL` constants and `LAYOUT`.
- `build()` → parses `LAYOUT` into `{ grid: [][] of cell chars, spawn:{c,r}, exit:{c,r}, bots:[{id,c,r,gate}], gates:[{id,c,r,openedBy}] }`.
- `isWall(model, c, r, openGateIds)` → true if out of bounds, a `#`, or a gate cell whose id ∉ `openGateIds`. (Used by Phase 2 movement.)
- `reachableCells(model, openGateIds)` → BFS from spawn over non-wall cells; returns a set of `"c,r"` keys.
- `validateSolvable(model)` → simulate: start `open={}`; loop { compute reachable; find any un-rescued bot whose cell is reachable; rescue it → add its gate to `open` }; until no progress; return `true` iff all 5 bots rescued AND exit cell reachable with the final `open` set.

---

## Step-by-Step Tasks

### Task 1: Create `GAME/screens/habit-harbor-questions.js`
- **ACTION**: Clone the bias adapter for the bad-habits bank.
- **IMPLEMENT**: `GG.habitHarborQuestions = (function(){ ... })()` with `getSource()` returning `quizData["bad-habits"]` when present (guarded `typeof quizData !== 'undefined' && quizData && Array.isArray(quizData["bad-habits"]) && quizData["bad-habits"].length > 0`), else a FALLBACK of 8 hand-picked bad-habits questions (shape `{ question, options:[4], correct:0 }`, correct at index 0). Expose `pickN(n)`, `size()`, `getSource()` identically to the bias adapter.
- **MIRROR**: QUESTION_ADAPTER.
- **IMPORTS**: none (browser global `quizData`, `window.GG`).
- **GOTCHA**: the key has a hyphen — must use `quizData["bad-habits"]`, NOT `quizData.badHabits` or `quizData.bias`. Keep `correct: 0` convention; the maze quiz (Phase 3) will shuffle at display time like Bias Breaker.
- **VALIDATE**: in `test.html`, `GG.habitHarborQuestions.pickN(5).length === 5` and `size() > 0` (uses FALLBACK there since `quizData` isn't loaded).

### Task 2: Create `GAME/screens/habit-harbor-maze.js`
- **ACTION**: Implement the maze data model + helpers per "Maze Model Spec".
- **IMPLEMENT**: `GG.habitHarborMaze` IIFE exposing `COLS,ROWS,CELL,LAYOUT,build,isWall,reachableCells,validateSolvable` as specified. BFS uses a queue array + a `seen` object keyed `"c,r"`.
- **MIRROR**: IIFE + `window.GG` namespace convention (e.g. `bias-breaker-questions.js:10-12`).
- **IMPORTS**: none.
- **GOTCHA**: gate cells are walls *until* opened — `isWall` must treat an unopened gate id as solid. BFS must move only 4-directionally (no diagonals) to match boat movement. Parse must record bot→gate mapping (`1`→`a`, `2`→`b`, `3`→`c`, `4`→`d`, `5`→`e`) by index.
- **VALIDATE**: `validateSolvable(build())` returns `true` for the candidate layout; `build().bots.length === 5`; exactly one `spawn` and one `exit`.

### Task 3: Create `GAME/screens/habit-harbor.js` (minimal static screen)
- **ACTION**: Render the static maze + boat; wire persist + cleanup; expose `GG.screens.habitHarbor.render`.
- **IMPLEMENT**: `GG.screens.habitHarbor = (function(){ ... return { render: render }; })()`. `render(rootEl, profile, onComplete)`:
  1. `clearChildren(rootEl)`; add `gg-hh-active` to `#gg-root`; `localStorage.setItem('gg.activeIsland','habit-harbor')` (try/catch).
  2. `var model = GG.habitHarborMaze.build();`
  3. Build `stageEl` (`gg-hh-stage`) + `canvas` (`gg-hh-canvas`, width `COLS*CELL`, height `ROWS*CELL`); append; get `ctx`.
  4. `drawScene()`: fill water gradient; for each cell draw walls (dock-brown rounded rects), closed gates (chain/boom-bar look), exit marker; draw each bot as a glitchy red blob with `❓`; draw the boat (top-down hull + small figure) at `spawn`.
  5. Minimal loop: `state={running:true}`, `function tick(){ if(!state.running) return; drawScene(); requestAnimationFrame(tick); }` (a single draw is sufficient in Phase 1, but the loop skeleton lets Phase 2 add input with no restructure).
  6. `cleanup()` per CLEANUP_HOOK (running=false, remove `gg-hh-active`, remove `gg.activeIsland`, release `_activeCleanup`); `window.GG._activeCleanup = cleanup;`.
  7. `onComplete` is accepted but NOT called in Phase 1 (no win path yet); exit is via the router's Back-to-App button → `doExit` → `cleanup`.
- **MIRROR**: SCREEN_RENDER_SETUP, CLEANUP_HOOK. Reuse a local `clearChildren` like other screens.
- **IMPORTS**: none (uses `GG.habitHarborMaze`).
- **GOTCHA**: don't call `onComplete` yet. Don't add keyboard listeners yet (Phase 2). Boat is **canvas-drawn top-down**, NOT the side-view SVG kid avatar (that avatar is for the platformer).
- **VALIDATE**: with `habit-harbor` unlocked, clicking it shows the maze + boat, no console errors; Back-to-App returns to the map cleanly (no leftover dark theme).

### Task 4: Add `.gg-hh-*` CSS to `GAME/glitch-guardians.css`
- **ACTION**: Append `.gg-hh-stage`, `#gg-root.gg-hh-active` (+ `.gg-screen` and `.gg-hh-stage` descendant overrides + `::before/::after { display:none }`), and `.gg-hh-canvas`, mirroring the `.gg-bb-*` block.
- **IMPLEMENT**: copy the CSS_STAGE_THEME block, rename `bb`→`hh`; optionally tint the stage border `rgba(56,249,215,.4)` (water teal).
- **MIRROR**: CSS_STAGE_THEME.
- **IMPORTS**: n/a.
- **GOTCHA**: keep the `#gg-root.gg-hh-active .gg-screen` flex/min-height override — without it the stage won't go edge-to-edge (same reason Bias Breaker needed it).
- **VALIDATE**: the maze stage fills the viewport on a wide screen with no horizontal scrollbar.

### Task 5: Wire the router in `GAME/glitch-guardians.js`
- **ACTION**: Add the habit-harbor branch in `goToIslandIntro`; add `gg-hh-active` removal in `doExit`.
- **IMPLEMENT**: insert a second `if` (mirroring the bias-breaker one) for `'habit-harbor'` / `GG.screens.habitHarbor` that calls `GG.state.markIslandCleared('habit-harbor', result.stars)` on `result.cleared` (harmless in Phase 1 since `cleared` never fires yet) then `goToMap`. In `doExit`, add `ggRoot.classList.remove('gg-hh-active');` next to the existing `gg-bb-active` removal.
- **MIRROR**: ROUTER_BRANCH, DOEXIT_THEME_REMOVE.
- **IMPORTS**: n/a.
- **GOTCHA**: the existing DOMContentLoaded auto-resume (lines 133–164) is already generic over `activeIsland` → no change needed; it will resume habit-harbor once the router branch exists.
- **VALIDATE**: clicking unlocked habit-harbor routes to the maze (not Coming Soon); refresh mid-maze resumes; Back-to-App removes both active classes.

### Task 6: Add `<script>` includes to `index.html`
- **ACTION**: Register the 3 new runtime files (questions, maze, screen) — celebration is Phase 4, so not yet.
- **IMPLEMENT**: after line 3535 (`bias-breaker.js`) and before line 3536 (`glitch-guardians.js`), add:
  ```html
  <script src="GAME/screens/habit-harbor-questions.js"></script>
  <script src="GAME/screens/habit-harbor-maze.js"></script>
  <script src="GAME/screens/habit-harbor.js"></script>
  ```
- **MIRROR**: existing include block `index.html:3526-3536`.
- **GOTCHA**: order matters — questions + maze must load before the screen; all before the router (`glitch-guardians.js`).
- **VALIDATE**: no 404s in console; `GG.screens.habitHarbor`, `GG.habitHarborQuestions`, `GG.habitHarborMaze` all defined.

### Task 7: Add tests (`GAME/test.html` + `GAME/test.js`)
- **ACTION**: Load the new modules in the test harness and assert their invariants.
- **IMPLEMENT**: in `test.html`, add before `test.js`:
  ```html
  <script src="screens/habit-harbor-questions.js"></script>
  <script src="screens/habit-harbor-maze.js"></script>
  ```
  In `test.js`, add tests: (a) `habitHarborQuestions.pickN(5)` returns 5 well-formed questions (mirror bias test); (b) `habitHarborQuestions.size() > 0`; (c) `validateSolvable(build())` is `true`; (d) `build().bots.length === 5` and one spawn + one exit.
- **MIRROR**: TEST_STRUCTURE.
- **IMPORTS**: n/a.
- **GOTCHA**: `test()` calls `GG.state.reset()` before each — harmless for these tests. The questions test relies on the FALLBACK (no `quizData` in test.html), so the FALLBACK must have ≥5 items.
- **VALIDATE**: open `GAME/test.html` → all tests green (existing 14 + 4 new = 18).

---

## Testing Strategy

### Unit Tests
| Test | Input | Expected Output | Edge Case? |
|---|---|---|---|
| habitHarborQuestions.pickN(5) | n=5 | 5 items, each `{question, 4 options, correct 0-3}` | No |
| habitHarborQuestions.size() | — | > 0 (FALLBACK ≥ 8 in tests) | No |
| maze.validateSolvable(build()) | candidate LAYOUT | `true` | Yes (solvability) |
| maze.build() structure | candidate LAYOUT | 5 bots, 1 spawn, 1 exit, 5 gates | Yes |

### Edge Cases Checklist
- [x] Blocked start (all gates closed) — `validateSolvable` simulates progressive opening
- [x] Hyphenated quizData key (`quizData["bad-habits"]`)
- [x] Standalone test harness without `quizData` (FALLBACK path)
- [x] Exit not reachable until all gates open (asserted in solvability sim)
- [ ] (Deferred to Phase 2) wall-clip at speed; (Phase 3) bot collision; (Phase 4) storage-blocked at win

---

## Validation Commands

### Static Analysis
```bash
# No build/typecheck in this project (vanilla JS, no Node). Sanity-check syntax by loading in a browser console.
```
EXPECT: no SyntaxError when the page loads.

### Unit Tests
```bash
# Open the test runner in a browser (double-click or):
start "" "C:\Users\nitin\ai-glitch-buster\GAME\test.html"   # Windows
```
EXPECT: "18 / 18 passed" (14 existing + 4 new).

### Browser Validation
```bash
start "" "C:\Users\nitin\ai-glitch-buster\index.html"
```
EXPECT: With a profile where habit-harbor is unlocked (clear Bias Breaker, or temporarily set `progress['habit-harbor'].unlocked=true` in localStorage), clicking Bad-Habit Harbor shows the static maze + boat; no console errors; Back-to-App returns to a normal (bright) map.

### Manual Validation
- [ ] `GAME/test.html` shows 18/18.
- [ ] Main app loads with no console errors; existing AI Glitch Buster quiz UI unchanged.
- [ ] Clear Bias Breaker → map shows Bad-Habit Harbor unlocked → click it → maze renders (boat, water, walls, 5 glitch-bots, closed gates, exit).
- [ ] Refresh while in the maze → resumes into the maze (not the main app).
- [ ] Back-to-App → map looks normal (no dark `gg-hh-active` theme stuck on).

---

## Acceptance Criteria
- [ ] All 7 tasks completed.
- [ ] `test.html` = 18/18.
- [ ] Clicking unlocked habit-harbor renders the static maze + boat with no console errors.
- [ ] Refresh-persist and clean exit both work (no theme leak).
- [ ] Main app behavior unchanged.

## Completion Checklist
- [ ] Code follows the bias-breaker module/adapter/cleanup patterns.
- [ ] No `quizData.badHabits` typo (hyphen-bracket key used).
- [ ] Tests follow the existing `test()` + assert helpers.
- [ ] No hardcoded question text in the screen (sourced via adapter).
- [ ] No movement/rescue/win code crept in (those are later phases).
- [ ] Self-contained — implementation needed no extra codebase search.

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Candidate maze layout not solvable | M | Med | `validateSolvable()` test gates it; linear-chain design principle makes deadlock structurally impossible; tweak cells until green |
| `gg-hh-active` theme leaks onto map after exit | M | Med | doExit removes both `gg-bb-active` and `gg-hh-active`; cleanup also removes it |
| Forgot FALLBACK → tests fail (no quizData in test.html) | M | Low | Task 1 mandates an ≥8-item FALLBACK; Task 7 validates standalone |
| Script load order wrong (screen before maze/questions) | L | Med | Task 6 fixes order explicitly: questions, maze, screen, then router |

## Notes
- Phase 1 deliberately stops at a *static* render so it's independently verifiable before movement physics land. The minimal `tick()` loop is included only so Phase 2 can add input without restructuring.
- The boat is canvas-drawn top-down (not the platformer's SVG side-view kid). Final boat/bot art is a tuning detail for later phases; Phase 1 just needs recognizable shapes.
- After this plan is implemented and verified, update the PRD's Phase 1 row to `complete` and run `prp-plan` again for Phase 2.
