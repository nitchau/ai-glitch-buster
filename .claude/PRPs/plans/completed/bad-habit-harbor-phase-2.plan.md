# Plan: Bad-Habit Harbor — Phase 2 (Movement & controls)

## Summary
Make the boat drive. Add a shared key-state object fed by BOTH keyboard
(arrows/WASD) and an on-screen D-pad, top-down 4-direction movement with
per-axis wall collision (using the already-tested `maze.isWall`), and rotate
the boat to face its travel direction. No rescue/quiz/win yet (Phase 3/4).

## User Story
As a booth kid with no keyboard, I want to steer the boat through the harbor
with big on-screen arrows (or arrow keys on a laptop), so I can explore the
maze and bump into the dock walls like a real little boat.

## Problem → Solution
The Phase 1 boat sits frozen at the dock. → The boat moves smoothly in 4
directions via D-pad taps or keys, stops at dock walls (and closed gates),
slides along walls, and turns to face where it's going.

## Metadata
- **Complexity**: Medium (single screen file + CSS + 2 tests)
- **Source PRD**: `.claude/PRPs/prds/bad-habit-harbor.prd.md`
- **PRD Phase**: Phase 2 — Movement & controls
- **Estimated Files**: 1 modified screen (`habit-harbor.js`), 1 CSS, `test.js` (+2 tests)

---

## UX Design

### Before
```
Static maze. Boat parked at the dock entrance. Nothing responds to input.
```

### After
```
┌──────────────────────────────────────────────┐
│  harbor maze (boat now drivable)              │
│  🚤 → moves with arrows / WASD                 │
│                                  ┌───┐         │
│                                  │ ▲ │         │  on-screen D-pad
│                              ┌───┼───┼───┐     │  (bottom-right of stage,
│                              │ ◄ │ ▼ │ ► │     │   big finger-sized buttons,
│                              └───┴───┴───┘     │   works on touch + mouse)
└──────────────────────────────────────────────┘
Boat stops at dock walls + closed gates; turns to face travel direction.
```

### Interaction Changes
| Touchpoint | Before | After | Notes |
|---|---|---|---|
| Arrow keys / WASD | nothing | move the boat | keydown/keyup on document |
| On-screen D-pad | none | move the boat | pointer events; same key flags |
| Hitting a wall/gate | n/a | boat stops, slides along | per-axis `isWall` collision |

---

## Mandatory Reading

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 | `GAME/screens/habit-harbor.js` | all | The file being modified — render/state/tick/cleanup/drawBoat |
| P0 | `GAME/screens/habit-harbor-maze.js` | `isWall`, `CELL/COLS/ROWS` | Collision API already built + tested |
| P1 | `GAME/screens/bias-breaker.js` | 301, 346–356, 1342–1364, 1438–1439 | keys object, onKeyDown/onKeyUp, tick input read, listener cleanup |
| P1 | `GAME/glitch-guardians.css` | `.gg-hh-*` block | Where to append `.gg-hh-dpad` styles |

## External Documentation
None — established internal patterns + Pointer Events (standard, supported on Chromebook).

---

## Patterns to Mirror

### KEY_STATE_INPUT
```js
// SOURCE: GAME/screens/bias-breaker.js:301, 346-356
var keys = {};
function onKeyDown(e) {
  keys[e.code] = true;
  if (['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyA','KeyD','KeyW','KeyS'].indexOf(e.code) >= 0) {
    e.preventDefault();
  }
}
function onKeyUp(e) { keys[e.code] = false; }
document.addEventListener('keydown', onKeyDown);
document.addEventListener('keyup', onKeyUp);
// ...read in tick:
var goLeft = keys.KeyA || keys.ArrowLeft;
```

### TICK_MOVEMENT (bias-breaker, adapt to top-down — no gravity)
```js
// SOURCE: GAME/screens/bias-breaker.js:1342-1364 (structure only)
if (!state.doorEntered && !carrying) {
  if (goLeft) state.vx = -WALK_SPEED;
  else if (goRight) state.vx = WALK_SPEED;
  state.x += state.vx;          // top-down: also state.y += state.vy, NO gravity
}
```

### LISTENER_CLEANUP
```js
// SOURCE: GAME/screens/bias-breaker.js:1438-1439
document.removeEventListener('keydown', onKeyDown);
document.removeEventListener('keyup',   onKeyUp);
```

