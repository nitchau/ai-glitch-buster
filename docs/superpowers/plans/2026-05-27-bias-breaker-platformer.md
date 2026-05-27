# Plan: Bias Breaker Platformer (Phase 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use `everything-claude-code:prp-implement` with this plan as input. Tasks below have `ACTION / IMPLEMENT / MIRROR / DEPENDS / GOTCHA / VALIDATE` blocks.

**Source spec:** [docs/superpowers/specs/2026-05-27-bias-breaker-platformer-design.md](../specs/2026-05-27-bias-breaker-platformer-design.md)

## Summary

Build a playable 2D platformer level for Bias Breaker: 5 platforms gated by fairness questions, ending in a 3-question boss fight with the Unfair Gatekeeper. Win → mark island cleared, unlock Habit Harbor, show celebration. Uses HTML5 Canvas 2D for background/platforms/boss, an inline SVG kid avatar layered on top, and a `requestAnimationFrame` game loop.

## User Story

As a kid playing AI Glitch Buster, I want to play a real platformer level on Bias Breaker so that I learn bias/fairness through interactive challenges instead of just reading a "Coming Soon" card.

## Problem → Solution

**Current:** Clicking Bias Breaker from the map shows a static story-blurb card with a "🚧 Coming Soon!" placeholder.

**Desired:** Clicking Bias Breaker drops the player into a side-scrolling neon-cyber level. They run, jump, answer questions to spawn platforms, defeat the Unfair Gatekeeper, see a celebration, and unlock Habit Harbor.

## Metadata

- **Complexity:** Large (~12 files touched, ~1400 lines new code)
- **Source spec:** `docs/superpowers/specs/2026-05-27-bias-breaker-platformer-design.md`
- **Estimated files:** 5 new under `GAME/screens/`, plus modifications to `state.js`, `glitch-guardians.js`, `glitch-guardians.css`, `index.html`, `test.js`, `test.html`, `PLAYTEST.md`

---

## UX Design

### Before
```
Map → click Bias Breaker → static "Coming Soon" card
```

### After
```
Map → click Bias Breaker → drops into neon-cyber level
  → run + jump across 5 platforms (question modal at each gap)
  → boss arena → 3 boss questions
  → celebration overlay (confetti + stars + unlock toast)
  → Back to Map (Habit Harbor unlocked, Bad-Habit Harbor citizen freed)
```

### Interaction Changes

| Touchpoint | Before | After |
|---|---|---|
| Click Bias Breaker on map | Static intro card | Real platformer level |
| Player input | None | WASD/arrow movement + Space to jump |
| Question UI | Implicit (none) | Modal pauses game; 4 shuffled options |
| Win condition | None | 5 platforms + 3 boss hits → celebration |
| State change | None | `markIslandCleared('bias-breaker', stars)` |

---

## Mandatory Reading

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 | `GAME/state.js` | all | Module/IIFE pattern + need to extend with `markIslandCleared` |
| P0 | `GAME/test.js` | all | Test framework (extend with 5 new tests) |
| P0 | `GAME/screens/map.js` | 38-148 | `svgEl()` helper + parametric kid SVG pattern |
| P0 | `GAME/glitch-guardians.js` | 60-95 | Router's `goToIslandIntro` (needs Bias Breaker special-case) |
| P0 | `GAME/screens/onboarding.js` | all | `createElement` everywhere (NEVER `innerHTML`) |
| P1 | `GAME/glitch-guardians.css` | all | `#gg-root` font/background/z-index baseline |
| P1 | `GAME/screens/island-intro.js` | all | What we're replacing |
| P2 | `index.html` | search `<script src="GAME/`| Where new `<script>` tags go |

## External Documentation

None needed — Canvas 2D, `requestAnimationFrame`, `KeyboardEvent.code` are all standard browser APIs.

---

## Patterns to Mirror

All code below is from the actual repo. Follow these exactly.

### NAMESPACE_AND_IIFE

```js
// SOURCE: GAME/state.js:1-3
window.GG = window.GG || {};

GG.state = (function() {
  var STORAGE_KEY = 'gg.profile';
  // ... module body ...
  return { /* public API */ };
})();
```

Every new module attaches to `window.GG`. Public API returned at the bottom; internals stay private as closures.

### SVG_EL_HELPER

```js
// SOURCE: GAME/screens/map.js:38-55
function svgEl(tag, attrs, children) {
  var el = document.createElementNS(SVG_NS, tag);
  if (attrs) {
    for (var k in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
      if (k === 'text') el.textContent = attrs[k];
      else el.setAttribute(k, attrs[k]);
    }
  }
  if (children) {
    for (var i = 0; i < children.length; i++) {
      if (children[i]) el.appendChild(children[i]);
    }
  }
  return el;
}
```

Reuse this exact helper in `bias-breaker-avatar.js` (or copy verbatim — pure utility).

### NO_INNER_HTML

```js
// SOURCE: GAME/glitch-guardians.js:31-34
function clearChildren(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}
```

NEVER use `innerHTML`. The project's security hook blocks it. Use `createElement` / `createElementNS`, `textContent`, `appendChild`. To clear an element, call `clearChildren(el)`.

### TEST_PATTERN

```js
// SOURCE: GAME/test.js:5-24
function test(name, fn) {
  try {
    GG.state.reset();
    fn();
    results.push({ name: name, pass: true });
  } catch (e) {
    results.push({ name: name, pass: false, error: e.message });
  }
}

function assertEq(actual, expected, msg) { /* ... */ }
function assertTrue(cond, msg)  { if (!cond) throw new Error(msg || 'expected truthy'); }
function assertFalse(cond, msg) { if (cond) throw new Error(msg || 'expected falsy'); }
function assertNull(val, msg)   { if (val !== null) throw new Error((msg || 'assertNull') + ': got ' + JSON.stringify(val)); }
```

Add new tests by calling `test('descriptive name', function() { ... });` inside the IIFE in `GAME/test.js`. Each test gets a fresh `localStorage` via the auto-reset.

### ROUTER_SCREEN_DISPATCH

```js
// SOURCE: GAME/glitch-guardians.js:75-86
function goToMap(screenEl, profile, isReturning) {
  GG.screens.map.render(screenEl, profile, isReturning, function(islandId) {
    goToIslandIntro(screenEl, profile, islandId);
  });
}

function goToIslandIntro(screenEl, profile, islandId) {
  GG.screens.islandIntro.render(screenEl, islandId, function() {
    goToMap(screenEl, profile, true);
  });
}
```

A screen receives `(rootEl, ...screenSpecificArgs, callbackOnDone)`. When done, calls back to the router which decides what's next. Phase 2 adds a branch in `goToIslandIntro` for Bias Breaker.

### CLASS_PREFIX

Every CSS class in Phase 2 starts with `.gg-bb-` (bias-breaker-specific) or extends existing `.gg-*`. Never use unprefixed names — they may collide with `index.html`'s global classes.

### CITIZEN_SVG_PATTERN

```js
// SOURCE: GAME/screens/map.js:91-148 (buildKid function)
// viewBox 100×200; anchors at SH_L=(30,95), SH_R=(70,95), HIP_L=(40,142), HIP_R=(60,142), FOOT_L=(38,178), FOOT_R=(62,178)
// Static SVG; arms drawn from shoulder to a hand position with bezier midpoint
```

Reuse this anatomy in `bias-breaker-avatar.js`. Only poses (hand positions) and per-frame animation are new.

---

## Files to Change

| File | Action | Justification |
|---|---|---|
| `GAME/state.js` | UPDATE | Add `markIslandCleared(islandId, stars)` |
| `GAME/test.js` | UPDATE | Add 5 new tests |
| `GAME/test.html` | UPDATE | Load `bias-breaker-questions.js` for the new pool-sanity test |
| `GAME/screens/bias-breaker-questions.js` | CREATE | 8 hand-authored bias/fairness questions |
| `GAME/screens/bias-breaker-avatar.js` | CREATE | Player kid SVG + per-frame animation |
| `GAME/screens/bias-breaker-boss.js` | CREATE | Unfair Gatekeeper canvas rendering |
| `GAME/screens/bias-breaker-celebration.js` | CREATE | Win screen with confetti + stars |
| `GAME/screens/bias-breaker.js` | CREATE | Main level orchestrator: canvas, game loop, modal |
| `GAME/glitch-guardians.css` | UPDATE | `.gg-bb-*` styles for level/modal/celebration/HUD |
| `GAME/glitch-guardians.js` | UPDATE | Router branch: Bias Breaker (unlocked) → biasBreaker screen |
| `index.html` | UPDATE | 5 new `<script>` tags before `glitch-guardians.js` |
| `GAME/PLAYTEST.md` | UPDATE | Append Phase 2 manual checklist |

## NOT Building

- AI Quiz Engine / Guardian Watch validator (Phases 3 & 4)
- Other islands' gameplay
- Avatar customization picker (Phase 5+)
- Sound effects / music (Phase 2.5 if requested)
- Mobile/touch controls (Phase 2.5)
- Multiplayer / class codes
- Internationalization
- Infection system / reform-or-defeat choice
- More than 8 questions (Phase 3 brings AI generation)

