# Glitch Guardians — Shell Implementation Plan (Phase 1)

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the smallest end-to-end playable shell for *Glitch Guardians*: a launcher button in `index.html`, full-screen game container, onboarding (name + grade), Datapolis SVG world map with 5 islands (Bias Breaker unlocked, 4 locked), and a "Coming Soon" island intro — all with localStorage persistence and a manual playtest checklist.

**Architecture:** Vanilla HTML/CSS/JS (no build step). Game code is a self-contained module under `GAME/` that the existing `index.html` loads. One global `window.GG` namespace with submodules (`GG.state`, `GG.screens.*`, `GG.start`, `GG.exit`). Every CSS class is prefixed `gg-` to prevent style collisions with the existing 145KB app. State persists to `localStorage` under one key (`gg.profile`).

**Tech Stack:** HTML5 (incl. SVG for map), CSS3 (gradients, animations, no preprocessor), Plain JavaScript (no jQuery, no React, no framework), browser `localStorage` and `history.pushState` APIs. No npm, no Node, no bundler.

**Spec:** [docs/superpowers/specs/2026-05-26-glitch-guardians-shell-design.md](../specs/2026-05-26-glitch-guardians-shell-design.md)

---

## Task 1: Project scaffolding

Create the empty file tree so subsequent tasks have homes for code.

**Files:**
- Create: `GAME/state.js` (empty stub)
- Create: `GAME/glitch-guardians.js` (empty stub)
- Create: `GAME/glitch-guardians.css` (empty)
- Create: `GAME/screens/onboarding.js` (empty stub)
- Create: `GAME/screens/map.js` (empty stub)
- Create: `GAME/screens/island-intro.js` (empty stub)
- Create: `GAME/test.html` (placeholder)
- Create: `GAME/test.js` (empty stub)

- [ ] **Step 1: Create `GAME/state.js` with module placeholder**

```js
// GAME/state.js — Player profile + progress + localStorage persistence
// Filled in during Task 2.
window.GG = window.GG || {};
GG.state = {};
```

- [ ] **Step 2: Create `GAME/glitch-guardians.js` with module placeholder**

```js
// GAME/glitch-guardians.js — Entry point and screen router.
// Filled in during Task 4.
window.GG = window.GG || {};
GG.start = function() { console.log('GG.start: not yet implemented'); };
GG.exit  = function() { console.log('GG.exit: not yet implemented'); };
```

- [ ] **Step 3: Create `GAME/glitch-guardians.css` empty**

```css
/* Glitch Guardians — Phase 1 styles. Every class prefixed .gg-.
 * Filled in during Task 3. */
```

- [ ] **Step 4: Create `GAME/screens/onboarding.js` placeholder**

```js
// GAME/screens/onboarding.js — Filled in during Task 5.
window.GG = window.GG || {};
GG.screens = GG.screens || {};
GG.screens.onboarding = {
  render: function(rootEl, onComplete) {
    rootEl.innerHTML = '<p style="color:white;padding:80px 20px;">Stub: Onboarding screen (Task 5 will replace this)</p>';
  }
};
```

- [ ] **Step 5: Create `GAME/screens/map.js` placeholder**

```js
// GAME/screens/map.js — Filled in during Task 6.
window.GG = window.GG || {};
GG.screens = GG.screens || {};
GG.screens.map = {
  render: function(rootEl, profile, isReturning, onIslandSelect) {
    rootEl.innerHTML = '<p style="color:white;padding:80px 20px;">Stub: Map screen for ' +
                       (profile && profile.name ? profile.name : '???') + ' (Task 6 will replace this)</p>' +
                       '<button class="gg-button gg-primary" id="gg-stub-island">Pretend-click Bias Breaker</button>';
    var btn = rootEl.querySelector('#gg-stub-island');
    if (btn) btn.addEventListener('click', function() { onIslandSelect('bias-breaker'); });
  }
};
```

- [ ] **Step 6: Create `GAME/screens/island-intro.js` placeholder**

```js
// GAME/screens/island-intro.js — Filled in during Task 7.
window.GG = window.GG || {};
GG.screens = GG.screens || {};
GG.screens.islandIntro = {
  render: function(rootEl, islandId, onBack) {
    rootEl.innerHTML = '<p style="color:white;padding:80px 20px;">Stub: Island intro for ' + islandId +
                       ' (Task 7 will replace this)</p>' +
                       '<button class="gg-button gg-secondary" id="gg-stub-back">← Back to Map</button>';
    var btn = rootEl.querySelector('#gg-stub-back');
    if (btn) btn.addEventListener('click', onBack);
  }
};
```