### COLLISION_API (already built + unit-tested in Phase 1)
```js
// SOURCE: GAME/screens/habit-harbor-maze.js
// isWall(model, c, r, openGates) -> true if out-of-bounds, '#', or a CLOSED gate.
// Phase 2 has no rescues yet, so openGates = {} (all gates closed) — the boat
// roams the start zone and bumps the first gate. Phase 3 populates openGates.
```

---

## Files to Change

| File | Action | Justification |
|---|---|---|
| `GAME/screens/habit-harbor.js` | UPDATE | Input handlers, movement+collision, boat position/rotation, D-pad DOM, cleanup |
| `GAME/glitch-guardians.css` | UPDATE | `.gg-hh-dpad` button styles |
| `GAME/test.js` | UPDATE | +2 `isWall` unit tests |

## NOT Building (Phase 2)
- Bot rescue, quiz modal, gate-opening on rescue, HUD, timer → Phase 3.
- Win, celebration, stars, unlock, follower-train, sound → Phase 4.
- Diagonal-speed normalization niceties (4-dir; diagonal allowed, not tuned).
- Camera/scrolling (single screen).

---

## Step-by-Step Tasks

### Task 1: Add input state + keyboard handlers
- **ACTION**: Add a `keys` object and document keydown/keyup handlers in `render()`.
- **IMPLEMENT**: `var keys = {};` plus `onKeyDown`/`onKeyUp` per KEY_STATE_INPUT (include ArrowUp/Down/Left/Right + WASD; `preventDefault` for those + Space). `document.addEventListener` both. Extend `state` with `px, py, angle, openGates`: initialize `px = model.spawn.c*CELL + CELL/2`, `py = model.spawn.r*CELL + CELL/2`, `angle = 0` (bow faces +x), `openGates = {}`.
- **MIRROR**: KEY_STATE_INPUT.
- **GOTCHA**: `preventDefault` on arrows so the page doesn't scroll. Don't read keys before `state.px/py` exist.
- **VALIDATE**: pressing an arrow logs no errors; `keys` flips true/false (temporary console check, removed after).

### Task 2: Boat movement + per-axis wall collision
- **ACTION**: In `tick()`, translate held directions into per-axis movement with collision.
- **IMPLEMENT**:
  ```js
  var BOAT_SPEED = 3, BOAT_R = CELL * 0.30;
  function hitsWall(px, py) {
    var c0 = Math.floor((px - BOAT_R) / CELL), c1 = Math.floor((px + BOAT_R) / CELL);
    var r0 = Math.floor((py - BOAT_R) / CELL), r1 = Math.floor((py + BOAT_R) / CELL);
    for (var rr = r0; rr <= r1; rr++)
      for (var cc = c0; cc <= c1; cc++)
        if (maze.isWall(model, cc, rr, state.openGates)) return true;
    return false;
  }
  // in tick (before drawScene):
  var L = keys.ArrowLeft||keys.KeyA, R = keys.ArrowRight||keys.KeyD,
      U = keys.ArrowUp||keys.KeyW,   D = keys.ArrowDown||keys.KeyS;
  var dx = (R?1:0)-(L?1:0), dy = (D?1:0)-(U?1:0);
  if (dx) { var nx = state.px + dx*BOAT_SPEED; if (!hitsWall(nx, state.py)) state.px = nx; }
  if (dy) { var ny = state.py + dy*BOAT_SPEED; if (!hitsWall(state.px, ny)) state.py = ny; }
  if (dx > 0) state.angle = 0; else if (dx < 0) state.angle = Math.PI;
  else if (dy > 0) state.angle = Math.PI/2; else if (dy < 0) state.angle = -Math.PI/2;
  ```
- **MIRROR**: TICK_MOVEMENT (structure), COLLISION_API.
- **GOTCHA**: resolve X and Y **separately** so the boat slides along walls instead of sticking. `BOAT_R` (~19px) must be < half the corridor (32px) so the boat fits 1-cell channels. Pass `state.openGates` (empty in Phase 2) to `isWall`.
- **VALIDATE**: boat moves with keys; cannot pass dock walls or the first closed gate; slides along a wall when pushing into a corner.