---

## Step-by-Step Tasks

### Task 1: Extend `state.js` with `markIslandCleared` + 4 new tests (TDD)

- **ACTION:** TDD. Write 4 tests first (fail), then implement (pass).

- **IMPLEMENT (tests — append to `GAME/test.js` inside the existing IIFE, after the `reset() clears the profile` test):**

```js
  test('markIslandCleared sets cleared=true and stars=N', function() {
    GG.state.save(GG.state.newProfile('Mishika', 'guardian'));
    var r = GG.state.markIslandCleared('bias-breaker', 2);
    assertTrue(r.ok, 'markIslandCleared should return ok');
    var p = GG.state.load();
    assertEq(p.progress['bias-breaker'].cleared, true);
    assertEq(p.progress['bias-breaker'].stars, 2);
  });

  test('markIslandCleared keeps best-of stars', function() {
    GG.state.save(GG.state.newProfile('Mishika', 'guardian'));
    GG.state.markIslandCleared('bias-breaker', 2);
    GG.state.markIslandCleared('bias-breaker', 3);
    GG.state.markIslandCleared('bias-breaker', 1);
    var p = GG.state.load();
    assertEq(p.progress['bias-breaker'].stars, 3, 'should not regress stars');
  });

  test('markIslandCleared unlocks the next island in canonical order', function() {
    GG.state.save(GG.state.newProfile('Mishika', 'guardian'));
    GG.state.markIslandCleared('bias-breaker', 1);
    var p = GG.state.load();
    assertEq(p.progress['habit-harbor'].unlocked, true);
  });

  test("markIslandCleared('the-core', 3) does NOT crash (no next island)", function() {
    var profile = GG.state.newProfile('Mishika', 'guardian');
    profile.progress['the-core'].unlocked = true;
    GG.state.save(profile);
    var r = GG.state.markIslandCleared('the-core', 3);
    assertTrue(r.ok);
    var p = GG.state.load();
    assertEq(p.progress['the-core'].cleared, true);
    assertEq(p.progress['the-core'].stars, 3);
  });
```

- **IMPLEMENT (function — add inside the IIFE in `GAME/state.js` before the `return`):**

```js
  function markIslandCleared(islandId, stars) {
    var profile = load();
    if (!profile) return { ok: false, reason: 'no-profile' };
    if (!profile.progress[islandId]) return { ok: false, reason: 'unknown-island' };

    profile.progress[islandId].cleared = true;
    var prevStars = profile.progress[islandId].stars || 0;
    var newStars = (typeof stars === 'number' && isFinite(stars)) ? stars : 1;
    profile.progress[islandId].stars = Math.max(prevStars, newStars);

    var order = ['bias-breaker', 'habit-harbor', 'privacy-vaults', 'reality-tower', 'the-core'];
    var idx = order.indexOf(islandId);
    if (idx >= 0 && idx + 1 < order.length) {
      var next = order[idx + 1];
      if (profile.progress[next]) profile.progress[next].unlocked = true;
    }
    return save(profile);
  }
```

Add to the `return` block:

```js
  return {
    load: load,
    save: save,
    reset: reset,
    isIslandUnlocked: isIslandUnlocked,
    newProfile: newProfile,
    markIslandCleared: markIslandCleared
  };
```

- **MIRROR:** `NAMESPACE_AND_IIFE`, `TEST_PATTERN`.

- **DEPENDS:** Nothing.

- **GOTCHA:** Handle `stars = undefined` defensively (`Math.max(prev, undefined)` is `NaN`). The function above coerces non-numbers to 1.

- **VALIDATE:**
  1. `python -m http.server 7891` from repo root.
  2. Open `http://localhost:7891/GAME/test.html`.
  3. Expected: **11 / 11 passed**.
  4. Commit: `git add GAME/state.js GAME/test.js && git commit -m "Extend state.js with markIslandCleared + 4 tests (Phase 2 Task 1)"`

---

### Task 2: Hand-author 8 questions in `bias-breaker-questions.js` + add pool-sanity test

- **ACTION:** Create the question pool; add `<script>` reference in `test.html`; add pool-sanity test.

- **IMPLEMENT (`GAME/screens/bias-breaker-questions.js`):**

```js
// GAME/screens/bias-breaker-questions.js — Hand-authored bias/fairness questions.
// Phase 3 will replace this with the AI Quiz Engine. Shape stays the same.
window.GG = window.GG || {};

GG.biasBreakerQuestions = [
  {
    id: 'bb-001',
    grade: 'both',
    question: "A game's AI keeps blocking some kids from joining just because of their school. Is that OK?",
    options: [
      { text: "Yes — the AI knows best",                          correct: false, explanation: "An AI that blocks kids by group isn't fair. Fair AI treats everyone the same." },
      { text: "No — that's unfair to judge by group",             correct: true,  motivation: "Exactly! Fair AI shouldn't decide based on which school you're from." },
      { text: "Only if the school is new",                        correct: false, explanation: "School age has nothing to do with whether you should get to play." },
      { text: "Yes — only winners should play",                   correct: false, explanation: "That would just keep some people locked out forever. Not fair." }
    ]
  },
  {
    id: 'bb-002',
    grade: 'both',
    question: "An AI sorts kids into 'good' or 'bad' players just from their photo. What's wrong with that?",
    options: [
      { text: "Nothing — AI is smart",                            correct: false, explanation: "You can't tell who's a good player from a photo. The AI is being biased." },
      { text: "Photos can be misleading and unfair",              correct: true,  motivation: "Right! AI shouldn't judge people by how they look." },
      { text: "Only old photos are bad",                          correct: false, explanation: "Any photo could be misleading — age doesn't fix the bias." },
      { text: "The AI should also use names",                     correct: false, explanation: "Adding more guessable info doesn't make a bad system fair." }
    ]
  },
  {
    id: 'bb-003',
    grade: 'both',
    question: "Two players send the same answer. The AI gives a higher score to one because they typed faster. Is that fair?",
    options: [
      { text: "Yes — fast typing matters",                        correct: false, explanation: "The QUESTION was about the answer, not typing speed. Mixing the two is unfair." },
      { text: "No — same answer should get the same score",       correct: true,  motivation: "Exactly. Fair AI judges what was asked, not unrelated stuff." },
      { text: "Only if both kids are in grade 5",                 correct: false, explanation: "Grade doesn't change the rule — same answer should mean same score." },
      { text: "Fast is always better",                            correct: false, explanation: "Speed wasn't the question. Adding it is bias." }
    ]
  },
  {
    id: 'bb-004',
    grade: 'both',
    question: "An AI was trained only on data from one country. Now it makes mistakes about kids from other countries. What's the problem?",
    options: [
      { text: "Nothing — the AI tried its best",                  correct: false, explanation: "Trying isn't enough. Biased training data leads to biased decisions about real people." },
      { text: "The training data was biased",                     correct: true,  motivation: "Yes! AI is only as fair as the data it learns from. Bad data = biased AI." },
      { text: "The other countries should change",                correct: false, explanation: "It's the AI's job to be fair — not other people's job to change to match it." },
      { text: "It should only be used at home",                   correct: false, explanation: "Even at home, biased AI hurts visitors. The AI should be fixed, not restricted." }
    ]
  },
  {
    id: 'bb-005',
    grade: 'both',
    question: "What's the BEST way to spot if an AI is being unfair?",
    options: [
      { text: "Trust it — AI doesn't make mistakes",              correct: false, explanation: "AI definitely makes mistakes. Always check its decisions on real people." },
      { text: "Test it with many different people, compare results", correct: true, motivation: "Yes! Compare how it treats different groups. Big differences = bias." },
      { text: "Ask only one expert",                              correct: false, explanation: "One opinion isn't enough. Bias shows up in patterns across many users." },
      { text: "Read its code only",                               correct: false, explanation: "The code might LOOK fair but the data might not be. Test with real diverse users." }
    ]
  },
  {
    id: 'bb-006',
    grade: 'both',
    question: "BOSS: An AI denies a kid a chess-tournament spot, citing 'data patterns.' The kid's friends with similar skills got in. What should happen?",
    options: [
      { text: "The kid should accept it — AI knows best",         correct: false, explanation: "Never trust an AI's decision blindly, especially when it affects opportunities." },
      { text: "Investigate — the AI may be discriminating",       correct: true,  motivation: "Right! Friends with similar skills getting different results is a bias red flag." },
      { text: "Train a different AI to overrule it",              correct: false, explanation: "Adding more AI doesn't fix the bias — investigate the original one." },
      { text: "Wait until next year",                             correct: false, explanation: "Waiting doesn't fix bias. The kid deserves a fair answer NOW." }
    ]
  },
  {
    id: 'bb-007',
    grade: 'both',
    question: "BOSS: A teacher uses an AI to grade essays. It gives lower scores to essays with longer words. Is that biased?",
    options: [
      { text: "No — longer words are always better",              correct: false, explanation: "Longer doesn't mean better. The AI is biased toward style, not quality." },
      { text: "Yes — it's judging style instead of meaning",      correct: true,  motivation: "Yes! Fair grading looks at WHAT was said, not letter count." },
      { text: "Only if the essay was about animals",              correct: false, explanation: "Topic doesn't matter — the bias is in the scoring rules." },
      { text: "It's OK if the kids are old enough",               correct: false, explanation: "Age doesn't make biased grading fair." }
    ]
  },
  {
    id: 'bb-008',
    grade: 'both',
    question: "BOSS: You discover an AI is being unfair. What's the FIRST thing to do?",
    options: [
      { text: "Delete the AI right away",                         correct: false, explanation: "Deleting is extreme. Understand WHY it's unfair first so we can fix the root cause." },
      { text: "Tell people who use it AND the team who made it",  correct: true,  motivation: "Right! Speak up. Both users and makers need to know." },
      { text: "Use it less often",                                correct: false, explanation: "Using it less still hurts the people it affects. Fix it, don't hide from it." },
      { text: "Hope it fixes itself",                             correct: false, explanation: "AI doesn't fix itself. Humans must find the bias and correct it." }
    ]
  }
];
```

