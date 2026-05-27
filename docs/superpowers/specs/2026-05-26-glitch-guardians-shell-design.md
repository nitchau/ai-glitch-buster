# Glitch Guardians — Shell Design (Phase 1)

**Project:** Glitch Guardians (game module inside AI Glitch Buster app)
**Phase:** 1 of N — "Walking Skeleton" / Game Shell
**Date:** 2026-05-26
**Authors:** Mishika & team (AI Glitch Busters), Nitin, Claude
**Status:** Approved by user — ready for implementation planning

---

## 1. Purpose

Build the **smallest end-to-end playable shell** for the *Glitch Guardians* educational game, integrated into the existing `AI Glitch Buster` web app. The shell has no real gameplay yet — its job is to prove the integration between the existing app and a future game module works, and to establish the file structure and player-progress data model that future phases will fill in.

Phase 1 is intentionally narrow: a player launches the game from the main app, enters their name and grade band, sees a map of Datapolis with 5 islands (4 locked, Bias Breaker unlocked), can click Bias Breaker to see a "Coming Soon" island intro, and can return to the main app at any time with their progress saved.

This is the foundation for Phase 2 (real Bias Breaker platformer gameplay) and beyond.

## 2. Scope

### In scope for Phase 1
- A **"🎮 Play Glitch Guardians"** button added to the existing `index.html` main app.
- A **full-screen takeover** experience inside the same `index.html` (no page navigation, no iframes).
- **Onboarding screen** for first-time players: name input + grade band selector (Explorer K-5 / Guardian 6-8).
- **Datapolis world map**: SVG-based, 4 sub-islands in the corners + The Core in the middle. Bias Breaker glows (unlocked); the others show chain icons (locked). Clicking a locked island wiggles it and shows a helpful tooltip.
- **Island intro screen** for Bias Breaker: short story blurb + "Coming Soon" message + back button.
- **Player profile persistence** to `localStorage` (single profile per device).
- **Returning-player flow:** if a profile exists, onboarding is skipped.
- **Back to App** button always visible inside the game; cleanly returns to the existing main app.
- **Browser back button** handled gracefully via `history.pushState`.
- **Tiny in-browser test runner** at `GAME/test.html` covering the `state.js` module.
- **Manual playtest checklist** at `GAME/PLAYTEST.md`.
- Hidden developer reset via `GG.state.reset()` in DevTools console.
- Mobile-friendly touch targets (min 44×44 px) and an SVG map that scales to any screen.
- Graceful degradation when localStorage is unavailable (banner: "Progress won't save").

### Out of scope for Phase 1
- All actual gameplay (platformer, maze, stealth, climbing, escape room, final boss).
- The two AI models (Quiz Engine + Guardian Watch) and any question generation/validation.
- Avatar picker (square or 3D), cosmetics, badges, certificates, power-ups.
- Multiplayer, class codes, leaderboards.
- Infection system, reform-or-defeat choice, seasonal events.
- Multiple profiles per device (single profile only).
- Sound effects and music.
- Internationalization.
- Backend/server, accounts, login.

These belong to later phases and will each get their own design doc.

## 3. Architecture (Approved: Option A — Modular files)

```
ai-glitch-buster/
├── index.html                ← existing app, gets a small <script>/<link> additions and a launcher button
├── GAME/
│   ├── glitch-guardians.css       ← all game styles (every class prefixed with .gg-)
│   ├── glitch-guardians.js        ← entry point + screen router (THE only file with screen-flow logic)
│   ├── state.js                   ← player profile + progress, localStorage save/load
│   ├── screens/
│   │   ├── onboarding.js          ← name + grade band picker
│   │   ├── map.js                 ← Datapolis SVG world map
│   │   └── island-intro.js        ← per-island "Coming Soon" intro screen
│   ├── assets/                    ← (reserved for future: icons, sounds, images)
│   ├── test.html                  ← in-browser test runner
│   ├── test.js                    ← assertions for state.js
│   └── PLAYTEST.md                ← manual playtest checklist
└── docs/superpowers/specs/2026-05-26-glitch-guardians-shell-design.md ← this file
```