- [ ] **Step 7: Create `GAME/test.html` placeholder**

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Glitch Guardians — Test Runner</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 2em; max-width: 800px; margin: 0 auto; }
    table { width: 100%; margin-top: 1em; border-collapse: collapse; }
    th, td { padding: 6px 12px; border-bottom: 1px solid #eee; text-align: left; }
    th { background: #f5f5f5; }
  </style>
</head>
<body>
  <div id="test-results">Loading…</div>
  <script src="state.js"></script>
  <script src="test.js"></script>
</body>
</html>
```

- [ ] **Step 8: Create `GAME/test.js` placeholder**

```js
// GAME/test.js — Filled in during Task 2.
document.getElementById('test-results').innerHTML =
  '<p>No tests yet — Task 2 will populate this.</p>';
```

- [ ] **Step 9: Verify the scaffolding loads without errors**

Open `C:\Users\nitin\ai-glitch-buster\GAME\test.html` in any modern browser (Chrome, Edge, Firefox).

Expected: page shows the text "No tests yet — Task 2 will populate this." and the browser DevTools console (F12) shows **no errors**.

- [ ] **Step 10: Commit the scaffolding**

```bash
cd "C:/Users/nitin/ai-glitch-buster" && \
git add GAME/state.js GAME/glitch-guardians.js GAME/glitch-guardians.css \
        GAME/screens/onboarding.js GAME/screens/map.js GAME/screens/island-intro.js \
        GAME/test.html GAME/test.js && \
git commit -m "Add Glitch Guardians scaffolding (empty modules + test harness)"
```

---

## Task 2: Build `state.js` with TDD (7 tests)

Write the test suite first, watch it fail, then implement `state.js` to pass every test.

**Files:**
- Modify: `GAME/state.js`
- Modify: `GAME/test.js`

- [ ] **Step 1: Write the tests in `GAME/test.js`**

Replace the placeholder content with:

```js
// GAME/test.js — In-browser test runner for state.js
(function() {
  var results = [];

  function test(name, fn) {
    try {
      GG.state.reset();
      fn();
      results.push({ name: name, pass: true });
    } catch (e) {
      results.push({ name: name, pass: false, error: e.message });
    }
  }

  function assertEq(actual, expected, msg) {
    var a = JSON.stringify(actual);
    var e = JSON.stringify(expected);
    if (a !== e) {
      throw new Error((msg || 'assertEq') + ': expected ' + e + ', got ' + a);
    }
  }
  function assertTrue(cond, msg)  { if (!cond) throw new Error(msg || 'expected truthy'); }
  function assertFalse(cond, msg) { if (cond) throw new Error(msg || 'expected falsy'); }
  function assertNull(val, msg)   { if (val !== null) throw new Error((msg || 'assertNull') + ': got ' + JSON.stringify(val)); }

  test('load() returns null on fresh storage', function() {
    assertNull(GG.state.load());
  });

  test('save() then load() round-trips a profile', function() {
    var p = GG.state.newProfile('Mishika', 'guardian');
    var r = GG.state.save(p);
    assertTrue(r.ok, 'save should succeed');
    var loaded = GG.state.load();
    assertEq(loaded.name, 'Mishika');
    assertEq(loaded.gradeBand, 'guardian');
    assertEq(loaded.progress['bias-breaker'].unlocked, true);
  });

  test('load() returns null on corrupted JSON', function() {
    localStorage.setItem('gg.profile', 'not-valid-json-{');
    assertNull(GG.state.load());
  });

  test('load() returns null on missing fields', function() {
    localStorage.setItem('gg.profile', JSON.stringify({ name: 'X' })); // missing gradeBand, progress
    assertNull(GG.state.load());
  });

  test("isIslandUnlocked('bias-breaker') returns true for a fresh profile", function() {
    GG.state.save(GG.state.newProfile('Mishika', 'guardian'));
    assertTrue(GG.state.isIslandUnlocked('bias-breaker'));
  });

  test("isIslandUnlocked('habit-harbor') returns false for a fresh profile", function() {
    GG.state.save(GG.state.newProfile('Mishika', 'guardian'));
    assertFalse(GG.state.isIslandUnlocked('habit-harbor'));
  });

  test('reset() clears the profile', function() {
    GG.state.save(GG.state.newProfile('Mishika', 'guardian'));
    GG.state.reset();
    assertNull(GG.state.load());
  });

  function render() {
    var html = '<h1>Glitch Guardians — Test Runner</h1>';
    var passed = 0;
    html += '<table>';
    html += '<tr><th>Test</th><th>Status</th></tr>';
    results.forEach(function(r) {
      html += '<tr><td>' + r.name + '</td>';
      if (r.pass) { html += '<td style="color:green;">✅ PASS</td></tr>'; passed++; }
      else        { html += '<td style="color:red;">❌ FAIL — ' + r.error + '</td></tr>'; }
    });
    html += '</table>';
    html += '<p style="font-size:1.2em;margin-top:1em;"><strong>' + passed + ' / ' + results.length + ' passed</strong></p>';
    document.getElementById('test-results').innerHTML = html;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', render);
  } else {
    render();
  }
})();
```

- [ ] **Step 2: Run tests, verify they all FAIL**

Open `GAME/test.html` in browser.

Expected: every row shows `❌ FAIL` — most failures are like `TypeError: GG.state.reset is not a function` or similar, because `state.js` only exposes `GG.state = {}` so far. Summary: `0 / 7 passed`.

- [ ] **Step 3: Implement `state.js`**

Replace `GAME/state.js` contents with:

```js
// GAME/state.js — Player profile + progress + localStorage persistence.
window.GG = window.GG || {};

GG.state = (function() {
  var STORAGE_KEY = 'gg.profile';
  var ISLANDS = ['bias-breaker', 'habit-harbor', 'privacy-vaults', 'reality-tower', 'the-core'];

  function blankProgress() {
    var p = {};
    ISLANDS.forEach(function(id, i) {
      p[id] = { unlocked: i === 0, stars: 0, cleared: false };
    });
    return p;
  }

  function isValidProfile(p) {
    if (!p || typeof p !== 'object') return false;
    if (typeof p.name !== 'string' || p.name.trim().length === 0) return false;
    if (p.gradeBand !== 'explorer' && p.gradeBand !== 'guardian') return false;
    if (!p.progress || typeof p.progress !== 'object') return false;
    if (!p.progress['bias-breaker'] || typeof p.progress['bias-breaker'].unlocked !== 'boolean') return false;
    return true;
  }

  function load() {
    var raw;
    try { raw = localStorage.getItem(STORAGE_KEY); }
    catch (e) { return null; }
    if (!raw) return null;
    var parsed;
    try { parsed = JSON.parse(raw); }
    catch (e) { return null; }
    return isValidProfile(parsed) ? parsed : null;
  }

  function save(profile) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: 'storage-blocked' };
    }
  }

  function reset() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
  }

  function isIslandUnlocked(islandId) {
    var p = load();
    if (!p) return islandId === 'bias-breaker';
    if (!p.progress[islandId]) return false;
    return !!p.progress[islandId].unlocked;
  }

  function newProfile(name, gradeBand) {
    return {
      name: String(name).trim().slice(0, 20),
      gradeBand: gradeBand,
      createdAt: new Date().toISOString(),
      progress: blankProgress()
    };
  }

  return {
    load: load,
    save: save,
    reset: reset,
    isIslandUnlocked: isIslandUnlocked,
    newProfile: newProfile
  };
})();
```

- [ ] **Step 4: Run tests, verify they all PASS**

Reload `GAME/test.html` in browser.

Expected: every row shows `✅ PASS`, summary shows `7 / 7 passed`. Browser console (F12) shows no errors.

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/nitin/ai-glitch-buster" && \
git add GAME/state.js GAME/test.js && \
git commit -m "Add Glitch Guardians state module with 7 tests (TDD)"
```