- **IMPLEMENT (`GAME/test.html` — add the script tag):**

In `GAME/test.html`, find the existing `<script src="state.js"></script>` line and ADD a new line below it:

```html
<script src="screens/bias-breaker-questions.js"></script>
```

So the full body becomes:

```html
<body>
  <div id="test-results">Loading…</div>
  <script src="state.js"></script>
  <script src="screens/bias-breaker-questions.js"></script>
  <script src="test.js"></script>
</body>
```

- **IMPLEMENT (`GAME/test.js` — add the pool-sanity test after the markIslandCleared tests):**

```js
  test('biasBreakerQuestions has exactly 8 well-formed entries', function() {
    assertEq(GG.biasBreakerQuestions.length, 8);
    GG.biasBreakerQuestions.forEach(function(q, i) {
      assertTrue(!!q.id,        'q[' + i + '] missing id');
      assertTrue(!!q.question,  'q[' + i + '] missing question');
      assertEq(q.options.length, 4, 'q[' + i + '] should have 4 options');
      var correctCount = q.options.filter(function(o) { return o.correct; }).length;
      assertEq(correctCount, 1, 'q[' + i + '] should have exactly 1 correct option');
      q.options.forEach(function(opt, j) {
        if (opt.correct) {
          assertTrue(!!opt.motivation, 'q[' + i + '].option[' + j + '] correct=true missing motivation');
        } else {
          assertTrue(!!opt.explanation, 'q[' + i + '].option[' + j + '] correct=false missing explanation');
        }
      });
    });
  });
```

- **MIRROR:** `NAMESPACE_AND_IIFE` (assigns to `GG.biasBreakerQuestions`).

- **DEPENDS:** Task 1 must have updated `GAME/test.js`.

- **GOTCHA:** Exactly **8 questions, exactly 4 options each, exactly 1 correct per question**. The sanity test enforces this.

- **VALIDATE:**
  1. Reload `http://localhost:7891/GAME/test.html`.
  2. Expected: **12 / 12 passed**.
  3. Commit: `git add GAME/screens/bias-breaker-questions.js GAME/test.js GAME/test.html && git commit -m "Add 8 bias/fairness questions + pool sanity test (Phase 2 Task 2)"`

---

### Task 3: Add `.gg-bb-*` CSS for level, modal, HUD, celebration

- **ACTION:** Append a CSS section to `GAME/glitch-guardians.css`.

- **IMPLEMENT (append to end of file):**

```css

/* ============================================================
 *  Bias Breaker (Phase 2) — neon-cyber level + modal + celebration
 * ============================================================ */

.gg-bb-stage {
  position: relative;
  width: 100%;
  max-width: 900px;
  margin: 80px auto 20px auto;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6), inset 0 0 80px rgba(120, 60, 200, 0.2);
  border: 1px solid rgba(67, 233, 123, 0.4);
  background: #0a0820;
}

.gg-bb-canvas {
  display: block;
  width: 100%;
  height: auto;
}

.gg-bb-avatar {
  position: absolute;
  top: 0;
  left: 0;
  width: 50px;
  height: 100px;
  pointer-events: none;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.5));
  transition: none;
}

.gg-bb-hud {
  position: absolute;
  top: 12px;
  left: 12px;
  color: #43e97b;
  font-family: 'Courier New', monospace;
  font-size: 16px;
  text-shadow: 0 0 8px rgba(67, 233, 123, 0.8);
  pointer-events: none;
}
.gg-bb-hud-platforms { display: block; }
.gg-bb-hud-boss { display: block; margin-top: 6px; color: #f5576c; text-shadow: 0 0 8px rgba(245, 87, 108, 0.8); }

/* Modal — slides up from bottom */
.gg-bb-modal {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: white;
  border-top-left-radius: 22px;
  border-top-right-radius: 22px;
  padding: 24px 24px 28px 24px;
  box-shadow: 0 -12px 30px rgba(0, 0, 0, 0.5);
  animation: gg-bb-modal-slide 0.3s ease-out both;
  z-index: 10;
}
@keyframes gg-bb-modal-slide {
  from { transform: translateY(100%); }
  to   { transform: translateY(0); }
}
.gg-bb-modal[hidden] { display: none; }

.gg-bb-modal-question {
  font-size: 1.2em;
  margin-bottom: 16px;
  color: #1a1247;
  font-weight: bold;
  text-align: center;
}

.gg-bb-modal-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.gg-bb-modal-option {
  font-family: inherit;
  font-size: 1em;
  padding: 14px 18px;
  border: 2px solid #ddd;
  border-radius: 14px;
  cursor: pointer;
  background: #fafafa;
  min-height: 44px;
  color: #1a1247;
  font-weight: bold;
  transition: background 0.15s, transform 0.15s;
}
.gg-bb-modal-option:hover:not(:disabled) { background: #f0f0f0; transform: translateY(-1px); }
.gg-bb-modal-option:disabled { opacity: 0.6; cursor: not-allowed; }

.gg-bb-modal-feedback {
  margin-top: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  font-size: 0.98em;
}
.gg-bb-modal-feedback.gg-bb-correct {
  background: #d4f8d4;
  border: 1px solid #43e97b;
  color: #1c5b27;
}
.gg-bb-modal-feedback.gg-bb-wrong {
  background: #fde2e0;
  border: 1px solid #f5576c;
  color: #6e1b22;
}

/* Pause overlay */
.gg-bb-pause {
  position: absolute;
  inset: 0;
  background: rgba(20, 10, 60, 0.85);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  z-index: 15;
  color: white;
}
.gg-bb-pause[hidden] { display: none; }
.gg-bb-pause h2 { color: #43e97b; font-size: 2em; text-shadow: 0 0 12px rgba(67, 233, 123, 0.6); }

/* Celebration overlay */
.gg-bb-celebration {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(20, 10, 60, 0.92);
  color: white;
  text-align: center;
  padding: 30px;
  z-index: 20;
  animation: gg-fade-in-up 0.5s ease-out both;
}
.gg-bb-celebration[hidden] { display: none; }
.gg-bb-celebration h1 {
  font-size: 2.4em;
  color: #43e97b;
  text-shadow: 0 0 20px rgba(67, 233, 123, 0.6);
  margin-bottom: 12px;
}
.gg-bb-celebration p { font-size: 1.1em; margin-bottom: 18px; max-width: 500px; }
.gg-bb-celebration-stars { font-size: 3em; letter-spacing: 12px; margin: 14px 0; }
.gg-bb-celebration-unlocked {
  background: #ffd700;
  color: #1a1247;
  padding: 10px 18px;
  border-radius: 14px;
  font-weight: bold;
  margin: 18px 0;
}

.gg-bb-confetti-canvas {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 19;
}

/* Fall fade */
.gg-bb-fall-overlay {
  position: absolute;
  inset: 0;
  background: black;
  z-index: 18;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}
.gg-bb-fall-overlay.gg-bb-fading { opacity: 1; }

/* Modal stacks on small screens */
@media (max-width: 600px) {
  .gg-bb-modal-options { grid-template-columns: 1fr; }
}
```

- **MIRROR:** `CLASS_PREFIX` (every class is `.gg-bb-*`).

- **DEPENDS:** Nothing.

- **GOTCHA:** No CSS transition on `.gg-bb-avatar` — JS sets transform per-frame; transitions would lag.

- **VALIDATE:**
  1. Reload `http://localhost:7891/index.html` — main app and Phase 1 game unchanged.
  2. Commit: `git add GAME/glitch-guardians.css && git commit -m "Add .gg-bb-* CSS for level/modal/celebration (Phase 2 Task 3)"`

---

### Task 4: Player avatar SVG + animation in `bias-breaker-avatar.js`

- **ACTION:** Create `GAME/screens/bias-breaker-avatar.js` with `build(opts)` and `update(refs, state)`.

- **IMPLEMENT (`GAME/screens/bias-breaker-avatar.js`):**