**Integration with existing `index.html`:**
- Add a `🎮 Play Glitch Guardians` button inside the existing **header** area (near the `badges-container` block), styled as a prominent rounded action button. It should be `<button id="gg-launch-button" class="gg-launch">🎮 Play Glitch Guardians</button>`.
- Near the bottom of `index.html` (just before `</body>`), add:
  ```html
  <link rel="stylesheet" href="GAME/glitch-guardians.css">
  <div id="gg-root" hidden></div>
  <script src="GAME/state.js"></script>
  <script src="GAME/screens/onboarding.js"></script>
  <script src="GAME/screens/map.js"></script>
  <script src="GAME/screens/island-intro.js"></script>
  <script src="GAME/glitch-guardians.js"></script>
  ```
- `glitch-guardians.js` wires the launcher button via `addEventListener` (not inline `onclick`) on `DOMContentLoaded`, so the integration uses standard event delegation:
  ```js
  document.addEventListener('DOMContentLoaded', function() {
    var btn = document.getElementById('gg-launch-button');
    if (btn) btn.addEventListener('click', GG.start);
  });
  ```
- `GG.start()` hides `<div class="container">` (existing main app) and reveals `#gg-root`.
- `GG.exit()` does the reverse and clears `#gg-root.innerHTML` to prevent memory leaks.
- The persistent **"🏠 Back to App"** button lives in the **top-left** of `#gg-root` (fixed/sticky positioning), visible on every game screen.

