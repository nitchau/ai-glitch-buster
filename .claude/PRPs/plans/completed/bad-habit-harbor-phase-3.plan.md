# Plan: Bad-Habit Harbor — Phase 3 (Bots, rescue & gates)

## Summary
The teach-and-progress core. Driving the boat into a glitch-bot pauses the game
and opens a tappable quiz from the bad-habits bank; a correct answer fixes the
bot (glitch-red → happy-green) and opens its gate (`state.openGates`), a wrong
answer shows a friendly explanation and loads a new question (never punishes).
A HUD tracks "Rescued X/5" and a count-up timer (the timer feeds Phase 4 stars).
No win/celebration/unlock yet (Phase 4).

## User Story
As a booth kid, I want to drive up to a glitchy helper-bot and fix its bad habit
by answering what it's doing wrong, so I watch it turn happy and the gate opens
so I can reach the next bot.

## Problem → Solution
Phase 2 drives a boat in the entrance corridor (all gates shut). → Driving into
a bot opens a quiz; correct answers rescue bots and open gates one by one, so the
whole maze becomes traversable; the HUD shows progress and elapsed time.

## Metadata
- **Complexity**: Medium-Large (one screen file gains a quiz state-machine + modal/HUD/banner; CSS; 1 adapter helper + tests)
- **Source PRD**: `.claude/PRPs/prds/bad-habit-harbor.prd.md`
- **PRD Phase**: Phase 3 — Bots, rescue & gates
- **Estimated Files**: `habit-harbor.js` (UPDATE), `habit-harbor-questions.js` (UPDATE: toChoices), `glitch-guardians.css` (UPDATE), `test.js` (UPDATE: +2)

---

## UX Design

### Before
```
Boat drives the entrance corridor. Bots are static red "?" blobs behind
closed gates. Nothing happens on contact. No HUD.
```

### After
```
HUD: "🤖 Rescued 0/5    ⏱ 0s"   (top-left)

Drive into a glitch-bot ─────────────► movement pauses, quiz modal slides up:
┌────────────────────────────────────────────┐
│  This helper-bot picked up a bad habit:      │
│  "AI gives answers even when it's not sure.  │
│   What habit is that?"                       │
│  [ Guessing instead of saying I don't know ] │  ← 4 big tappable buttons
│  [ Being helpful ]  [ ... ]  [ ... ]         │
└────────────────────────────────────────────┘
  Correct → bot turns green + smiles, its gate lifts, "Rescued 1/5",
            modal closes, you drive on.
  Wrong   → "Here's why: ..." + a fresh question (no penalty).

Rescue all 5 → every gate open, banner "All bots freed! Find the harbor mouth →"
(actually winning at the exit is Phase 4).
```

### Interaction Changes
| Touchpoint | Before | After | Notes |
|---|---|---|---|
| Drive into a bot | nothing | pause + quiz modal | only un-rescued bots trigger |
| Answer correct | n/a | fix bot + open gate + count++ | `state.openGates[bot.gate]=true` |
| Answer wrong | n/a | explanation + new question | never closes, never punishes |
| HUD | none | Rescued X/5 + timer | top-left |

---

## Mandatory Reading

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 | `GAME/screens/habit-harbor.js` | all | File being extended — state/tick/updateBoat/drawGate/drawBot/cleanup |
| P0 | `GAME/screens/habit-harbor-questions.js` | all | Add `toChoices(q)`; `pickN` already returns `{question,options[4],correct}` |
| P1 | `GAME/screens/bias-breaker.js` | 381–416 | buildHUD + setStreak + showBanner patterns to mirror |
| P1 | `GAME/screens/bias-breaker.js` | 149–175, 566–586 | option-shuffle (positions) + commit/correct-vs-wrong handling |
| P1 | `GAME/glitch-guardians.css` | `.gg-bb-hud`, `.gg-bb-banner`, `.gg-hh-*` | mirror HUD/banner; where to add `.gg-hh-modal` |

## External Documentation
None — established internal patterns only.

---

## Patterns to Mirror

