# Glitch Guardians — Phase 1 Playtest Checklist

> Run through this checklist on every change to `GAME/` to verify the shell still works.

## Setup

- [ ] Start a local server: `python -m http.server 7891` from the repo root.
- [ ] Open `http://localhost:7891/GAME/test.html` in a browser → **7 / 7** automated tests pass (all green ✅).
- [ ] In DevTools console: `GG.state.reset()` to wipe any saved profile.

## First-Time Player Flow

- [ ] Open `http://localhost:7891/index.html` in a fresh tab.
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
- [ ] Click a locked island (e.g. Habit Harbor) → it wiggles + tooltip appears: "Clear Bias Breaker first to unlock Habit Harbor!" → tooltip auto-dismisses ~2.5 s later.
- [ ] Click Bias Breaker → island intro card appears.
- [ ] Intro card shows: big ⚖️ icon, "Bias Breaker" title, "Topic: Fairness in AI", a blurb, "🚧 Coming Soon!" callout, "← Back to Map" button.
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

- [ ] DevTools → Device Toolbar → iPad (or any 768 px wide viewport).
- [ ] Reload, do full play-through.
- [ ] Map SVG scales, all 5 islands visible.
- [ ] Buttons are tappable (large enough for fingers — ≥ 44×44 px).

## DevTools Inspection

- [ ] After completing onboarding, DevTools → Application → Local Storage shows key `gg.profile` with JSON containing `name`, `gradeBand`, `createdAt`, `progress` for all 5 islands.

## Console Cleanliness

- [ ] Throughout the entire play-through, DevTools console shows **zero red errors** and no uncaught warnings.

## Hidden Developer Reset

- [ ] In DevTools console, run `GG.state.reset()` → reload → click Play → onboarding appears again (treated as new player).

---

If every box is checked, Phase 1 is **DONE** — ready to move to Phase 2 (real Bias Breaker platformer gameplay).