**Visual style:** bright/friendly (matching existing app's Comic Sans + gradient aesthetic) for Phase 1's onboarding, map, and island-intro screens. Neon-cyber styles are reserved for actual gameplay screens in Phase 2+.

**Namespacing:** every game style class is prefixed `gg-` (e.g., `.gg-button`, `.gg-map-svg`, `.gg-island-locked`). The game uses one global JS object: `window.GG`, with submodules `GG.state`, `GG.screens.*`, `GG.start`, `GG.exit`.

**No build step.** Plain HTML/CSS/JS files. A kid can `git clone` the repo and double-click `index.html` to play.

## 4. Components

### `GAME/state.js`

**Responsibility:** the single source of truth for player profile + progress. Encapsulates `localStorage`.

**Public interface:**
- `GG.state.load()` → returns the profile object, or `null` if no valid profile exists.
- `GG.state.save(profile)` → returns `{ ok: true }` on success, `{ ok: false, reason: 'storage-blocked' }` if localStorage fails.
- `GG.state.reset()` → wipes the profile (developer escape hatch via DevTools console).
- `GG.state.isIslandUnlocked(islandId)` → boolean.

**Profile shape (one localStorage key: `gg.profile`):**
```js
{
  name: "Mishika",          // 1-20 chars, trimmed
  gradeBand: "guardian",    // "explorer" | "guardian"
  createdAt: "2026-05-26T...",
  progress: {
    "bias-breaker":   { unlocked: true,  stars: 0, cleared: false },
    "habit-harbor":   { unlocked: false, stars: 0, cleared: false },
    "privacy-vaults": { unlocked: false, stars: 0, cleared: false },
    "reality-tower":  { unlocked: false, stars: 0, cleared: false },
    "the-core":       { unlocked: false, stars: 0, cleared: false }
  }
}
```

**Validation on load:** `load()` checks that `name` is a non-empty string, `gradeBand` is one of the two allowed values, and `progress["bias-breaker"].unlocked` exists. If any check fails, `load()` returns `null` (the saved data is treated as corrupted and overwritten when the player goes through onboarding again).

**Dependencies:** none.

### `GAME/screens/onboarding.js`

**Responsibility:** first-time player setup. Renders the name input + grade band selector. On valid submit, builds a profile and saves it via `state.js`, then signals the router.

**Public interface:**
- `GG.screens.onboarding.render(rootEl, onComplete)` — renders into `rootEl`. Calls `onComplete(profile)` once the player clicks "Start Adventure!".

**Validation:**
- "Start Adventure!" button disabled until `name.trim().length >= 1` AND a grade band is selected.
- Name is capped at 20 characters (longer input is truncated with a visual hint).

**Dependencies:** `state.js`.

### `GAME/screens/map.js`

**Responsibility:** render the Datapolis SVG world map. Show 5 islands with correct lock state from the passed profile. Handle clicks on unlocked islands by calling back; show wiggle + tooltip on locked-island clicks.

**Public interface:**
- `GG.screens.map.render(rootEl, profile, onIslandSelect)` — renders into `rootEl`. Calls `onIslandSelect(islandId)` only when an unlocked island is clicked.

**Visual layout:** SVG with `viewBox="0 0 800 600"`. Bias Breaker top-left, Habit Harbor top-right, Privacy Vaults bottom-left, Reality Tower bottom-right, The Core in the center. Glowing dotted SVG paths connect islands. Bias Breaker has a CSS pulse animation; locked islands display a chain icon overlay and use a desaturated palette.

**Locked-island feedback:** 400ms CSS shake animation + speech-bubble tooltip ("Clear Bias Breaker first to unlock!"). No alert popups.

**Dependencies:** `state.js` (read-only).

### `GAME/screens/island-intro.js`

**Responsibility:** show a per-island story blurb + "Coming Soon" placeholder. Owns a small metadata table for each island (name, topic, blurb).

**Public interface:**
- `GG.screens.islandIntro.render(rootEl, islandId, onBack)` — renders into `rootEl`. Calls `onBack()` when the player clicks "← Back to Map".

**Island metadata (kept inside this file). Real blurbs (subject to copy review):**
```js
const ISLAND_META = {
  "bias-breaker": {
    name: "Bias Breaker",
    topic: "Fairness in AI",
    blurb: "The city's game-and-sports AI has gone unfair — it blocks some citizens for no good reason. Race across the rooftops, answer fairness questions, and teach the AI that fair systems treat everyone equally.",
    icon: "⚖️"
  },
  "habit-harbor": {
    name: "Habit Harbor",
    topic: "AI Good Habits",
    blurb: "Glitch infected the helper-bots, and they copied bad behavior. Solve teamwork puzzles in the harbor maze to remind them what kindness, patience, and good instructions actually look like.",
    icon: "🌊"
  },
  "privacy-vaults": {
    name: "Privacy Vaults",
    topic: "Privacy & Data",
    blurb: "Drones are leaking the city's passwords, messages, and secret files! Sneak past lasers, shut down the leaks, and learn what to share — and what to keep safe.",
    icon: "🔐"
  },
  "reality-tower": {
    name: "Reality Tower",
    topic: "Hallucinations",
    blurb: "The AI is making things up — maps lead into walls, alerts point the wrong way. Climb the shifting tower and spot the fake information to find the safe path up.",
    icon: "🗼"
  },
  "the-core": {
    name: "The Core",
    topic: "Final Showdown",
    blurb: "Heal all four islands to unlock Glitch's lair. The Core combines every challenge into one final test — and a face-off with the virus itself.",
    icon: "💥"
  }
}
```

For locked islands, the island-intro screen is **not reachable** in Phase 1 (the map only fires `onIslandSelect` for unlocked islands). The metadata still lives in `island-intro.js` so it's ready for Phase 2+, where locked islands may show a teaser blurb on click.

**Dependencies:** none.

### `GAME/glitch-guardians.js` (the router / entry point)

**Responsibility:** the *only* file that knows the full screen flow. Owns the launcher integration with the main app.

**Public interface:**
- `GG.start()` — called by the "🎮 Play Glitch Guardians" button. Hides main app, reveals `#gg-root`, pushes a `#game` history state, decides initial screen.
- `GG.exit()` — hides `#gg-root`, clears its innerHTML, restores main app visibility, pops the `#game` history state.

**Initial-screen decision:**
- `state.load()` returns `null` → render onboarding. On its `onComplete`, save profile, then render map.
- `state.load()` returns a profile → render map directly.
- From map, on `onIslandSelect(islandId)`, render island-intro for that island.
- From island-intro, on `onBack`, render map again.

**Back-button handling:** on `GG.start()`, call `history.pushState({ ggOpen: true }, '', '#game')`. Add a `popstate` listener: if `event.state?.ggOpen` is being popped (i.e., user is leaving the `#game` state), call `GG.exit()`.

**Dependencies:** `state.js`, `screens/onboarding.js`, `screens/map.js`, `screens/island-intro.js`.

### `GAME/glitch-guardians.css`

**Responsibility:** all visuals for Phase 1.

**Conventions:**
- Every class is prefixed `gg-`.
- Every rule that depends on inheritance (font-family, color, font-size) sets it explicitly on `#gg-root` and key children — never relies on inheriting from the main app's body.
- Buttons and tappable elements use `min-width: 44px; min-height: 44px;` (Apple touch-target guideline).
- Bright/friendly aesthetic for Phase 1; neon-cyber palette deferred to Phase 2.

**No JS dependencies.**

## 5. Data Flow

### First-time player
1. `index.html` loads → user clicks "🎮 Play Glitch Guardians".
2. `GG.start()` → hide main app, show `#gg-root`, push history state.
3. `state.load()` returns `null`.
4. Router renders `onboarding`. User types name, picks grade, clicks Start Adventure!
5. `onboarding.onComplete(profile)` fires. Router calls `state.save(profile)`.
6. If `save` returns `{ ok: false }`, router shows a "Progress won't save" banner above the map but proceeds anyway.
7. Router renders `map`.
8. User clicks Bias Breaker → `map.onIslandSelect("bias-breaker")` fires.
9. Router renders `island-intro` for `"bias-breaker"`.
10. User clicks "← Back to Map" → `island-intro.onBack` fires → router re-renders map.

### Returning player
1. Click Play → `GG.start()` → `state.load()` returns profile → router renders map directly.
2. Map header greets: "Welcome back, Mishika!".

### Exit
1. User clicks "🏠 Back to App" OR presses browser back button.
2. `GG.exit()` → hide `#gg-root`, clear its innerHTML, show main app.
3. Profile remains in localStorage; next entry will skip onboarding.

### State changes (Phase 1)
- The only mutation is **profile creation during onboarding**.
- All `progress[*]` fields are initialized once and not touched in Phase 1.
- The data shape *anticipates* future mutations (`stars`, `cleared`, `unlocked` per island) so Phase 2+ won't require a localStorage schema migration.

## 6. Error Handling & Edge Cases

| # | Trigger | Handling |
|---|---|---|
| 1 | localStorage disabled or full | `save()` catches and returns `{ ok: false, reason: 'storage-blocked' }`. Game continues in-memory; map shows a banner: "⚠️ Progress won't save (browser storage blocked)". |
| 2 | Corrupted profile in localStorage | `load()` validates required fields; treats invalid data as null → routes to onboarding; onboarding overwrites the corrupted save. No crashes. |
| 3 | Empty / whitespace-only name | "Start Adventure!" button stays disabled until `name.trim().length >= 1` AND grade band selected. Name capped at 20 chars. |
| 4 | Click on locked island | 400ms CSS shake animation + speech-bubble tooltip ("Clear Bias Breaker first to unlock!"). No alerts. |
| 5 | Browser back button inside game | `pushState`/`popstate` integration ensures back returns to main app, not out of `index.html`. URL gets `#game` hash while playing. |
| 6 | Mobile / touch | SVG map auto-scales via `viewBox`. All buttons ≥ 44×44 px. No hover-only interactions. |
| 7 | CSS bleeding into / out of game | All game classes prefixed `gg-`. All inherited properties set explicitly on `#gg-root`. Verified by manual playtest: main app should look identical after entering and exiting the game. |
| 8 | Two players on one device | Out of Phase 1 scope. Single profile per device. Note for future: could become `gg.profiles[]`. |

## 7. Testing

### Automated — `GAME/test.html` + `GAME/test.js`

A minimal in-browser runner (~40 lines) that loads `state.js` and asserts:
1. `load()` returns `null` on fresh storage.
2. `save(profile)` then `load()` round-trips the profile correctly.
3. `load()` returns `null` when localStorage contains invalid JSON.
4. `load()` returns `null` when profile is missing required fields.
5. `isIslandUnlocked("bias-breaker")` returns `true` for a fresh profile.
6. `isIslandUnlocked("habit-harbor")` returns `false` for a fresh profile.
7. `reset()` clears the profile (subsequent `load()` returns `null`).

Run by opening `GAME/test.html` in any browser. Output is a list of ✅/❌ per test plus a summary count.

### Manual — `GAME/PLAYTEST.md`

A printable checklist. Highlights:
- Open `index.html`, click Play, complete onboarding → see map → click Bias Breaker → see intro → back to map → back to app.
- Reload page → click Play → onboarding is skipped.
- Click a locked island → wiggles + tooltip.
- Browser back button → exits game cleanly.
- DevTools → Application → Local Storage → `gg.profile` present.
- DevTools device toolbar → iPad → map is tappable and scales correctly.
- After exiting the game, the main app looks identical to before.

### Developer escape hatch
`GG.state.reset()` callable from DevTools console for development resets.

### Not in Phase 1
Playwright/Selenium browser-driving, screenshot diffs, performance/load testing.

## 8. Risks & Open Questions

| Risk | Mitigation |
|---|---|
| Adding new HTML/CSS/JS files breaks the existing 145KB `index.html` somehow. | Game is fully isolated under `GAME/` + `#gg-root`. Manual playtest explicitly verifies main app is unchanged after each round-trip. |
| Comic Sans (existing app) vs. a more game-like font might feel inconsistent. | Stick with Comic Sans / friendly fonts for Phase 1 menus; switch to neon-cyber styling only inside gameplay screens (Phase 2+). |
| The "Coming Soon" island intro could feel anticlimactic for a competition demo. | The intro screen still tells the island's story and looks polished. It's a meaningful preview, not a dead-end. |
| Single-profile-per-device might surprise siblings sharing a device. | Documented as a known Phase 1 limitation. Phase 5+ can introduce a profile picker if needed. |

**Open questions (to resolve during implementation):**
1. Color palette for the Datapolis SVG — should match existing app's purple/pink gradient family, or use a slightly cooler blue for a "digital city" feel. Default: stay close to the existing palette (purple → blue gradient) for visual continuity with the main app.
2. Whether to reuse the existing app's earned-badge system to award a small "Game Joined" badge on first onboarding (low-effort polish, but adds a cross-link between main app and game).
3. Whether to expose a fifth "View Story Recap" button on the map for kids who want to re-read the Datapolis story (deferred unless requested during playtest).

These will be decided during the implementation step or during playtest review when we can see the shell working live.

## 9. Success Criteria for Phase 1

Phase 1 is **done** when all of the following are true:

1. A fresh user opens `index.html`, completes onboarding, sees the Datapolis map with Bias Breaker glowing, clicks it, reads the intro, returns to the map, and exits to the main app — **without seeing a single console error**.
2. All 7 automated tests in `GAME/test.html` pass.
3. The manual playtest checklist in `GAME/PLAYTEST.md` passes 100%.
4. The existing AI Glitch Buster app behaves **identically** before and after the game integration is added (visual + functional inspection).
5. A returning user (after page reload) skips onboarding and goes straight to the map.
6. The game works on a desktop browser AND on a tablet-sized viewport (verified via DevTools device emulation).
7. Code is organized exactly as described in Section 3 (no inline scripts in `index.html` beyond the launcher button's handler and the script/link tags).

## 10. What Phase 2 Will Build (preview, NOT in this spec)

Phase 2 replaces the Bias Breaker "Coming Soon" intro with actual platformer gameplay:
- WASD/arrow-key movement, space to jump, colored square avatar.
- 3–5 hand-authored bias/fairness questions (no AI yet).
- "Answer correctly to make the next platform appear" loop.
- Section restart on fall.
- Marks the island cleared on success → unlocks Habit Harbor in `state.js`.

Phase 3 introduces the AI Quiz Engine (Model A).
Phase 4 introduces Guardian Watch (Model B).
Phase 5+ adds the remaining islands, avatar customization, badges, certificates, etc.

Each phase will have its own design doc.

---

*Approved by: Nitin (2026-05-26). Awaiting implementation plan via `superpowers:writing-plans`.*