### HUD_PATTERN
```js
// SOURCE: GAME/screens/bias-breaker.js:381-396
function buildHUD() {
  var root = document.createElement('div');
  root.className = 'gg-bb-hud';
  var pl = document.createElement('span'); pl.className = 'gg-bb-hud-platforms'; root.appendChild(pl);
  var tm = document.createElement('span'); tm.className = 'gg-bb-hud-timer'; root.appendChild(tm);
  function setPlatforms(cur, total) { pl.textContent = 'Section: ' + cur + '/' + total; }
  function setTimer(seconds) { tm.textContent = '⏱ ' + seconds + 's'; }
  setPlatforms(0, level.sections.length); setTimer(0);
  return { root: root, setPlatforms: setPlatforms, setTimer: setTimer };
}
```
For habit-harbor: `.gg-hh-hud` with `setRescued(n, total)` ("🤖 Rescued X/5") + `setTimer(s)`.

### BANNER_PATTERN
```js
// SOURCE: GAME/screens/bias-breaker.js:408-416
function showBanner(text, kind) {
  banner.textContent = text;
  banner.className = 'gg-bb-banner gg-bb-banner-' + (kind || 'info');
  banner.hidden = false;
}
```
For habit-harbor: a `.gg-hh-banner` div (hidden by default) + `showBanner(text, kind)` with an auto-hide `setTimeout`.

### OPTION_SHUFFLE
```js
// SOURCE: GAME/screens/bias-breaker.js:149-175 (positions shuffle)
var positions = shuffle([0, 1, 2, 3]);   // shuffle = Fisher-Yates over a copy
// optionIndex = positions[p]; isCorrect = (optionIndex === question.correct)
```
For habit-harbor: implement `toChoices(q)` in the adapter returning a shuffled
`[{ text, isCorrect }]` (exactly one `isCorrect:true`).

### TIMER_PATTERN
```js
// SOURCE: GAME/screens/bias-breaker.js:1352-1360
if (!state.isPaused && !state.doorEntered) {
  state.timeMs += 1000 / 60;
  var sec = Math.floor(state.timeMs / 1000);
  if (sec !== state.lastShownTimer) { hud.setTimer(sec); state.lastShownTimer = sec; }
}
```

### CLEANUP / PERSIST / GATE-COLLISION
Already in `habit-harbor.js` (Phase 1/2): `cleanup()` removes listeners + class + activeIsland; `state.openGates` already consumed by `isWall` in movement collision — Phase 3 just sets `state.openGates[id]=true` on rescue.

---

## Files to Change

| File | Action | Justification |
|---|---|---|
| `GAME/screens/habit-harbor-questions.js` | UPDATE | Add `toChoices(q)` shuffle helper (testable) |
| `GAME/screens/habit-harbor.js` | UPDATE | Rescue state-machine, bot collision, quiz modal, HUD, banner, gate-open + happy-bot rendering, timer |
| `GAME/glitch-guardians.css` | UPDATE | `.gg-hh-hud`, `.gg-hh-banner`, `.gg-hh-modal` + options |
| `GAME/test.js` | UPDATE | +2 tests for `toChoices` |

## NOT Building (Phase 3)
- Win detection at the exit, celebration screen, time→star scoring, `markIslandCleared`/unlock → Phase 4.
- Sound effects, follower-train → Phase 4 (Should).
- Per-bot themed bad-habit art (each bot uses the same glitch look) → Could/later.

---

## Step-by-Step Tasks

### Task 1: `toChoices(q)` in the question adapter
- **ACTION**: Add a shuffle helper to `GG.habitHarborQuestions`.
- **IMPLEMENT**:
  ```js
  function toChoices(q) {
    var idx = [0, 1, 2, 3];
    for (var i = idx.length - 1; i > 0; i--) { var j = Math.floor(Math.random()*(i+1)); var t = idx[i]; idx[i]=idx[j]; idx[j]=t; }
    return idx.map(function(oi) { return { text: q.options[oi], isCorrect: oi === q.correct }; });
  }
  ```
  Expose it on the returned object alongside `pickN/size/getSource`.