### Task 3: drawBoat from state position + rotation
- **ACTION**: Draw the boat at `state.px/py` rotated to `state.angle` (instead of fixed spawn, fixed orientation).
- **IMPLEMENT**: in `drawBoat()` replace the spawn-based translate with:
  ```js
  var bob = Math.sin(state.t * 0.06) * 1.5;
  ctx.save();
  ctx.translate(state.px, state.py + bob);
  ctx.rotate(state.angle);
  // ...existing hull/oars/kid drawing unchanged (already drawn bow-at-+x)...
  ctx.restore();
  ```
  Remove the old `if (!model.spawn) return; var x = cx(...)...` lines.
- **MIRROR**: existing drawBoat body (bow already at +x, so rotation works).
- **GOTCHA**: rotate AFTER translate; the hull is authored bow-at-+x so `angle=0` faces right. Keep `ctx.save/restore`.
- **VALIDATE**: boat visually turns to face movement direction; bobs gently when idle.

### Task 4: On-screen D-pad wired to the same key flags
- **ACTION**: Build a D-pad DOM control inside the stage; its buttons set/clear the same `keys` flags.
- **IMPLEMENT**: after appending the canvas, build:
  ```js
  var dpad = document.createElement('div'); dpad.className = 'gg-hh-dpad';
  function mkBtn(label, code, cls) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'gg-hh-dbtn ' + cls; b.textContent = label;
    function on(e){ e.preventDefault(); keys[code] = true; }
    function off(e){ e.preventDefault(); keys[code] = false; }
    b.addEventListener('pointerdown', on);
    b.addEventListener('pointerup', off);
    b.addEventListener('pointerleave', off);
    b.addEventListener('pointercancel', off);
    return b;
  }
  dpad.appendChild(mkBtn('▲','ArrowUp','gg-hh-up'));
  dpad.appendChild(mkBtn('◄','ArrowLeft','gg-hh-left'));
  dpad.appendChild(mkBtn('►','ArrowRight','gg-hh-right'));
  dpad.appendChild(mkBtn('▼','ArrowDown','gg-hh-down'));
  stageEl.appendChild(dpad);
  ```
- **MIRROR**: KEY_STATE_INPUT (shares the `keys` object — one input model, two surfaces).
- **GOTCHA**: use Pointer Events (cover touch + mouse on Chromebook); `preventDefault` to stop long-press selection/scroll. `pointerleave`/`pointercancel` must clear the flag or the boat "sticks" moving if the finger slides off.
- **VALIDATE**: tapping/holding a D-pad arrow moves the boat the same as the key; releasing stops it; sliding off the button stops it.

### Task 5: `.gg-hh-dpad` CSS
- **ACTION**: Append D-pad styles to the `.gg-hh-*` block in `glitch-guardians.css`.
- **IMPLEMENT**: position `.gg-hh-dpad` absolute, bottom-right of the stage, a 3-column grid; `.gg-hh-dbtn` large (≥56px), translucent dark with light glyphs, rounded, `touch-action: none`, `user-select: none`. Grid placement: up top-center, left/right mid sides, down bottom-center.
- **MIRROR**: existing `.gg-hh-stage`/button styling conventions.
- **GOTCHA**: `touch-action: none` on buttons prevents the browser hijacking the touch for scroll/zoom. Keep it above the canvas (z-index) and `position: absolute` within the positioned `.gg-hh-stage`.
- **VALIDATE**: D-pad visible bottom-right, buttons big enough for a kid finger, no page scroll on tap.

### Task 6: Cleanup — remove key listeners
- **ACTION**: Extend `cleanup()` to remove the document key listeners.
- **IMPLEMENT**: add `document.removeEventListener('keydown', onKeyDown); document.removeEventListener('keyup', onKeyUp);` (D-pad listeners are on elements removed with the stage — no manual removal needed).
- **MIRROR**: LISTENER_CLEANUP.
- **GOTCHA**: must reference the SAME function objects passed to addEventListener.
- **VALIDATE**: after Back-to-App, pressing arrows does nothing (no leaked handler moving an offscreen boat / throwing).