```js
// GAME/screens/bias-breaker-avatar.js — Player kid SVG + per-frame animation.
// Reuses citizen anatomy from map.js's buildKid, but exposes refs to limbs
// so the game loop can mutate them each frame.
window.GG = window.GG || {};

GG.biasBreakerAvatar = (function() {
  var SVG_NS = 'http://www.w3.org/2000/svg';

  function svgEl(tag, attrs, children) {
    var el = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      for (var k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
        if (k === 'text') el.textContent = attrs[k];
        else el.setAttribute(k, attrs[k]);
      }
    }
    if (children) for (var i = 0; i < children.length; i++) if (children[i]) el.appendChild(children[i]);
    return el;
  }

  // Default = blonde-curly citizen but in confident pose (no frown, eyes open)
  var DEFAULTS = {
    skinTone:  '#fad4ae',
    hairColor: '#d4a449',
    shirtColor:'#43e97b',
    pantsColor:'#3a4d6a',
    shoeColor: '#1a4d7a'
  };

  function build(opts) {
    opts = opts || {};
    for (var k in DEFAULTS) if (!(k in opts)) opts[k] = DEFAULTS[k];

    var refs = {};

    // Legs (drawn first, under torso)
    refs.leftLeg = svgEl('path', {
      d: 'M 40 142 L 38 178', stroke: opts.pantsColor, 'stroke-width': 11, 'stroke-linecap': 'round'
    });
    refs.rightLeg = svgEl('path', {
      d: 'M 60 142 L 62 178', stroke: opts.pantsColor, 'stroke-width': 11, 'stroke-linecap': 'round'
    });

    // Shoes
    refs.leftShoe  = svgEl('ellipse', { cx: 39, cy: 184, rx: 10, ry: 5, fill: opts.shoeColor });
    refs.rightShoe = svgEl('ellipse', { cx: 61, cy: 184, rx: 10, ry: 5, fill: opts.shoeColor });

    // Torso
    var torso = svgEl('path', {
      d: 'M 26 94 Q 26 88 32 88 L 68 88 Q 74 88 74 94 L 74 144 L 26 144 Z',
      fill: opts.shirtColor
    });

    // Arms + hands
    refs.leftArm  = svgEl('path', { d: 'M 30 95 Q 22 110 22 120', stroke: opts.skinTone, 'stroke-width': 8, fill: 'none', 'stroke-linecap': 'round' });
    refs.rightArm = svgEl('path', { d: 'M 70 95 Q 78 110 78 120', stroke: opts.skinTone, 'stroke-width': 8, fill: 'none', 'stroke-linecap': 'round' });
    refs.leftHand  = svgEl('circle', { cx: 22, cy: 120, r: 6.5, fill: opts.skinTone });
    refs.rightHand = svgEl('circle', { cx: 78, cy: 120, r: 6.5, fill: opts.skinTone });

    // Head + face
    var neck  = svgEl('rect',   { x: 44, y: 78, width: 12, height: 14, fill: opts.skinTone });
    var head  = svgEl('circle', { cx: 50, cy: 60, r: 20, fill: opts.skinTone });

    var hair = svgEl('g', null, [
      svgEl('circle', { cx: 34, cy: 44, r: 7, fill: opts.hairColor }),
      svgEl('circle', { cx: 44, cy: 38, r: 8, fill: opts.hairColor }),
      svgEl('circle', { cx: 56, cy: 38, r: 8, fill: opts.hairColor }),
      svgEl('circle', { cx: 66, cy: 44, r: 7, fill: opts.hairColor }),
      svgEl('circle', { cx: 30, cy: 54, r: 5, fill: opts.hairColor }),
      svgEl('circle', { cx: 70, cy: 54, r: 5, fill: opts.hairColor })
    ]);

    var earL = svgEl('ellipse', { cx: 30, cy: 60, rx: 3, ry: 5, fill: opts.skinTone });
    var earR = svgEl('ellipse', { cx: 70, cy: 60, rx: 3, ry: 5, fill: opts.skinTone });

    var eyeL  = svgEl('circle', { cx: 43, cy: 60, r: 2, fill: '#222' });
    var eyeR  = svgEl('circle', { cx: 57, cy: 60, r: 2, fill: '#222' });
    var browL = svgEl('path',   { d: 'M40 54 L46 53', stroke: opts.hairColor, 'stroke-width': 2, 'stroke-linecap': 'round' });
    var browR = svgEl('path',   { d: 'M54 53 L60 54', stroke: opts.hairColor, 'stroke-width': 2, 'stroke-linecap': 'round' });
    var nose  = svgEl('path',   { d: 'M50 64 Q52 68 50 70', stroke: '#b88a5a', 'stroke-width': 1.5, fill: 'none' });
    // Confident small smile (not a frown)
    var mouth = svgEl('path',   { d: 'M44 73 Q50 76 56 73', stroke: '#333', 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round' });

    var svg = svgEl('svg', { viewBox: '0 0 100 200', 'class': 'gg-bb-avatar', xmlns: SVG_NS }, [
      refs.leftLeg, refs.rightLeg, refs.leftShoe, refs.rightShoe,
      torso,
      refs.leftArm, refs.rightArm, refs.leftHand, refs.rightHand,
      neck, head, hair, earL, earR,
      browL, browR, eyeL, eyeR, nose, mouth
    ]);

    refs.svg = svg;
    return refs;
  }

  // state = { x, y, facing, animState, animTime }
  function update(refs, state) {
    var flip = state.facing === 'left' ? 'scaleX(-1)' : 'scaleX(1)';
    refs.svg.style.transform = 'translate(' + state.x + 'px,' + state.y + 'px) ' + flip;

    var t = state.animTime;
    if (state.animState === 'running') {
      var legSwing = Math.sin(t * 0.35) * 12;
      var armSwing = Math.sin(t * 0.35 + Math.PI) * 14;
      var FLx = 38 + legSwing, FRx = 62 - legSwing;
      refs.leftLeg.setAttribute('d',  'M 40 142 L ' + FLx + ' 178');
      refs.rightLeg.setAttribute('d', 'M 60 142 L ' + FRx + ' 178');
      refs.leftShoe.setAttribute('cx', FLx + 1);
      refs.rightShoe.setAttribute('cx', FRx - 1);
      var HLy = 120 + armSwing, HRy = 120 - armSwing;
      refs.leftHand.setAttribute('cy', HLy);
      refs.rightHand.setAttribute('cy', HRy);
      refs.leftArm.setAttribute('d',  'M 30 95 Q 22 110 22 ' + HLy);
      refs.rightArm.setAttribute('d', 'M 70 95 Q 78 110 78 ' + HRy);
    } else if (state.animState === 'jumping') {
      refs.leftLeg.setAttribute('d',  'M 40 142 L 36 165');
      refs.rightLeg.setAttribute('d', 'M 60 142 L 64 165');
      refs.leftShoe.setAttribute('cx', 36); refs.leftShoe.setAttribute('cy', 171);
      refs.rightShoe.setAttribute('cx', 64); refs.rightShoe.setAttribute('cy', 171);
      refs.leftHand.setAttribute('cx', 20); refs.leftHand.setAttribute('cy', 70);
      refs.rightHand.setAttribute('cx', 80); refs.rightHand.setAttribute('cy', 70);
      refs.leftArm.setAttribute('d',  'M 30 95 Q 20 82 20 70');
      refs.rightArm.setAttribute('d', 'M 70 95 Q 80 82 80 70');
    } else if (state.animState === 'falling') {
      var w = Math.sin(t * 0.6) * 18;
      refs.leftHand.setAttribute('cx', 22 - w / 2);  refs.leftHand.setAttribute('cy', 110 - w);
      refs.rightHand.setAttribute('cx', 78 + w / 2); refs.rightHand.setAttribute('cy', 110 + w);
      refs.leftArm.setAttribute('d',  'M 30 95 Q 18 100 ' + (22 - w / 2) + ' ' + (110 - w));
      refs.rightArm.setAttribute('d', 'M 70 95 Q 82 100 ' + (78 + w / 2) + ' ' + (110 + w));
      refs.leftLeg.setAttribute('d',  'M 40 142 L 38 178');
      refs.rightLeg.setAttribute('d', 'M 60 142 L 62 178');
      refs.leftShoe.setAttribute('cx', 39); refs.leftShoe.setAttribute('cy', 184);
      refs.rightShoe.setAttribute('cx', 61); refs.rightShoe.setAttribute('cy', 184);
    } else {
      // idle
      refs.leftLeg.setAttribute('d',  'M 40 142 L 38 178');
      refs.rightLeg.setAttribute('d', 'M 60 142 L 62 178');
      refs.leftShoe.setAttribute('cx', 39); refs.leftShoe.setAttribute('cy', 184);
      refs.rightShoe.setAttribute('cx', 61); refs.rightShoe.setAttribute('cy', 184);
      refs.leftHand.setAttribute('cx', 22); refs.leftHand.setAttribute('cy', 120);
      refs.rightHand.setAttribute('cx', 78); refs.rightHand.setAttribute('cy', 120);
      refs.leftArm.setAttribute('d',  'M 30 95 Q 22 110 22 120');
      refs.rightArm.setAttribute('d', 'M 70 95 Q 78 110 78 120');
    }
  }

  return { build: build, update: update };
})();
```