- **MIRROR**: OPTION_SHUFFLE.
- **GOTCHA**: exactly one `isCorrect:true`; don't mutate `q`.
- **VALIDATE**: unit test (Task 7): 4 choices, exactly one correct, texts are the original options.

### Task 2: Rescue state + bot collision trigger
- **ACTION**: Extend `state`; detect driving into an un-rescued bot in `tick`.
- **IMPLEMENT**: add to `state`: `paused:false, rescuedCount:0, timeMs:0, lastSec:-1, activeBot:null, qPool:[]`. Mark each `model.bots[i].rescued = false` after `build()`. Add:
  ```js
  function checkBotCollision() {
    if (state.paused) return;
    for (var i = 0; i < model.bots.length; i++) {
      var b = model.bots[i];
      if (b.rescued) continue;
      var bxc = b.c * CELL + CELL/2, byc = b.r * CELL + CELL/2;
      var dx = state.px - bxc, dy = state.py - byc;
      if (dx*dx + dy*dy < (CELL*0.6)*(CELL*0.6)) { openQuiz(b); return; }
    }
  }
  ```
  Call `checkBotCollision()` in `tick()` after `updateBoat()`. Guard `updateBoat` with `if (state.paused) return;` at its top.
- **MIRROR**: existing tick structure.
- **GOTCHA**: only un-rescued bots trigger (the `rescued` flag prevents re-trigger after fixing). Pausing must stop movement (guard `updateBoat`).
- **VALIDATE**: driving onto a bot opens the modal once and freezes the boat.

### Task 3: Quiz modal (build + answer logic)
- **ACTION**: Build a tappable modal; wire correct/wrong handling with a no-repeat question pool.
- **IMPLEMENT**:
  - `nextQuestion()`: if `state.qPool.length === 0` set `state.qPool = GG.habitHarborQuestions.pickN(GG.habitHarborQuestions.size())`; return `state.qPool.pop()`.
  - `openQuiz(bot)`: `state.paused = true; state.activeBot = bot;` build modal DOM: a `.gg-hh-modal` containing a prompt line + a `.gg-hh-modal-q` (the question text) + 4 `.gg-hh-opt` buttons from `GG.habitHarborQuestions.toChoices(q)`, and a hidden `.gg-hh-explain` line. Each button `pointerdown`/click → `answer(choice, bot)`.
  - `answer(choice, bot)`: if `choice.isCorrect` → `rescue(bot)` + close modal; else → show `.gg-hh-explain` ("Here's why: that's still a bad habit — try the kind/clear option!") and reload a fresh question into the same modal (no close, no penalty).
  - `closeModal()`: remove modal DOM; `state.paused = false; state.activeBot = null;`.
- **MIRROR**: BANNER_PATTERN (DOM toggle), OPTION_SHUFFLE via `toChoices`.
- **GOTCHA**: buttons must be big + tappable (CSS Task 6). Don't let a held arrow key move the boat under the modal (movement guarded by `state.paused`). Build buttons with `type="button"`.
- **VALIDATE**: correct closes + rescues; wrong swaps in a new question and never closes; modal is finger-sized.

### Task 4: Rescue effect + gate-open + happy-bot rendering
- **ACTION**: Apply the rescue and reflect it visually.
- **IMPLEMENT**:
  - `rescue(bot)`: `bot.rescued = true; state.openGates[bot.gate] = true; state.rescuedCount++; hud.setRescued(state.rescuedCount, model.bots.length);` `showBanner('🤖 Fixed! Gate opened ✓','good');` if `state.rescuedCount === model.bots.length` → `showBanner('All bots freed! Find the harbor mouth →','good')`.
  - `drawGate(gate)`: at the top, `if (state.openGates[gate.id]) { /* draw faded open posts only */ ... return; }` else the existing closed hazard bar.
  - `drawBot(b)`: if `b.rescued` → draw a calm green body, a smile, no jitter, no "?"; else the existing glitch-red "?" bot.
- **MIRROR**: existing drawGate/drawBot.
- **GOTCHA**: opening the gate must immediately let the boat pass — it does, because movement collision already reads `state.openGates`. Keep the rescued bot non-colliding (its cell is passable already; `checkBotCollision` skips rescued bots).
- **VALIDATE**: after a correct answer the gate is visibly open and the boat can drive through; the bot is green + smiling.