---

## Task 3: Base CSS + integrate game into `index.html`

Add the game's CSS file and wire the launcher button + container `<div>` + script tags into the existing `index.html`. The launcher won't *do* anything yet (router is built in Task 4) but it will appear and not throw errors.

**Files:**
- Modify: `GAME/glitch-guardians.css`
- Modify: `index.html` (3 small additions: launcher button in header, `<div id="gg-root">`, and the script/link tags at the bottom)

- [ ] **Step 1: Write all the base CSS in `GAME/glitch-guardians.css`**

Replace contents with:

```css
/* Glitch Guardians — Phase 1 styles. Every class prefixed .gg-. */

#gg-root {
  font-family: 'Comic Sans MS', 'Chalkboard SE', 'Arial Rounded MT Bold', sans-serif;
  position: fixed;
  inset: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  overflow-y: auto;
  padding: 20px;
  color: #2d2d2d;
}

#gg-root[hidden] { display: none !important; }

.gg-back-to-app {
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 10;
  background: white;
  color: #5b2c87;
  border: none;
  border-radius: 20px;
  padding: 10px 18px;
  font-family: inherit;
  font-size: 14px;
  font-weight: bold;
  cursor: pointer;
  min-width: 44px;
  min-height: 44px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}
.gg-back-to-app:hover { background: #f0f0f0; }

.gg-screen { max-width: 1000px; margin: 60px auto 20px auto; }

.gg-card {
  background: white;
  border-radius: 24px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
  margin-bottom: 20px;
}

.gg-title    { font-size: 2.4em; margin-bottom: 12px; color: #5b2c87; }
.gg-subtitle { font-size: 1.2em; margin-bottom: 24px; color: #666; }
.gg-label    { display: block; font-weight: bold; margin-top: 16px; margin-bottom: 8px; color: #444; }
.gg-small    { font-size: 0.85em; color: #666; }

.gg-input {
  width: 100%;
  padding: 12px 18px;
  font-family: inherit;
  font-size: 1.1em;
  border: 2px solid #ddd;
  border-radius: 14px;
  background: #fafafa;
  box-sizing: border-box;
}
.gg-input:focus { outline: none; border-color: #764ba2; background: white; }

.gg-radio-group { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 8px; }

.gg-radio {
  flex: 1 1 220px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  border: 2px solid #ddd;
  border-radius: 14px;
  cursor: pointer;
  background: #fafafa;
  min-height: 44px;
}
.gg-radio:hover { background: #f0f0f0; }
.gg-radio input { width: 18px; height: 18px; }

.gg-button {
  font-family: inherit;
  font-size: 1.1em;
  font-weight: bold;
  padding: 14px 28px;
  border: none;
  border-radius: 18px;
  cursor: pointer;
  min-width: 44px;
  min-height: 44px;
  margin-top: 24px;
  margin-right: 8px;
}
.gg-button.gg-primary {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  box-shadow: 0 6px 16px rgba(245, 87, 108, 0.4);
}
.gg-button.gg-primary:disabled {
  background: #ccc; color: #888; cursor: not-allowed; box-shadow: none;
}
.gg-button.gg-secondary { background: #764ba2; color: white; }
.gg-button:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.05); }

/* Launcher button inside main index.html */
.gg-launch {
  display: inline-block;
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  color: #1a1a2e;
  border: none;
  border-radius: 24px;
  padding: 12px 26px;
  font-family: inherit;
  font-size: 1.05em;
  font-weight: bold;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(67, 233, 123, 0.4);
  margin-top: 12px;
}
.gg-launch:hover { transform: translateY(-2px); filter: brightness(1.05); }

/* Warning banner (storage blocked) */
.gg-warning-banner {
  max-width: 1000px;
  margin: 60px auto 0 auto;
  background: #fff3cd;
  color: #664d03;
  padding: 14px 22px;
  border-radius: 14px;
  border: 1px solid #ffe69c;
  font-size: 0.95em;
}

/* Map */
.gg-map-header { text-align: center; color: white; text-shadow: 1px 1px 3px rgba(0,0,0,0.2); margin-bottom: 20px; }
.gg-map-header h2 { font-size: 2em; }
.gg-map-svg {
  width: 100%;
  max-width: 900px;
  display: block;
  margin: 0 auto;
  background: rgba(255,255,255,0.1);
  border-radius: 28px;
}
.gg-map-path { stroke: #ffd700; stroke-width: 4; stroke-dasharray: 8 6; fill: none; opacity: 0.6; }
.gg-island   { cursor: pointer; transition: transform 0.2s; }
.gg-island:hover { transform: translateY(-3px); }
.gg-island-circle { fill: white; stroke: #5b2c87; stroke-width: 4; }
.gg-island.gg-unlocked .gg-island-circle {
  fill: #43e97b; stroke: #ffd700; stroke-width: 5;
  animation: gg-pulse 2s ease-in-out infinite;
}
.gg-island.gg-locked .gg-island-circle { fill: #888; stroke: #555; }
.gg-island-label {
  fill: white; font-family: inherit; font-size: 14px; font-weight: bold;
  text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
}
@keyframes gg-pulse {
  0%, 100% { filter: drop-shadow(0 0 6px #ffd700); }
  50%      { filter: drop-shadow(0 0 18px #ffd700); }
}
.gg-island.gg-wiggle { animation: gg-wiggle 400ms ease-in-out; }
@keyframes gg-wiggle {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  20% { transform: translateY(0) rotate(-6deg); }
  40% { transform: translateY(0) rotate(5deg); }
  60% { transform: translateY(0) rotate(-4deg); }
  80% { transform: translateY(0) rotate(3deg); }
}
.gg-tooltip {
  position: fixed; top: 30%; left: 50%; transform: translateX(-50%);
  background: rgba(0,0,0,0.85); color: white; padding: 12px 20px;
  border-radius: 14px; font-size: 1em; box-shadow: 0 6px 16px rgba(0,0,0,0.3);
  z-index: 50;
}

/* Island intro */
.gg-island-intro { text-align: center; max-width: 700px; margin: 0 auto; }
.gg-island-intro-icon { font-size: 5em; }
.gg-topic {
  font-size: 1em; color: #764ba2; text-transform: uppercase;
  letter-spacing: 1px; margin-bottom: 18px;
}
.gg-blurb { font-size: 1.15em; line-height: 1.5; color: #444; margin-bottom: 28px; }
.gg-coming-soon {
  background: #fff7e0;
  border: 2px dashed #f5b400;
  border-radius: 18px;
  padding: 20px;
  margin-bottom: 24px;
}
.gg-coming-soon p { margin: 4px 0; }
```