- **MIRROR:** `SVG_EL_HELPER`, `CITIZEN_SVG_PATTERN`, `NAMESPACE_AND_IIFE`.

- **DEPENDS:** Nothing — just browser SVG APIs.

- **GOTCHA 1:** `state.animTime` must increment by 1 per frame so sine functions have stable phase. Game loop handles this.
- **GOTCHA 2:** Don't add CSS transitions on `.gg-bb-avatar` — JS sets transform per-frame.
- **GOTCHA 3:** `Object.assign` not used (older Chromebook safety) — explicit copy-loop instead.

- **VALIDATE:**
  1. No automated test; visual validation happens in Task 8.
  2. Sanity check: open the file, verify all 4 animState branches present.
  3. Commit: `git add GAME/screens/bias-breaker-avatar.js && git commit -m "Add player avatar SVG with idle/running/jumping/falling animations (Phase 2 Task 4)"`

---

### Task 5: Boss renderer in `bias-breaker-boss.js`

- **ACTION:** Create `GAME/screens/bias-breaker-boss.js` exporting a canvas `draw` function.

- **IMPLEMENT (`GAME/screens/bias-breaker-boss.js`):**

```js
// GAME/screens/bias-breaker-boss.js — Unfair Gatekeeper. Canvas-drawn.
window.GG = window.GG || {};

GG.biasBreakerBoss = (function() {
  var WIDTH  = 130;
  var HEIGHT = 220;

  function draw(ctx, state) {
    var x = state.x;
    var y = state.y + Math.sin(state.animTime * 0.06) * 4;
    var hp = state.hp;
    var flash = Math.max(0, Math.min(1, state.hitFlash || 0));

    ctx.save();

    if (state.defeated) {
      var t = state.animTime - (state.defeatedAt || state.animTime);
      var alpha = Math.max(0, 1 - t / 60);
      ctx.globalAlpha = alpha;
      for (var i = 0; i < 20; i++) {
        var bitX = x + (i * 7) % WIDTH;
        var bitY = y + ((i * 13) % HEIGHT) - t * (1 + (i % 4));
        ctx.fillStyle = '#5b2c87';
        ctx.fillRect(bitX, bitY, 6, 6);
      }
      ctx.restore();
      return;
    }

    drawSegment(ctx, x + 10, y + 130, WIDTH - 20, 70, hp >= 1, flash);
    drawSegment(ctx, x +  5, y +  60, WIDTH - 10, 75, hp >= 2, flash);
    drawSegment(ctx, x + 15, y,       WIDTH - 30, 60, hp >= 3, flash);

    var eyeGlow = 0.4 + (hp / 3) * 0.6;
    drawXEye(ctx, x + 35,         y + 22, eyeGlow);
    drawXEye(ctx, x + WIDTH - 35, y + 22, eyeGlow);

    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('UNFAIR', x + WIDTH / 2, y + 100);

    ctx.restore();
  }

  function drawSegment(ctx, x, y, w, h, intact, flash) {
    if (flash > 0) {
      ctx.shadowColor = 'rgba(245, 87, 108, ' + flash + ')';
      ctx.shadowBlur = 24 * flash;
    } else {
      ctx.shadowBlur = 0;
    }

    ctx.fillStyle = intact ? '#5b2c87' : '#2c1742';
    ctx.beginPath();
    roundRect(ctx, x, y, w, h, 12);
    ctx.fill();

    ctx.strokeStyle = intact ? '#ffd700' : '#4a3060';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    roundRect(ctx, x, y, w, h, 12);
    ctx.stroke();

    if (!intact) {
      ctx.strokeStyle = 'rgba(245, 87, 108, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.3, y + 4);
      ctx.lineTo(x + w * 0.5, y + h * 0.5);
      ctx.lineTo(x + w * 0.2, y + h - 4);
      ctx.moveTo(x + w * 0.6, y + 2);
      ctx.lineTo(x + w * 0.7, y + h * 0.6);
      ctx.lineTo(x + w * 0.85, y + h - 2);
      ctx.stroke();
    }
  }

  function drawXEye(ctx, cx, cy, glow) {
    ctx.save();
    ctx.shadowColor = 'rgba(245, 87, 108, ' + glow + ')';
    ctx.shadowBlur = 12 * glow;
    ctx.strokeStyle = 'rgb(' + Math.round(245 * glow + 60) + ', 87, 108)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 8); ctx.lineTo(cx + 8, cy + 8);
    ctx.moveTo(cx + 8, cy - 8); ctx.lineTo(cx - 8, cy + 8);
    ctx.stroke();
    ctx.restore();
  }

  function roundRect(ctx, x, y, w, h, r) {
    if (r > w / 2) r = w / 2;
    if (r > h / 2) r = h / 2;
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y,     x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x,     y + h, r);
    ctx.arcTo(x,     y + h, x,     y,     r);
    ctx.arcTo(x,     y,     x + w, y,     r);
    ctx.closePath();
  }

  return { draw: draw, WIDTH: WIDTH, HEIGHT: HEIGHT };
})();
```

- **MIRROR:** `NAMESPACE_AND_IIFE`. Exports `WIDTH`/`HEIGHT` constants so caller doesn't hardcode.

- **DEPENDS:** Canvas 2D API.

- **GOTCHA:** Always `ctx.save()` + `ctx.restore()` around drawing — shadow/style state is global.

- **VALIDATE:**
  1. Visual check happens in Task 8.
  2. Commit: `git add GAME/screens/bias-breaker-boss.js && git commit -m "Add Unfair Gatekeeper canvas renderer (Phase 2 Task 5)"`

---

### Task 6: Celebration screen `bias-breaker-celebration.js`

- **ACTION:** Create `GAME/screens/bias-breaker-celebration.js`.

- **IMPLEMENT (`GAME/screens/bias-breaker-celebration.js`):**

```js
// GAME/screens/bias-breaker-celebration.js — Win screen with confetti + stars.
window.GG = window.GG || {};

GG.biasBreakerCelebration = (function() {

  function show(stageEl, opts) {
    var overlay = document.createElement('div');
    overlay.className = 'gg-bb-celebration';

    var confettiCanvas = document.createElement('canvas');
    confettiCanvas.className = 'gg-bb-confetti-canvas';
    confettiCanvas.width = stageEl.clientWidth;
    confettiCanvas.height = stageEl.clientHeight;

    var h1 = document.createElement('h1');
    h1.textContent = 'You freed the city!';
    overlay.appendChild(h1);

    var p = document.createElement('p');
    p.textContent = 'Bias Breaker is healed. Fair AI treats everyone the same — you helped Datapolis learn that.';
    overlay.appendChild(p);

    var starsEl = document.createElement('div');
    starsEl.className = 'gg-bb-celebration-stars';
    var filled = Math.max(1, Math.min(3, opts.stars || 1));
    var s = '';
    for (var i = 0; i < filled; i++) s += '⭐';
    for (var j = 0; j < 3 - filled; j++) s += '☆';
    starsEl.textContent = s;
    overlay.appendChild(starsEl);

    var unlocked = document.createElement('div');
    unlocked.className = 'gg-bb-celebration-unlocked';
    unlocked.textContent = '🌊 Bad-Habit Harbor unlocked!';
    overlay.appendChild(unlocked);

    var btn = document.createElement('button');
    btn.className = 'gg-button gg-secondary';
    btn.type = 'button';
    btn.textContent = '🏠 Back to Map';
    btn.addEventListener('click', function() {
      stopConfetti();
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (confettiCanvas.parentNode) confettiCanvas.parentNode.removeChild(confettiCanvas);
      opts.onContinue();
    });
    overlay.appendChild(btn);

    stageEl.appendChild(confettiCanvas);
    stageEl.appendChild(overlay);

    var handle = startConfetti(confettiCanvas);
    function stopConfetti() { cancelAnimationFrame(handle.raf); handle.alive = false; }
  }

  function startConfetti(canvas) {
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;
    var COLORS = ['#43e97b', '#ffd700', '#f5576c', '#38f9d7', '#f093fb'];
    var particles = [];
    for (var i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * w,
        y: -Math.random() * h,
        vx: (Math.random() - 0.5) * 3,
        vy: 2 + Math.random() * 4,
        size: 5 + Math.random() * 6,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.2,
        color: COLORS[(Math.random() * COLORS.length) | 0]
      });
    }

    var handle = { raf: 0, alive: true };
    function tick() {
      if (!handle.alive) return;
      ctx.clearRect(0, 0, w, h);
      particles.forEach(function(p) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.rot += p.vr;
        if (p.y > h + 20) { p.y = -10; p.x = Math.random() * w; p.vy = 2; }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });
      handle.raf = requestAnimationFrame(tick);
    }
    handle.raf = requestAnimationFrame(tick);
    return handle;
  }

  return { show: show };
})();
```