### Task 5: HUD + banner
- **ACTION**: Add the HUD (rescued + timer) and the floating banner; drive the timer in tick.
- **IMPLEMENT**: `buildHUD()` per HUD_PATTERN → `.gg-hh-hud` with `setRescued(n,total)` ("🤖 Rescued n/total") and `setTimer(s)` ("⏱ s"). Append to stage. `buildBanner()` → hidden `.gg-hh-banner`; `showBanner(text,kind)` sets text+class+unhide and `setTimeout`(~1600ms) to hide. In `tick`, when `!state.paused`: `state.timeMs += 1000/60; var s = Math.floor(state.timeMs/1000); if (s !== state.lastSec){ hud.setTimer(s); state.lastSec = s; }`.
- **MIRROR**: HUD_PATTERN, BANNER_PATTERN, TIMER_PATTERN.
- **GOTCHA**: pause the timer while the modal is open (`!state.paused`) so reading time isn't penalized — matches the Phase 4 star intent.
- **VALIDATE**: HUD shows 0/5 then increments; timer counts up and pauses during the quiz.

### Task 6: CSS — `.gg-hh-hud`, `.gg-hh-banner`, `.gg-hh-modal`
- **ACTION**: Append styles to the `.gg-hh-*` block.
- **IMPLEMENT**:
  - `.gg-hh-hud`: absolute top-left, translucent dark pill, light text, `z-index:5`, spans block.
  - `.gg-hh-banner`: absolute top-center, large readable, slide/fade; `-good` green tint, `-info` neutral; `pointer-events:none`.
  - `.gg-hh-modal`: absolute, bottom band (or centered card) over the stage, white bg, dark navy text, `z-index:10`; `.gg-hh-modal-q` ~1.3em; `.gg-hh-opt` full-width stacked buttons ≥48px, rounded, kid-finger sized, `:active` highlight; `.gg-hh-explain` small amber note, hidden by default.
- **MIRROR**: `.gg-bb-hud` / `.gg-bb-banner` conventions.
- **GOTCHA**: modal `z-index` above the D-pad (which is 5) so taps hit the options; `touch-action: manipulation` on options.
- **VALIDATE**: modal readable + tappable; HUD legible on the dark water; banner doesn't block taps.

### Task 7: Tests for `toChoices`
- **ACTION**: Add 2 tests to `test.js`.
- **IMPLEMENT**:
  ```js
  test('habitHarborQuestions.toChoices returns 4 choices with exactly one correct', function() {
    var q = GG.habitHarborQuestions.pickN(1)[0];
    var ch = GG.habitHarborQuestions.toChoices(q);
    assertEq(ch.length, 4);
    var n = 0; ch.forEach(function(c){ if (c.isCorrect) n++; });
    assertEq(n, 1, 'exactly one correct');
  });
  test('habitHarborQuestions.toChoices preserves option texts', function() {
    var q = GG.habitHarborQuestions.pickN(1)[0];
    var ch = GG.habitHarborQuestions.toChoices(q);
    var texts = ch.map(function(c){ return c.text; }).sort();
    var orig = q.options.slice().sort();
    assertEq(texts, orig, 'same set of option texts');
    var correct = ch.filter(function(c){ return c.isCorrect; })[0];
    assertEq(correct.text, q.options[q.correct], 'correct flag on the right text');
  });
  ```
- **MIRROR**: existing `test()` + assert helpers.
- **GOTCHA**: `assertEq` JSON-compares — sort arrays before comparing sets.
- **VALIDATE**: `test.html` → 21/21 (19 + 2).

---

## Testing Strategy

### Unit Tests
| Test | Input | Expected | Edge Case? |
|---|---|---|---|
| toChoices count + one-correct | a question | 4 choices, 1 isCorrect | Yes |
| toChoices preserves texts + correct mapping | a question | same texts; correct flag on right text | Yes |