- [ ] **Step 2: Add the launcher button into `index.html` header**

In `index.html`, find the line `<div class="header">` (use Grep tool or browser Find). The header contains the `<h1>` title and a `<div class="badges-container">`. Add a launcher button **right before** the closing `</div>` that ends the `header` div.

Use Edit tool with these strings (find the existing `</div>` that closes the header, just before `<div class="content">`):

OLD (existing code in `index.html`):
```html
        </div>
        
        <div class="content">
```

NEW:
```html
            <button id="gg-launch-button" class="gg-launch" type="button">🎮 Play Glitch Guardians</button>
        </div>
        
        <div class="content">
```

(This places the button inside the header, after the badges-container, before the content area begins. If the existing OLD pattern is not unique, increase the context — include the line above it as well, until it matches uniquely.)

- [ ] **Step 3: Add the game's `<div id="gg-root">` + CSS + JS tags before `</body>`**

In `index.html`, find `</body>`. Add this block **immediately before** the closing `</body>` tag.

Use Edit tool:

OLD (existing code in `index.html`):
```html
</body>
</html>
```

NEW:
```html

    <!-- Glitch Guardians game module -->
    <link rel="stylesheet" href="GAME/glitch-guardians.css">
    <div id="gg-root" hidden></div>
    <script src="GAME/state.js"></script>
    <script src="GAME/screens/onboarding.js"></script>
    <script src="GAME/screens/map.js"></script>
    <script src="GAME/screens/island-intro.js"></script>
    <script src="GAME/glitch-guardians.js"></script>
</body>
</html>
```

- [ ] **Step 4: Verify the main app still looks correct**

Open `index.html` in a browser.

Expected:
- The existing AI Glitch Buster app appears with its normal styling.
- A new green "🎮 Play Glitch Guardians" button is visible in the header area.
- Clicking the button **does nothing visible** (we wired it to a stub `GG.start` that only logs to console). Open DevTools Console — should show `GG.start: not yet implemented`.
- **No errors in the console.**
- The badges-container and other existing UI are unaffected.

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/nitin/ai-glitch-buster" && \
git add GAME/glitch-guardians.css index.html && \
git commit -m "Add Glitch Guardians base CSS and integrate launcher into index.html"
```

---

## Task 4: Build the router with stub screens

Build `glitch-guardians.js` — the file that wires the launcher button to a working screen flow. The screen modules are still stubs from Task 1, so this task proves the **routing skeleton** works without depending on the real screens.

**Files:**
- Modify: `GAME/glitch-guardians.js`

- [ ] **Step 1: Replace `glitch-guardians.js` contents**

```js
// GAME/glitch-guardians.js — Entry point + screen router.
window.GG = window.GG || {};

// --- Public API ---
GG.start = function() {
  var container = document.querySelector('.container');
  var ggRoot = document.getElementById('gg-root');
  if (!container || !ggRoot) {
    console.warn('Glitch Guardians: missing .container or #gg-root');
    return;
  }
  container.style.display = 'none';
  ggRoot.hidden = false;
  if (!history.state || !history.state.ggOpen) {
    history.pushState({ ggOpen: true }, '', '#game');
  }
  routeFromState();
};

GG.exit = function() {
  // If currently in #game, go back; popstate handler will run doExit().
  if (history.state && history.state.ggOpen) {
    history.back();
  } else {
    doExit();
  }
};

// --- Internal ---
function doExit() {
  var container = document.querySelector('.container');
  var ggRoot = document.getElementById('gg-root');
  if (container) container.style.display = '';
  if (ggRoot) {
    ggRoot.hidden = true;
    ggRoot.innerHTML = '';
  }
}

function routeFromState() {
  var profile = GG.state.load();
  var root = document.getElementById('gg-root');
  root.innerHTML = '';

  // Persistent Back to App button
  var backBtn = document.createElement('button');
  backBtn.className = 'gg-back-to-app';
  backBtn.type = 'button';
  backBtn.textContent = '🏠 Back to App';
  backBtn.addEventListener('click', GG.exit);
  root.appendChild(backBtn);

  // Screen container
  var screenEl = document.createElement('div');
  screenEl.className = 'gg-screen';
  root.appendChild(screenEl);

  if (!profile) {
    GG.screens.onboarding.render(screenEl, function(newProfile) {
      var r = GG.state.save(newProfile);
      if (!r.ok) showSaveBanner(root);
      goToMap(screenEl, newProfile, false);
    });
  } else {
    goToMap(screenEl, profile, true);
  }
}

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

function showSaveBanner(root) {
  if (root.querySelector('.gg-warning-banner')) return; // already shown
  var banner = document.createElement('div');
  banner.className = 'gg-warning-banner';
  banner.textContent = '⚠️ Progress won\'t save (browser storage blocked)';
  // insert after the back-to-app button
  var backBtn = root.querySelector('.gg-back-to-app');
  if (backBtn && backBtn.nextSibling) {
    root.insertBefore(banner, backBtn.nextSibling);
  } else {
    root.appendChild(banner);
  }
}

// Browser back button: if we were in #game and got popped, clean up.
window.addEventListener('popstate', function() {
  var ggRoot = document.getElementById('gg-root');
  if (ggRoot && !ggRoot.hidden) {
    doExit();
  }
});