- **MIRROR:** `NAMESPACE_AND_IIFE`, `NO_INNER_HTML`.

- **DEPENDS:** `requestAnimationFrame`, Canvas 2D.

- **GOTCHA:** Stop the confetti `rAF` when the player clicks Back to Map. Otherwise the loop keeps firing forever.

- **VALIDATE:**
  1. Visual check happens in Task 8.
  2. Commit: `git add GAME/screens/bias-breaker-celebration.js && git commit -m "Add Bias Breaker celebration screen with confetti and stars (Phase 2 Task 6)"`

---

### Task 7: Main level orchestrator `bias-breaker.js` (the big one)

- **ACTION:** Create `GAME/screens/bias-breaker.js`. Game loop, physics, modal, win flow.

- **IMPLEMENT (`GAME/screens/bias-breaker.js`):**

```js
// GAME/screens/bias-breaker.js — Main level orchestrator.
window.GG = window.GG || {};
GG.screens = GG.screens || {};

GG.screens.biasBreaker = (function() {
  var CANVAS_W = 900;
  var CANVAS_H = 500;
  var GRAVITY    = 0.8;
  var JUMP_SPEED = -14;
  var WALK_SPEED = 4;
  var FRICTION   = 0.85;
  var PLAYER_W   = 50;
  var PLAYER_H   = 100;

  function buildPlatforms() {
    return [
      { x:    0, y: 420, w: 160, h: 80 },
      { x:  220, y: 380, w: 140, h: 80 },
      { x:  420, y: 340, w: 140, h: 80 },
      { x:  620, y: 300, w: 140, h: 80 },
      { x:  800, y: 260, w: 140, h: 80 },
      { x:  980, y: 220, w: 220, h: 80 }   // boss arena
    ];
  }

  function render(rootEl, profile, onComplete) {
    var stageEl = document.createElement('div');
    stageEl.className = 'gg-bb-stage';

    var canvas = document.createElement('canvas');
    canvas.className = 'gg-bb-canvas';
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    stageEl.appendChild(canvas);

    var avatarRefs = GG.biasBreakerAvatar.build();
    stageEl.appendChild(avatarRefs.svg);

    var hud = buildHUD();
    stageEl.appendChild(hud.root);

    var fallOverlay = document.createElement('div');
    fallOverlay.className = 'gg-bb-fall-overlay';
    stageEl.appendChild(fallOverlay);

    rootEl.appendChild(stageEl);

    var ctx = canvas.getContext('2d');
    var keys = {};
    var platforms = buildPlatforms();

    var state = {
      x: 40, y: 320, vx: 0, vy: 0,
      facing: 'right',
      onGround: false,
      currentPlatform: 0,
      maxPlatformReached: 0,
      falls: 0,
      seenQuestionIds: [],
      animState: 'idle',
      animTime: 0,
      atBoss: false,
      bossHP: 3,
      bossX: 1080, bossY: 30,
      bossHitFlash: 0,
      bossDefeated: false,
      bossDefeatedAt: 0,
      camX: 0,
      modalOpen: false,
      isPaused: false,
      running: true
    };

    function onKeyDown(e) {
      keys[e.code] = true;
      if (['Space','ArrowLeft','ArrowRight','ArrowUp','KeyA','KeyD','KeyW'].indexOf(e.code) >= 0) {
        e.preventDefault();
      }
      if (e.code === 'Escape' && !state.modalOpen) {
        state.isPaused = !state.isPaused;
        if (state.isPaused) showPauseOverlay(); else hidePauseOverlay();
      }
    }
    function onKeyUp(e) { keys[e.code] = false; }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup',   onKeyUp);

    var pauseOverlay = null;
    function showPauseOverlay() {
      if (pauseOverlay) return;
      pauseOverlay = document.createElement('div');
      pauseOverlay.className = 'gg-bb-pause';
      var h2 = document.createElement('h2'); h2.textContent = 'Paused'; pauseOverlay.appendChild(h2);
      var resume = document.createElement('button');
      resume.className = 'gg-button gg-primary'; resume.type = 'button'; resume.textContent = 'Resume';
      resume.addEventListener('click', function() { state.isPaused = false; hidePauseOverlay(); });
      pauseOverlay.appendChild(resume);
      var back = document.createElement('button');
      back.className = 'gg-button gg-secondary'; back.type = 'button'; back.textContent = 'Back to Map';
      back.addEventListener('click', function() { cleanup(); onComplete({ cleared: false, stars: 0 }); });
      pauseOverlay.appendChild(back);
      stageEl.appendChild(pauseOverlay);
    }
    function hidePauseOverlay() {
      if (pauseOverlay && pauseOverlay.parentNode) pauseOverlay.parentNode.removeChild(pauseOverlay);
      pauseOverlay = null;
    }

    function pickQuestion(forBoss) {
      var pool = forBoss ?
        GG.biasBreakerQuestions.slice(5, 8) :
        GG.biasBreakerQuestions.slice(0, 5);
      var unseen = pool.filter(function(q) { return state.seenQuestionIds.indexOf(q.id) === -1; });
      var chosen = unseen.length > 0 ?
        unseen[Math.floor(Math.random() * unseen.length)] :
        pool[Math.floor(Math.random() * pool.length)];
      state.seenQuestionIds.push(chosen.id);
      return chosen;
    }
    function shuffle(arr) {
      var out = arr.slice();
      for (var i = out.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = out[i]; out[i] = out[j]; out[j] = t;
      }
      return out;
    }

    function showModal(forBoss, onCorrect) {
      state.modalOpen = true;
      state.isPaused = true;
      var modal = document.createElement('div');
      modal.className = 'gg-bb-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');

      function renderQ(question) {
        while (modal.firstChild) modal.removeChild(modal.firstChild);

        var qText = document.createElement('div');
        qText.className = 'gg-bb-modal-question';
        qText.textContent = question.question;
        modal.appendChild(qText);

        var optionsEl = document.createElement('div');
        optionsEl.className = 'gg-bb-modal-options';
        shuffle(question.options).forEach(function(opt) {
          var b = document.createElement('button');
          b.className = 'gg-bb-modal-option';
          b.type = 'button';
          b.textContent = opt.text;
          b.addEventListener('click', function() {
            Array.prototype.forEach.call(modal.querySelectorAll('.gg-bb-modal-option'), function(btn) { btn.disabled = true; });
            var feedback = document.createElement('div');
            feedback.className = 'gg-bb-modal-feedback ' + (opt.correct ? 'gg-bb-correct' : 'gg-bb-wrong');
            feedback.textContent = opt.correct ? opt.motivation : opt.explanation;
            modal.appendChild(feedback);
            setTimeout(function() {
              if (opt.correct) {
                if (modal.parentNode) modal.parentNode.removeChild(modal);
                state.modalOpen = false;
                state.isPaused = false;
                onCorrect();
              } else {
                renderQ(pickQuestion(forBoss));
              }
            }, opt.correct ? 800 : 1600);
          });
          optionsEl.appendChild(b);
        });
        modal.appendChild(optionsEl);
      }

      renderQ(pickQuestion(forBoss));
      stageEl.appendChild(modal);
    }

    function platformExists(idx) { return idx <= state.maxPlatformReached; }

    function checkPlatformCollisions() {
      state.onGround = false;
      for (var i = 0; i < platforms.length; i++) {
        if (!platformExists(i)) continue;
        var p = platforms[i];
        var px1 = state.x, px2 = state.x + PLAYER_W;
        var py2 = state.y + PLAYER_H;
        if (px2 > p.x && px1 < p.x + p.w && py2 >= p.y && py2 <= p.y + 30 && state.vy > 0) {
          state.y = p.y - PLAYER_H;
          state.vy = 0;
          state.onGround = true;
          state.currentPlatform = i;
          if (i > state.maxPlatformReached) state.maxPlatformReached = i;
        }
      }
    }

    function checkGapReach() {
      if (state.modalOpen) return;
      var cur = platforms[state.currentPlatform];
      var next = platforms[state.currentPlatform + 1];
      if (!next) return;
      var rightEdge = cur.x + cur.w;
      var playerRight = state.x + PLAYER_W;
      if (state.onGround && playerRight >= rightEdge - 10 && state.maxPlatformReached === state.currentPlatform) {
        var isLastGap = (state.currentPlatform === platforms.length - 2);
        state.x = rightEdge - PLAYER_W - 15;
        state.vx = 0;
        showModal(false, function() {
          state.maxPlatformReached++;
          hud.setPlatforms(state.maxPlatformReached, platforms.length - 1);
          if (isLastGap) { state.atBoss = true; hud.setBoss(state.bossHP); startBossLoop(); }
        });
      }
    }

    function checkFall() {
      if (state.y > CANVAS_H + 100) {
        state.falls++;
        fallOverlay.classList.add('gg-bb-fading');
        setTimeout(function() {
          var resp = platforms[state.maxPlatformReached];
          state.x = resp.x + 20;
          state.y = resp.y - PLAYER_H;
          state.vx = 0; state.vy = 0;
          state.onGround = true;
          state.currentPlatform = state.maxPlatformReached;
          fallOverlay.classList.remove('gg-bb-fading');
        }, 250);
      }
    }

    function startBossLoop() {
      showModal(true, function() {
        state.bossHP--;
        state.bossHitFlash = 1;
        hud.setBoss(state.bossHP);
        if (state.bossHP > 0) {
          startBossLoop();
        } else {
          state.bossDefeated = true;
          state.bossDefeatedAt = state.animTime;
          setTimeout(function() {
            var stars = state.falls === 0 ? 3 : state.falls <= 2 ? 2 : 1;
            GG.biasBreakerCelebration.show(stageEl, {
              stars: stars,
              onContinue: function() {
                cleanup();
                onComplete({ cleared: true, stars: stars });
              }
            });
          }, 1100);
        }
      });
    }

    function buildHUD() {
      var root = document.createElement('div');
      root.className = 'gg-bb-hud';
      var pl = document.createElement('span'); pl.className = 'gg-bb-hud-platforms'; root.appendChild(pl);
      var bs = document.createElement('span'); bs.className = 'gg-bb-hud-boss'; bs.hidden = true; root.appendChild(bs);

      function setPlatforms(cur, total) { pl.textContent = 'Platforms: ' + cur + '/' + total; }
      function setBoss(hp) {
        if (hp === null || hp === undefined) { bs.hidden = true; return; }
        bs.hidden = false;
        var hearts = '';
        for (var i = 0; i < hp; i++) hearts += '♥';
        for (var j = 0; j < 3 - hp; j++) hearts += '♡';
        bs.textContent = 'Gatekeeper HP: ' + hearts;
      }
      setPlatforms(0, platforms.length - 1);
      return { root: root, setPlatforms: setPlatforms, setBoss: setBoss };
    }

    function drawBackground() {
      var g = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      g.addColorStop(0, '#0a0820');
      g.addColorStop(1, '#1a1247');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      for (var y = 0; y < CANVAS_H; y += 4) ctx.fillRect(0, y, CANVAS_W, 1);

      ctx.fillStyle = 'rgba(67, 233, 255, 0.15)';
      for (var i = 0; i < 15; i++) {
        var rx = (i * 67 + state.animTime * 0.5) % CANVAS_W;
        var ry = (state.animTime * 1.2 + i * 50) % (CANVAS_H + 60);
        ctx.fillRect(rx, CANVAS_H - ry, 2, 20);
      }
    }

    function drawPlatforms() {
      for (var i = 0; i < platforms.length; i++) {
        if (!platformExists(i)) continue;
        var p = platforms[i];
        ctx.shadowColor = 'rgba(67, 233, 123, 0.6)';
        ctx.shadowBlur = 18;
        ctx.fillStyle = '#43e97b';
        ctx.beginPath();
        roundRect(ctx, p.x - state.camX, p.y, p.w, p.h, 14);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillRect(p.x - state.camX + 8, p.y + 4, p.w - 16, 4);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(p.x - state.camX, p.y + p.h - 4, p.w, 4);
      }
    }

    function roundRect(ctx, x, y, w, h, r) {
      if (r > w / 2) r = w / 2;
      if (r > h / 2) r = h / 2;
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y,     x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x,     y + h, r);
      ctx.arcTo(x,     y + h, x,     y,     r);
      ctx.arcTo(x,     y,     x + w, y,     r);
      ctx.closePath();
    }

    function updateAvatar() {
      var anim = 'idle';
      if (!state.onGround) anim = state.vy < 0 ? 'jumping' : 'falling';
      else if (Math.abs(state.vx) > 0.5) anim = 'running';
      state.animState = anim;
      GG.biasBreakerAvatar.update(avatarRefs, {
        x: state.x - state.camX,
        y: state.y,
        facing: state.facing,
        animState: anim,
        animTime: state.animTime
      });
    }

    function updateCamera() {
      var target = state.x - CANVAS_W / 3;
      state.camX += (Math.max(0, target) - state.camX) * 0.1;
    }

    function tick() {
      if (!state.running) return;
      requestAnimationFrame(tick);
      if (state.isPaused) return;
      state.animTime++;

      var goLeft  = keys.KeyA || keys.ArrowLeft;
      var goRight = keys.KeyD || keys.ArrowRight;
      var jump    = keys.Space || keys.KeyW || keys.ArrowUp;

      if (goLeft)  { state.vx = -WALK_SPEED; state.facing = 'left';  }
      if (goRight) { state.vx =  WALK_SPEED; state.facing = 'right'; }
      if (!goLeft && !goRight && state.onGround) state.vx *= FRICTION;
      if (jump && state.onGround) { state.vy = JUMP_SPEED; state.onGround = false; }

      state.vy += GRAVITY;
      state.x  += state.vx;
      state.y  += state.vy;
      checkPlatformCollisions();
      checkGapReach();
      checkFall();
      updateCamera();

      if (state.bossHitFlash > 0) state.bossHitFlash -= 0.06;

      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      drawBackground();
      drawPlatforms();
      if (state.atBoss) {
        GG.biasBreakerBoss.draw(ctx, {
          x: state.bossX - state.camX, y: state.bossY,
          hp: state.bossHP, animTime: state.animTime,
          hitFlash: state.bossHitFlash,
          defeated: state.bossDefeated, defeatedAt: state.bossDefeatedAt
        });
      }
      updateAvatar();
    }

    function cleanup() {
      state.running = false;
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup',   onKeyUp);
      hidePauseOverlay();
    }

    requestAnimationFrame(tick);
  }

  return { render: render };
})();
```