### Edge Cases Checklist
- [x] Wrong answer never closes/penalizes (loads new question)
- [x] Rescued bot doesn't re-trigger (rescued flag)
- [x] Movement frozen while modal open (`state.paused`)
- [x] Timer pauses during quiz
- [x] Question pool refills when exhausted (`nextQuestion`)
- [ ] (Phase 4) win at exit, stars, unlock

---

## Validation Commands

### Static Analysis
```bash
cd /c/Users/nitin/ai-glitch-buster && node --check GAME/screens/habit-harbor.js && node --check GAME/screens/habit-harbor-questions.js && node --check GAME/test.js
```
EXPECT: no SyntaxError.

### Unit Tests (headless)
```bash
cd /c/Users/nitin/ai-glitch-buster && node <<'EOF'
global.window = global;
var store={}; global.localStorage={getItem:function(k){return store[k]!=null?store[k]:null;},setItem:function(k,v){store[k]=String(v);},removeItem:function(k){delete store[k];}};
var cap=''; var el={}; Object.defineProperty(el,'innerHTML',{set:function(v){cap=v;}});
global.document={readyState:'complete',getElementById:function(id){return id==='test-results'?el:null;},addEventListener:function(){}};
require('./GAME/state.js');require('./GAME/screens/bias-breaker-questions.js');require('./GAME/screens/habit-harbor-questions.js');require('./GAME/screens/habit-harbor-maze.js');require('./GAME/test.js');
console.log((cap.match(/\d+ \/ \d+ passed/)||['?'])[0]);
EOF
```
EXPECT: `21 / 21 passed`.

### Browser Validation
```bash
start "" "C:\Users\nitin\ai-glitch-buster\index.html"
```
EXPECT: drive into a bot → quiz → correct fixes bot + opens gate + HUD increments; wrong shows explanation + new question; rescue all 5 → all gates open + banner; Back-to-App clean.

### Manual Validation
- [ ] Drive into a glitch-bot → movement pauses, quiz modal appears with 4 big buttons.
- [ ] Correct → bot turns green + smiles, gate lifts, "Rescued X/5" increments, modal closes, boat can drive through.
- [ ] Wrong → friendly explanation + a new question; never closes; boat never punished.
- [ ] HUD timer counts up; pauses while the modal is open.
- [ ] Rescue all 5 → every gate open; "find the harbor mouth" banner; boat can reach the exit (winning there is Phase 4).
- [ ] `test.html` → 21/21. Back-to-App → clean.

---

## Acceptance Criteria
- [ ] All 7 tasks complete.
- [ ] `test.html` = 21/21.
- [ ] Drive-into-bot quiz works; correct rescues + opens gate; wrong never punishes.
- [ ] HUD (rescued + timer) correct; timer pauses during quiz.
- [ ] All-5-rescued opens the full maze; clean exit.

## Completion Checklist
- [ ] Reuses HUD/banner/shuffle patterns + the existing `state.openGates` seam.
- [ ] Quiz is touch-first (big tappable buttons), modal above the D-pad.
- [ ] No win/celebration/stars/unlock/sound (those are Phase 4).
- [ ] Self-contained — no extra codebase search needed.

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Modal taps blocked by D-pad/canvas z-index | M | Med | modal `z-index:10` > dpad `5`; verify in playtest |
| Boat re-triggers same bot after closing | L | Med | `bot.rescued` flag gates the trigger; for a wrong-then-correct the bot is only rescued on correct |
| Held arrow drives boat under the modal | M | Low | `updateBoat` returns early when `state.paused` |
| Question repeats feel samey | L | Low | `nextQuestion` pops from a shuffled full-bank pool, refills only when empty |

## Notes
- Phase 3 deliberately stops before the win: after 5/5 the maze is fully open and the boat can reach the exit, but entering the exit does nothing yet. Phase 4 adds win detection → celebration → time-based stars → `markIslandCleared('habit-harbor', stars)` (Privacy Vault unlock) + optional sound/followers.
- The timer starts counting in Phase 3 (pausing during quizzes) so Phase 4's star tiers have a value ready with no rework.
- After implement + verify: mark PRD Phase 3 `complete`, archive this plan, run `prp-plan` for Phase 4.