// Wire launcher button on page load
document.addEventListener('DOMContentLoaded', function() {
  var btn = document.getElementById('gg-launch-button');
  if (btn) btn.addEventListener('click', GG.start);
});
```

- [ ] **Step 2: Manual verify — first-time flow (with stubs)**

1. Open `GAME/test.html` and click the browser's DevTools console. Type `GG.state.reset()` and press Enter. (Wipes any leftover profile.)
2. Open `index.html` in a fresh tab.
3. Click "🎮 Play Glitch Guardians".

Expected:
- Main app disappears, replaced by a purple gradient background.
- "🏠 Back to App" button visible in the top-left.
- Stub text appears: `Stub: Onboarding screen (Task 5 will replace this)`.
- URL now ends in `#game`.

- [ ] **Step 3: Manual verify — exit via Back to App button**

Click "🏠 Back to App".

Expected:
- Main app reappears looking exactly as before.
- URL no longer has `#game`.
- No console errors.

- [ ] **Step 4: Manual verify — browser back button**

1. Click "🎮 Play Glitch Guardians" again.
2. Press the browser's back arrow.

Expected: returns to main app cleanly (same effect as clicking the Back to App button).

- [ ] **Step 5: Manual verify — returning-player flow**

1. In DevTools console, type: `GG.state.save(GG.state.newProfile('Mishika', 'guardian'))` and press Enter. (Creates a profile manually.)
2. Reload the page.
3. Click "🎮 Play Glitch Guardians".

Expected: skips onboarding stub, shows stub map text: `Stub: Map screen for Mishika (Task 6 will replace this)` plus a "Pretend-click Bias Breaker" button.

- [ ] **Step 6: Manual verify — stub map → stub island intro → back**

1. Click "Pretend-click Bias Breaker".

Expected: stub text changes to `Stub: Island intro for bias-breaker (Task 7 will replace this)` plus a "← Back to Map" button.

2. Click "← Back to Map".

Expected: stub map text reappears.

- [ ] **Step 7: Commit**

```bash
cd "C:/Users/nitin/ai-glitch-buster" && \
git add GAME/glitch-guardians.js && \
git commit -m "Add Glitch Guardians router with screen flow and back-button handling"
```

---

## Task 5: Implement onboarding screen

Replace the stub onboarding with a real name + grade picker.

**Files:**
- Modify: `GAME/screens/onboarding.js`

- [ ] **Step 1: Replace `screens/onboarding.js` contents**

```js
// GAME/screens/onboarding.js — First-time player setup.
window.GG = window.GG || {};
GG.screens = GG.screens || {};

GG.screens.onboarding = {
  render: function(rootEl, onComplete) {
    rootEl.innerHTML = '';

    var card = document.createElement('div');
    card.className = 'gg-card gg-onboarding';
    card.innerHTML =
      '<h1 class="gg-title">Welcome to Glitch Guardians!</h1>' +
      '<p class="gg-subtitle">The city of Datapolis needs your help to defeat the virus called Glitch.</p>' +
      '<label class="gg-label" for="gg-name-input">What\'s your name?</label>' +
      '<input id="gg-name-input" class="gg-input" type="text" maxlength="20" placeholder="Type your name…" autocomplete="off">' +
      '<p class="gg-label">Pick your level:</p>' +
      '<div class="gg-radio-group">' +
        '<label class="gg-radio"><input type="radio" name="gg-grade" value="explorer"> <span><strong>Explorer</strong> <span class="gg-small">(K-5)</span></span></label>' +
        '<label class="gg-radio"><input type="radio" name="gg-grade" value="guardian"> <span><strong>Guardian</strong> <span class="gg-small">(6-8)</span></span></label>' +
      '</div>' +
      '<button id="gg-start-btn" class="gg-button gg-primary" type="button" disabled>Start Adventure!</button>';

    rootEl.appendChild(card);

    var nameInput = card.querySelector('#gg-name-input');
    var startBtn  = card.querySelector('#gg-start-btn');
    var gradeInputs = card.querySelectorAll('input[name="gg-grade"]');

    function updateButtonState() {
      var name = nameInput.value.trim();
      var grade = card.querySelector('input[name="gg-grade"]:checked');
      startBtn.disabled = !(name.length >= 1 && grade);
    }

    nameInput.addEventListener('input', updateButtonState);
    Array.prototype.forEach.call(gradeInputs, function(r) {
      r.addEventListener('change', updateButtonState);
    });

    startBtn.addEventListener('click', function() {
      if (startBtn.disabled) return;
      var name = nameInput.value.trim();
      var grade = card.querySelector('input[name="gg-grade"]:checked').value;
      var profile = GG.state.newProfile(name, grade);
      onComplete(profile);
    });

    // Submit on Enter inside name field if button is enabled
    nameInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !startBtn.disabled) {
        e.preventDefault();
        startBtn.click();
      }
    });

    nameInput.focus();
  }
};
```

- [ ] **Step 2: Manual verify**

1. In DevTools console: `GG.state.reset()` then reload `index.html`.
2. Click "🎮 Play Glitch Guardians".

Expected: onboarding card shows with name input, Explorer/Guardian radio buttons, and a greyed-out "Start Adventure!" button.

3. Click Start Adventure → nothing happens (disabled).
4. Type "Mishika" in name field → button still greyed (no grade picked).
5. Pick "Guardian" → button turns colored (active).
6. Click "Start Adventure!".

Expected: stub map appears with text `Stub: Map screen for Mishika (Task 6 will replace this)`.

7. Open DevTools → Application → Local Storage → see `gg.profile` key with JSON.

- [ ] **Step 3: Manual verify — name validation**

1. Reset: `GG.state.reset()`, reload.
2. Click Play → in name field type only spaces (e.g. `"   "`) and pick Guardian.

Expected: button stays disabled (trimmed name is empty).

3. Type a real name → button activates.

- [ ] **Step 4: Manual verify — name truncation**

1. Reset, reload, click Play.
2. Type a 30-character name (e.g. `"AverylongnameMishikaPikachu123"`).

Expected: input only accepts 20 characters (HTML `maxlength="20"`). When saved, profile stores trimmed first 20.

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/nitin/ai-glitch-buster" && \
git add GAME/screens/onboarding.js && \
git commit -m "Implement Glitch Guardians onboarding screen (name + grade band)"
```

---

## Task 6: Implement the Datapolis map screen

Replace the stub map with the real SVG world map showing 5 islands, lock states, paths, and click behavior.

**Files:**
- Modify: `GAME/screens/map.js`

- [ ] **Step 1: Replace `screens/map.js` contents**

```js
// GAME/screens/map.js — Datapolis SVG world map.
window.GG = window.GG || {};
GG.screens = GG.screens || {};