- **MIRROR:** `NAMESPACE_AND_IIFE`, `NO_INNER_HTML`.

- **DEPENDS:** Tasks 2 (`GG.biasBreakerQuestions`), 4 (`GG.biasBreakerAvatar`), 5 (`GG.biasBreakerBoss`), 6 (`GG.biasBreakerCelebration`), 3 (CSS classes).

- **GOTCHA 1:** `e.preventDefault()` on game keys so Space doesn't scroll the page.
- **GOTCHA 2:** Set `isPaused = true` whenever the modal is open — otherwise physics keeps running during the dialog.
- **GOTCHA 3:** Camera `camX` must subtract from every world-space draw — otherwise platforms stick to the screen as the player runs.
- **GOTCHA 4:** Remove keyboard listeners in `cleanup()` — otherwise A/D keys still affect ghost state.

- **VALIDATE:**
  1. Can't validate until Task 8 wires it in. Sanity-check by reloading after Task 8 — no parse errors.
  2. Commit: `git add GAME/screens/bias-breaker.js && git commit -m "Add Bias Breaker main level: canvas game loop + physics + modal + boss flow (Phase 2 Task 7)"`

---

### Task 8: Wire scripts into `index.html` + router special-case

- **ACTION:** Two surgical edits.

- **IMPLEMENT (1) — `index.html`:** Find the existing block of Phase 1 game scripts:

```html
    <link rel="stylesheet" href="GAME/glitch-guardians.css">
    <div id="gg-root" hidden></div>
    <script src="GAME/state.js"></script>
    <script src="GAME/screens/onboarding.js"></script>
    <script src="GAME/screens/map.js"></script>
    <script src="GAME/screens/island-intro.js"></script>
    <script src="GAME/glitch-guardians.js"></script>
```

Replace with:

```html
    <link rel="stylesheet" href="GAME/glitch-guardians.css">
    <div id="gg-root" hidden></div>
    <script src="GAME/state.js"></script>
    <script src="GAME/screens/onboarding.js"></script>
    <script src="GAME/screens/map.js"></script>
    <script src="GAME/screens/island-intro.js"></script>
    <!-- Phase 2: Bias Breaker -->
    <script src="GAME/screens/bias-breaker-questions.js"></script>
    <script src="GAME/screens/bias-breaker-avatar.js"></script>
    <script src="GAME/screens/bias-breaker-boss.js"></script>
    <script src="GAME/screens/bias-breaker-celebration.js"></script>
    <script src="GAME/screens/bias-breaker.js"></script>
    <script src="GAME/glitch-guardians.js"></script>
```

- **IMPLEMENT (2) — `GAME/glitch-guardians.js`:** Find:

```js
function goToIslandIntro(screenEl, profile, islandId) {
  GG.screens.islandIntro.render(screenEl, islandId, function() {
    goToMap(screenEl, profile, true);
  });
}
```

Replace with:

```js
function goToIslandIntro(screenEl, profile, islandId) {
  // Phase 2: Bias Breaker has real gameplay. Other islands show Coming Soon intro.
  if (islandId === 'bias-breaker' &&
      profile.progress['bias-breaker'] &&
      profile.progress['bias-breaker'].unlocked &&
      GG.screens.biasBreaker) {
    GG.screens.biasBreaker.render(screenEl, profile, function(result) {
      if (result && result.cleared) {
        var saveResult = GG.state.markIslandCleared('bias-breaker', result.stars);
        if (!saveResult.ok) {
          showSaveBanner(document.getElementById('gg-root'));
        }
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

- **MIRROR:** `ROUTER_SCREEN_DISPATCH` (preserved unchanged for non-Bias-Breaker paths).

- **DEPENDS:** Tasks 1-7.

- **GOTCHA 1:** Phase 2 `<script>` tags MUST appear before `glitch-guardians.js` so the router can reference `GG.screens.biasBreaker` at definition time.
- **GOTCHA 2:** Defensive `GG.screens.biasBreaker` check falls back to the Coming Soon intro if scripts somehow aren't loaded (cached old HTML).

- **VALIDATE:**
  1. Server: `python -m http.server 7891`.
  2. Browser: `http://localhost:7891/index.html` (use incognito to bypass cache or add `?v=p2` to URL).
  3. Click Play → map → Bias Breaker.
  4. Real platformer loads. Run, jump, answer questions, defeat boss, see celebration, return to map. Habit Harbor now unlocked.
  5. DevTools console: 0 red errors.
  6. Commit: `git add index.html GAME/glitch-guardians.js && git commit -m "Wire Bias Breaker scripts + router special-case (Phase 2 Task 8)"`

---

### Task 9: Extend `PLAYTEST.md` + run final manual QA

- **ACTION:** Append a Phase 2 section to the playtest checklist; walk through every item.

- **IMPLEMENT (append to `GAME/PLAYTEST.md`):**

```markdown

---

# Phase 2 — Bias Breaker Platformer

## Pre-flight
- [ ] `python -m http.server 7891` running
- [ ] DevTools console clean before entry
- [ ] `http://localhost:7891/GAME/test.html` shows **12 / 12 passed**

## Level entry
- [ ] Open `http://localhost:7891/index.html`, click Play
- [ ] Complete onboarding if first run; otherwise map appears
- [ ] Click Bias Breaker
- [ ] Stage loads: neon-cyber canvas, faint scan lines, digital rain visible
- [ ] Player avatar visible on the leftmost platform, idle pose, eyes open (confident)
- [ ] HUD: "Platforms: 0/5"

## Movement
- [ ] Press D — player runs right; legs alternate; faces right
- [ ] Press A — player flips, faces left, runs left
- [ ] Press Space — player jumps; descends with gravity; lands cleanly on a platform
- [ ] Press Esc — pause overlay appears; Resume returns to game

## Questions + platform spawning
- [ ] Walk to right edge of starting platform
- [ ] Modal slides up with the question text + 4 stacked options
- [ ] Pick wrong answer → red feedback box with explanation → new question loads
- [ ] Pick correct answer → green feedback → ~800ms delay → modal closes → game resumes
- [ ] HUD updates to "Platforms: 1/5"
- [ ] Repeat 4 more times — each platform spawns visibly

## Boss
- [ ] After 5th platform, boss appears (Unfair Gatekeeper, 3 HP hearts in HUD)
- [ ] Modal appears with boss-tier question
- [ ] Correct answer → boss flashes red, one body segment cracks, eye dims
- [ ] Repeat 2 more times → boss collapses into floating pixels

## Celebration
- [ ] Confetti rains down (square pixels in 5 colors)
- [ ] Headline: "You freed the city!"
- [ ] Stars displayed (⭐⭐⭐ if 0 falls, ⭐⭐☆ if 1-2, ⭐☆☆ if 3+)
- [ ] "🌊 Bad-Habit Harbor unlocked!" toast
- [ ] Click Back to Map

## Post-win
- [ ] Map: Habit Harbor no longer shows the chain-lock icon; it's now unlocked
- [ ] DevTools → Application → Local Storage → `gg.profile.progress["bias-breaker"]` has `cleared: true`, `stars: N`
- [ ] `gg.profile.progress["habit-harbor"].unlocked` is `true`

## Fall + restart
- [ ] Mid-level, jump off a platform deliberately
- [ ] 200ms fade-to-black
- [ ] Respawn on last cleared platform, questions-state preserved
- [ ] Falls counter affects final stars

## Returning player after a clear
- [ ] Reload, open game → map shows Habit Harbor unlocked
- [ ] Click Bias Breaker → level plays again (within-session state is fresh, but Habit Harbor stays unlocked)

## Console + storage edge cases
- [ ] No red console errors during entire playthrough
- [ ] If `localStorage.setItem` is monkey-patched to throw during the win → celebration still shows; banner on next map render

## Performance
- [ ] Smooth ~60 fps on test machine; no visible jank during platform spawns, modal transitions, confetti
```

- **ACTION (run the checklist):**

Methodically check every item in a real browser. Fix any failing item by jumping back to the relevant earlier task and re-validating.

- **DEPENDS:** Tasks 1–8.

- **GOTCHA:** The "Map: Bias Breaker visually cleared" item depends on Phase 1's map showing a "cleared" indicator. Phase 1 didn't differentiate cleared from unlocked. For Phase 2 we only verify the *functional* unlock (Habit Harbor changes to unlocked). The visual "cleared" indicator on Bias Breaker itself is a small map.js follow-up — flag it for a Phase 2.5 polish task if Mishika wants it.

- **VALIDATE:**
  1. Walk every checklist item in Chrome (or your default browser).
  2. Commit: `git add GAME/PLAYTEST.md && git commit -m "Extend playtest checklist with Phase 2 Bias Breaker verification (Phase 2 Task 9)"`
  3. Tag: `git tag -a "gg-phase2-bias-breaker" -m "Glitch Guardians Phase 2: Bias Breaker playable level + boss + celebration"`

---

## Testing Strategy

### Unit tests (automated, in `GAME/test.html`)

| Test (new in Phase 2) | Coverage |
|---|---|
| markIslandCleared sets cleared/stars | normal happy path |
| markIslandCleared keeps best-of stars | regression-safe stars |
| markIslandCleared unlocks next island | cross-island side effect |
| markIslandCleared on 'the-core' | no crash on terminal island |
| Question pool sanity | data shape validation |

Total after Phase 2: **12 automated tests** (7 + 5).

### Manual edge cases

- Fall off a platform → fade → respawn at last cleared
- Wrong answer → red explanation → new question
- Exit via Back to App mid-game → game cleans up; profile not marked cleared
- localStorage write fails at win → celebration still shows
- Escape mid-jump → pause overlay → Resume continues from same physics
- Two adjacent gaps in fast succession — no race conditions in modal show/hide

## Validation Commands

```bash
# 1) Start server
python -m http.server 7891

# 2) Unit tests (browser)
# Open http://localhost:7891/GAME/test.html
# EXPECT: 12 / 12 passed

# 3) Full playthrough (browser)
# Open http://localhost:7891/index.html
# EXPECT: complete the level end-to-end, see celebration, return to map with Habit Harbor unlocked
```

---

## Acceptance Criteria

- [ ] All 9 tasks completed
- [ ] All 12 automated tests pass
- [ ] Manual playtest (Phase 1 + Phase 2) passes 100%
- [ ] Existing AI Glitch Buster app behavior unchanged
- [ ] Code organized as described in spec §3
- [ ] No console errors during a full playthrough
- [ ] Tag `gg-phase2-bias-breaker` created

## Completion Checklist

- [ ] All `GG.*` names follow `NAMESPACE_AND_IIFE`
- [ ] All CSS classes prefixed `.gg-bb-*` (or extend Phase 1 `.gg-*`)
- [ ] No `innerHTML` anywhere in new code (security hook would block)
- [ ] All new tests in `GAME/test.js` use the existing `test()` helper
- [ ] All commits include the kids-disclaimer + Co-Authored-By footer
- [ ] State changes go through `GG.state.markIslandCleared` — no direct `localStorage.setItem`
- [ ] No hardcoded URLs, no external CDN dependencies
- [ ] PLAYTEST.md updated and final QA executed

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| SVG limb animation feels janky | Medium | Medium | Sine-driven smoothness; if visible jitter, lerp between keyframes |
| Canvas + SVG layering click-handling weirdness | Low | Low | Avatar has `pointer-events: none`; canvas has no listeners |
| Question pool feels repetitive on replays | High | Low | Phase 3's AI engine fixes this; shuffling helps for Phase 2 |
| Phase 2 breaks Phase 1 functionality | Low | High | Router preserves else-branch; PLAYTEST verifies Phase 1 still passes |
| `markIslandCleared` corrupts profile | Low | High | TDD-covered; `state.load` validates |
| Star calculation feels harsh | Medium | Low | Thresholds are constants; tunable after playtest |
| Avatar SVG tanks 60 fps | Low | Medium | Tiny SVG (~25 elements); test in playtest |

## Notes

- **Confidence score: 8/10** for single-pass implementation. Patterns are well-established from Phase 1; only new mechanic is the game loop.

- **Approximate Opus subagent duration per task:** Task 1 ~10m, Task 2 ~15m, Task 3 ~10m, Task 4 ~20m, Task 5 ~15m, Task 6 ~12m, Task 7 ~45m, Task 8 ~5m, Task 9 ~25m.

- **Phase 3 preview:** AI Quiz Engine replaces `bias-breaker-questions.js` with an async source. Game loop + modal stay identical.