### Task 7: `isWall` unit tests
- **ACTION**: Add 2 tests to `GAME/test.js` strengthening collision coverage.
- **IMPLEMENT**:
  ```js
  test('habitHarborMaze.isWall: border is wall, spawn is open', function() {
    var m = GG.habitHarborMaze.build();
    assertTrue(GG.habitHarborMaze.isWall(m, 0, 0, {}), 'border should be wall');
    assertFalse(GG.habitHarborMaze.isWall(m, m.spawn.c, m.spawn.r, {}), 'spawn should be open');
  });
  test('habitHarborMaze.isWall: a gate blocks closed, passes when opened', function() {
    var m = GG.habitHarborMaze.build();
    var g = m.gates[0];
    assertTrue(GG.habitHarborMaze.isWall(m, g.c, g.r, {}), 'closed gate is wall');
    var open = {}; open[g.id] = true;
    assertFalse(GG.habitHarborMaze.isWall(m, g.c, g.r, open), 'opened gate is passable');
  });
  ```
- **MIRROR**: existing `test()` + assert helpers.
- **GOTCHA**: `isWall` accepts an object map of open gate ids; pass `{}` for "all closed".
- **VALIDATE**: `test.html` → 19/19 (17 + 2).

---

## Testing Strategy

### Unit Tests
| Test | Input | Expected | Edge Case? |
|---|---|---|---|
| isWall border/spawn | (0,0) / spawn, `{}` | true / false | Yes |
| isWall gate closed/open | gate cell, `{}` vs `{id:true}` | true / false | Yes (gate logic) |

### Edge Cases Checklist
- [x] Boat fits a 1-cell corridor (`BOAT_R` < half-cell)
- [x] Wall-slide (per-axis resolution)
- [x] D-pad finger-slide-off clears the flag (pointerleave/cancel)
- [x] Key listeners removed on exit (no leak)
- [ ] (Phase 3) gates open on rescue; (Phase 4) win/stars

---

## Validation Commands

### Static Analysis
```bash
cd /c/Users/nitin/ai-glitch-buster && node --check GAME/screens/habit-harbor.js && node --check GAME/test.js
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
EXPECT: `19 / 19 passed`.

### Browser Validation
```bash
start "" "C:\Users\nitin\ai-glitch-buster\index.html"
```
EXPECT: with habit-harbor unlocked, the boat drives with keys + D-pad, stops at walls/first gate, turns to face direction; Back-to-App leaves no leaked input.

### Manual Validation
- [ ] Arrow keys + WASD move the boat; it can't pass dock walls or the closed first gate.
- [ ] D-pad arrows move it identically; releasing/sliding-off stops it.
- [ ] Boat rotates to face travel direction; bobs when idle.
- [ ] `test.html` → 19/19.
- [ ] Back-to-App → map normal; arrows do nothing afterward.

---

## Acceptance Criteria
- [ ] All 7 tasks complete.
- [ ] `test.html` = 19/19.
- [ ] Boat drives (keys + D-pad), collides with walls/gates, slides, rotates.
- [ ] Clean exit (no leaked key listeners, no theme leak).

## Completion Checklist
- [ ] Reuses bias-breaker input pattern + the maze's tested `isWall`.
- [ ] Per-axis collision (slide, not stick); boat fits corridors.
- [ ] D-pad shares the one `keys` object (no duplicate movement logic).
- [ ] No rescue/quiz/win code (those are Phases 3-4).
- [ ] Self-contained — no extra codebase search needed.

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Boat too big for corridors (sticks) | M | Med | `BOAT_R = 0.30*CELL` (38px diameter < 64px corridor); verify in playtest |
| D-pad finger-slide leaves boat moving | M | Low | clear flag on pointerleave + pointercancel |
| Diagonal moves feel fast | L | Low | acceptable for 4-dir; can normalize later if noticed |
| Start zone feels tiny (only row-1 corridor reachable pre-rescue) | M | Low | expected — full traversal unlocks with Phase 3 rescues; note for tester |

## Notes
- Phase 2 boat is confined to the start zone (gates all closed until Phase 3 rescues). That's correct — Phase 2 only proves movement + collision + controls.
- `state.openGates` is introduced now (empty) so Phase 3 can just populate it on rescue with zero movement-code changes.
- After implement + verify: mark PRD Phase 2 `complete`, archive this plan, run `prp-plan` for Phase 3.