GG.screens.map = (function() {
  var SVG_NS = 'http://www.w3.org/2000/svg';

  var ISLANDS = [
    { id: 'bias-breaker',   name: 'Bias Breaker',   x: 150, y: 150, icon: '⚖️' },
    { id: 'habit-harbor',   name: 'Habit Harbor',   x: 650, y: 150, icon: '🌊' },
    { id: 'privacy-vaults', name: 'Privacy Vaults', x: 150, y: 450, icon: '🔐' },
    { id: 'reality-tower',  name: 'Reality Tower',  x: 650, y: 450, icon: '🗼' },
    { id: 'the-core',       name: 'The Core',       x: 400, y: 300, icon: '💥' }
  ];
  var PATHS = [
    ['bias-breaker', 'the-core'],
    ['habit-harbor', 'the-core'],
    ['privacy-vaults', 'the-core'],
    ['reality-tower', 'the-core']
  ];

  function escapeText(s) {
    return String(s).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function render(rootEl, profile, isReturning, onIslandSelect) {
    rootEl.innerHTML = '';

    var header = document.createElement('div');
    header.className = 'gg-map-header';
    var greeting = isReturning ? 'Welcome back, ' : 'Welcome, ';
    header.innerHTML =
      '<h2>' + greeting + escapeText(profile.name) + '!</h2>' +
      '<p>Datapolis needs you. Pick an island to begin.</p>';
    rootEl.appendChild(header);

    var byId = {};
    ISLANDS.forEach(function(i) { byId[i.id] = i; });

    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 800 600');
    svg.setAttribute('class', 'gg-map-svg');

    // Paths first (drawn beneath islands)
    PATHS.forEach(function(p) {
      var a = byId[p[0]], b = byId[p[1]];
      var line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', a.x); line.setAttribute('y1', a.y);
      line.setAttribute('x2', b.x); line.setAttribute('y2', b.y);
      line.setAttribute('class', 'gg-map-path');
      svg.appendChild(line);
    });

    // Tooltip element (one, reused)
    var tooltip = document.createElement('div');
    tooltip.className = 'gg-tooltip';
    tooltip.hidden = true;
    rootEl.appendChild(tooltip);
    var tooltipTimer = null;

    function showTooltip(islandName) {
      tooltip.textContent = 'Clear Bias Breaker first to unlock ' + islandName + '!';
      tooltip.hidden = false;
      if (tooltipTimer) clearTimeout(tooltipTimer);
      tooltipTimer = setTimeout(function() { tooltip.hidden = true; }, 2500);
    }

    // Islands
    ISLANDS.forEach(function(i) {
      var unlocked = !!(profile.progress[i.id] && profile.progress[i.id].unlocked);
      var g = document.createElementNS(SVG_NS, 'g');
      g.setAttribute('class', 'gg-island ' + (unlocked ? 'gg-unlocked' : 'gg-locked'));
      g.setAttribute('transform', 'translate(' + i.x + ',' + i.y + ')');
      g.setAttribute('tabindex', '0');
      g.setAttribute('role', 'button');
      g.setAttribute('aria-label', i.name + (unlocked ? ', unlocked. Click to enter.' : ', locked.'));

      var c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('r', '60');
      c.setAttribute('class', 'gg-island-circle');
      g.appendChild(c);

      var icon = document.createElementNS(SVG_NS, 'text');
      icon.setAttribute('text-anchor', 'middle');
      icon.setAttribute('dominant-baseline', 'central');
      icon.setAttribute('font-size', '38');
      icon.textContent = unlocked ? i.icon : '🔒';
      g.appendChild(icon);

      var label = document.createElementNS(SVG_NS, 'text');
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('y', '90');
      label.setAttribute('class', 'gg-island-label');
      label.textContent = i.name;
      g.appendChild(label);

      function handleSelect() {
        if (unlocked) {
          onIslandSelect(i.id);
        } else {
          g.classList.remove('gg-wiggle');
          // Force browser to reflow so the animation can be re-triggered
          void g.getBoundingClientRect();
          g.classList.add('gg-wiggle');
          showTooltip(i.name);
        }
      }

      g.addEventListener('click', handleSelect);
      g.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleSelect();
        }
      });

      svg.appendChild(g);
    });

    rootEl.appendChild(svg);
  }

  return { render: render };
})();
```

- [ ] **Step 2: Manual verify — fresh player flow shows map**

1. `GG.state.reset()` in DevTools console.
2. Reload `index.html`, click Play, complete onboarding ("Mishika", Guardian, Start Adventure!).

Expected:
- Map screen appears with "Welcome, Mishika!" header (note: NOT "Welcome back" — that's only for returning players).
- 5 islands visible in SVG: 4 corner islands + The Core in the middle.
- Bias Breaker (top-left) has a green pulsing glow.
- The other 4 islands are grey with a 🔒 lock icon.
- Glowing yellow dashed paths connect each corner island to The Core.

- [ ] **Step 3: Manual verify — click unlocked island**

Click Bias Breaker.

Expected: stub island-intro appears with text `Stub: Island intro for bias-breaker (Task 7 will replace this)`.

- [ ] **Step 4: Manual verify — click locked islands**

Click Back from stub island intro → click any locked island (e.g. Habit Harbor).

Expected:
- Habit Harbor wiggles (rotates back and forth) for ~400ms.
- A dark tooltip appears near the top: "Clear Bias Breaker first to unlock Habit Harbor!".
- Tooltip fades away after ~2.5 seconds.
- Clicking another locked island re-triggers the wiggle.

- [ ] **Step 5: Manual verify — keyboard navigation**

Press Tab to cycle focus through the islands. Press Enter on focused Bias Breaker.

Expected: same behavior as clicking — stub island-intro appears.

- [ ] **Step 6: Manual verify — returning player greeting**

1. With a profile saved, exit to main app (Back to App).
2. Refresh page, click Play again.

Expected: header now says "Welcome back, Mishika!" (with "back").

- [ ] **Step 7: Commit**

```bash
cd "C:/Users/nitin/ai-glitch-buster" && \
git add GAME/screens/map.js && \
git commit -m "Implement Datapolis SVG world map with 5 islands and lock states"
```

---

## Task 7: Implement island intro screen

Replace the stub island-intro with the real story-blurb + Coming Soon UI.

**Files:**
- Modify: `GAME/screens/island-intro.js`

- [ ] **Step 1: Replace `screens/island-intro.js` contents**

```js
// GAME/screens/island-intro.js — Per-island story blurb + Coming Soon.
window.GG = window.GG || {};
GG.screens = GG.screens || {};

GG.screens.islandIntro = (function() {
  var ISLAND_META = {
    'bias-breaker': {
      name: 'Bias Breaker',
      topic: 'Fairness in AI',
      blurb: "The city's game-and-sports AI has gone unfair — it blocks some citizens for no good reason. Race across the rooftops, answer fairness questions, and teach the AI that fair systems treat everyone equally.",
      icon: '⚖️'
    },
    'habit-harbor': {
      name: 'Habit Harbor',
      topic: 'AI Good Habits',
      blurb: 'Glitch infected the helper-bots, and they copied bad behavior. Solve teamwork puzzles in the harbor maze to remind them what kindness, patience, and good instructions actually look like.',
      icon: '🌊'
    },
    'privacy-vaults': {
      name: 'Privacy Vaults',
      topic: 'Privacy & Data',
      blurb: "Drones are leaking the city's passwords, messages, and secret files! Sneak past lasers, shut down the leaks, and learn what to share — and what to keep safe.",
      icon: '🔐'
    },
    'reality-tower': {
      name: 'Reality Tower',
      topic: 'Hallucinations',
      blurb: 'The AI is making things up — maps lead into walls, alerts point the wrong way. Climb the shifting tower and spot the fake information to find the safe path up.',
      icon: '🗼'
    },
    'the-core': {
      name: 'The Core',
      topic: 'Final Showdown',
      blurb: "Heal all four islands to unlock Glitch's lair. The Core combines every challenge into one final test — and a face-off with the virus itself.",
      icon: '💥'
    }
  };

  function escapeText(s) {
    return String(s).replace(/[&<>"']/g, function(c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function render(rootEl, islandId, onBack) {
    var meta = ISLAND_META[islandId];
    if (!meta) {
      rootEl.innerHTML = '<div class="gg-card"><p>Unknown island: ' + escapeText(islandId) + '</p></div>';
      return;
    }

    rootEl.innerHTML = '';
    var card = document.createElement('div');
    card.className = 'gg-card gg-island-intro';
    card.innerHTML =
      '<div class="gg-island-intro-icon">' + meta.icon + '</div>' +
      '<h1 class="gg-title">' + escapeText(meta.name) + '</h1>' +
      '<p class="gg-topic">Topic: ' + escapeText(meta.topic) + '</p>' +
      '<p class="gg-blurb">' + escapeText(meta.blurb) + '</p>' +
      '<div class="gg-coming-soon">' +
        '<p><strong>🚧 Coming Soon!</strong></p>' +
        '<p class="gg-small">Real gameplay is being built. For now, you can explore the map and see what awaits.</p>' +
      '</div>' +
      '<button class="gg-button gg-secondary" id="gg-back-to-map" type="button">← Back to Map</button>';

    rootEl.appendChild(card);

    card.querySelector('#gg-back-to-map').addEventListener('click', onBack);
  }

  return { render: render };
})();
```

- [ ] **Step 2: Manual verify**

1. Reload `index.html`, click Play, complete onboarding if needed, then click Bias Breaker on the map.

Expected:
- White card centered on the screen.
- Big ⚖️ icon at top.
- Title "Bias Breaker".
- "Topic: FAIRNESS IN AI" (small purple uppercase).
- Long blurb about parkour and the unfair AI.
- Dashed yellow "🚧 Coming Soon!" callout box.
- Purple "← Back to Map" button.

2. Click "← Back to Map".

Expected: map screen reappears (with "Welcome back, Mishika!" since we have a profile).

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/nitin/ai-glitch-buster" && \
git add GAME/screens/island-intro.js && \
git commit -m "Implement island intro screen with story blurbs for all 5 islands"
```

---

## Task 8: Edge-case verification (no new code expected)

Verify the edge cases from the spec (§6) actually work, and confirm the main app is visually unchanged after a game round-trip.

**Files:** No code changes expected. This task is verification + small fixes if anything is broken.

- [ ] **Step 1: Verify storage-blocked banner**

1. Open DevTools → Application → Storage → Clear site data → reload (to start fresh).
2. In DevTools console, monkey-patch storage to simulate failure BEFORE clicking Play:

```js
var origSet = Storage.prototype.setItem;
Storage.prototype.setItem = function() { throw new Error('Quota exceeded (simulated)'); };
```

3. Click Play, complete onboarding ("Test", Explorer, Start Adventure!).

Expected:
- Map screen still appears (game keeps working in-memory).
- A yellow banner shows above the map header: "⚠️ Progress won't save (browser storage blocked)".

4. Restore localStorage: `Storage.prototype.setItem = origSet;`

- [ ] **Step 2: Verify corrupted-profile recovery**

1. In DevTools console: `localStorage.setItem('gg.profile', 'not-valid-json{')`.
2. Reload, click Play.

Expected: onboarding screen appears (corrupted profile was ignored, treated as new player). No console errors.

3. Complete onboarding — verify normal flow continues.

- [ ] **Step 3: Verify CSS isolation (main app looks identical)**

1. Open `index.html` in a fresh tab. Take a screenshot or note the visual state (header colors, font, badges, content area).
2. Click Play, navigate around (onboarding → map → island-intro → back to map).
3. Click Back to App.
4. Compare to step 1.

Expected: pixel-identical (or as close as possible) to the original main app. Comic Sans font, purple/pink header gradient, badge styling, content layout — all unchanged.

- [ ] **Step 4: Verify tablet/mobile layout**

1. Open DevTools → Toggle Device Toolbar → choose "iPad" or "iPad Mini".
2. Reload, click Play, walk through the full flow.

Expected:
- Map SVG scales to fit width, all 5 islands visible.
- Buttons are large enough to tap.
- Touch on locked island wiggles + shows tooltip.

- [ ] **Step 5: Verify console is clean**

Open DevTools console while doing a full play-through: launch → onboard → map → island intro → back to map → back to app → re-enter.

Expected: **zero red errors**, no warnings about uncaught promises or undefined references.

- [ ] **Step 6: If any verification step above fails, fix the bug, then re-run the affected step. Commit only if you made fixes.**

```bash
cd "C:/Users/nitin/ai-glitch-buster" && \
git status   # check whether any files changed
# Only if there are changes:
git add . && \
git commit -m "Fix Glitch Guardians shell issues found during polish verification"
```

If no fixes were needed, this task ends with no commit — the existing tests still passing is the verification.

---

## Task 9: Write `PLAYTEST.md` + final QA pass

Document the manual playtest checklist as a Markdown file teammates can use. Run through it one final time.

**Files:**
- Create: `GAME/PLAYTEST.md`

- [ ] **Step 1: Create `GAME/PLAYTEST.md`**

```markdown
# Glitch Guardians — Phase 1 Playtest Checklist

> Run through this checklist on every change to `GAME/` to verify the shell still works.

## Setup
- [ ] Open `GAME/test.html` in a browser → 7 / 7 automated tests pass (all green ✅).
- [ ] In DevTools console: `GG.state.reset()` to wipe any saved profile.

## First-Time Player Flow
- [ ] Open `index.html` in a fresh tab.
- [ ] Main AI Glitch Buster app appears with its usual bright/friendly styling.
- [ ] A "🎮 Play Glitch Guardians" button is visible in the header.
- [ ] Click the launcher button.
- [ ] Main app disappears, replaced by purple gradient game screen.
- [ ] "🏠 Back to App" button is visible in the top-left.
- [ ] Onboarding card appears: name input + Explorer/Guardian radio buttons + greyed-out "Start Adventure!" button.
- [ ] Type only spaces in the name → button stays greyed out.
- [ ] Type "Mishika" → button still greyed (no grade picked).
- [ ] Pick Guardian (6-8) → button turns colorful (active).
- [ ] Click "Start Adventure!".
- [ ] Map screen appears: header says "Welcome, Mishika!" (no "back").
- [ ] 5 islands visible: 4 corners + The Core in middle.
- [ ] Bias Breaker (top-left) pulses with a green glow.
- [ ] The other 4 islands are grey with 🔒 icons.
- [ ] Glowing yellow dashed paths connect each corner island to The Core.
- [ ] Click a locked island (e.g. Habit Harbor) → it wiggles + tooltip appears: "Clear Bias Breaker first to unlock Habit Harbor!" → tooltip auto-dismisses ~2.5s later.
- [ ] Click Bias Breaker → island intro card appears.
- [ ] Intro card shows: big ⚖️ icon, "Bias Breaker" title, "Topic: FAIRNESS IN AI", a blurb, "🚧 Coming Soon!" callout, "← Back to Map" button.
- [ ] Click "← Back to Map" → map reappears.
- [ ] Click "🏠 Back to App" → main app reappears, looking pixel-identical to before.

## Returning Player Flow
- [ ] Reload the page (F5).
- [ ] Main app appears normally.
- [ ] Click "🎮 Play Glitch Guardians".
- [ ] Onboarding is **skipped** — map appears directly.
- [ ] Map header now says "Welcome **back**, Mishika!".
- [ ] All other map behaviors still work.

## Browser Back Button
- [ ] Click Play → in game → press browser's back arrow.
- [ ] Returns to main app cleanly (same effect as Back to App button).
- [ ] URL no longer has `#game` hash.

## Storage Edge Cases
- [ ] In DevTools console: `localStorage.setItem('gg.profile', 'not-valid-json{')` → reload → click Play → onboarding appears (corrupted save was ignored).
- [ ] In DevTools: `GG.state.reset(); Storage.prototype.setItem = function() { throw new Error('test'); };` → click Play → onboard → map appears AND yellow banner shows "⚠️ Progress won't save".

## Mobile / Tablet
- [ ] DevTools → Device Toolbar → iPad.
- [ ] Reload, do full play-through.
- [ ] Map SVG scales, all 5 islands visible.
- [ ] Buttons are tappable (large enough for fingers).

## DevTools Inspection
- [ ] After completing onboarding, DevTools → Application → Local Storage shows key `gg.profile` with JSON containing name, gradeBand, createdAt, progress for all 5 islands.

## Console Cleanliness
- [ ] Throughout the entire play-through, DevTools console shows **zero red errors** and no uncaught warnings.

## Hidden Developer Reset
- [ ] In DevTools console, run `GG.state.reset()` → reload → click Play → onboarding appears again (treated as new player).

---

If every box is checked, Phase 1 is **DONE** — ready to move to Phase 2 (real Bias Breaker platformer gameplay).
```

- [ ] **Step 2: Run through the entire `PLAYTEST.md` checklist one final time**

Methodically check every box. If any fail, return to the relevant task to fix.

- [ ] **Step 3: Commit `PLAYTEST.md`**

```bash
cd "C:/Users/nitin/ai-glitch-buster" && \
git add GAME/PLAYTEST.md && \
git commit -m "Add Glitch Guardians Phase 1 manual playtest checklist"
```

- [ ] **Step 4: Final tag (optional but recommended)**

```bash
cd "C:/Users/nitin/ai-glitch-buster" && \
git tag -a "gg-phase1-shell" -m "Glitch Guardians Phase 1: game shell complete (onboarding + map + island intro stub)"
```

This creates a named save point. If you ever need to go back to "before we started Phase 2 gameplay," you can `git checkout gg-phase1-shell`.

---

## Done

When all 9 tasks are complete:

- Phase 1 success criteria (from spec §9) are all met
- 7/7 automated tests pass
- Manual playtest checklist passes 100%
- Existing AI Glitch Buster app is visually unchanged after a game round-trip
- The repo has 9 clean, atomic commits — one per task — making it easy for teammates to review

**Next:** brainstorm Phase 2 (real Bias Breaker platformer gameplay) via `superpowers:brainstorming`, then write its plan via `superpowers:writing-plans`.
