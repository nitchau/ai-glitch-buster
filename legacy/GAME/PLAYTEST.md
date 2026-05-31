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

---

# Phase 2 — Bias Breaker Platformer

## Pre-flight
- [ ] `python -m http.server 7891` running from repo root
- [ ] DevTools console clean before entry
- [ ] `http://localhost:7891/GAME/test.html` shows **12 / 12 passed**

## Level entry
- [ ] Open `http://localhost:7891/index.html`, click Play
- [ ] Complete onboarding if first run; otherwise map appears
- [ ] Click Bias Breaker
- [ ] Stage loads with neon-cyber dark background, scan lines, digital rain
- [ ] Player avatar visible on the leftmost green platform (cartoon kid with blonde curly hair, green shirt, confident face)
- [ ] HUD top-left: "Platforms: 0/5"
- [ ] Map UI is gone (replaced by the stage)

## Movement
- [ ] Press D — avatar runs right; legs alternate; faces right
- [ ] Press A — avatar flips, faces left, runs left
- [ ] Press Space — avatar jumps; descends with gravity; lands cleanly
- [ ] Press Esc — pause overlay appears with Resume + Back to Map buttons; Resume returns to game

## Questions + platform spawning
- [ ] Walk to right edge of starting platform
- [ ] Modal slides up from bottom with question text + 4 stacked options
- [ ] Pick wrong answer → red feedback box with explanation appears → ~1.6s → new question loads
- [ ] Pick correct answer → green feedback with motivation → ~0.8s → modal closes → game resumes
- [ ] HUD updates to "Platforms: 1/5"
- [ ] Walk right + jump to reach the next gap; repeat 4 more times
- [ ] Each platform spawns visibly when its question is answered correctly

## Boss
- [ ] After the 5th platform, boss arena visible: Unfair Gatekeeper drawn on canvas
- [ ] HUD shows "Gatekeeper HP: ♥♥♥"
- [ ] Modal appears with boss-tier question
- [ ] Correct answer → boss flashes red, one body segment cracks, one X-eye dims, HP becomes ♥♥♡
- [ ] Repeat 2 more times → boss collapses into floating pixels (alpha fade upward)

## Celebration
- [ ] Square-pixel confetti rains in 5 colors (green, gold, pink, cyan, magenta)
- [ ] Headline: "You freed the city!"
- [ ] Stars displayed (⭐⭐⭐ if 0 falls, ⭐⭐☆ if 1-2, ⭐☆☆ if 3+)
- [ ] Gold toast: "🌊 Bad-Habit Harbor unlocked!"
- [ ] "🏠 Back to Map" button visible
- [ ] Click Back to Map

## Post-win
- [ ] Map re-renders: Habit Harbor no longer has the chain-lock icon — it's now glowing green
- [ ] DevTools → Application → Local Storage → `gg.profile.progress["bias-breaker"]` has `cleared: true, stars: N`
- [ ] `gg.profile.progress["habit-harbor"].unlocked` is `true`
- [ ] Console: still 0 red errors

## Fall + restart
- [ ] During play, jump off a platform deliberately
- [ ] 200ms fade-to-black overlay
- [ ] Respawn on last cleared platform; question state preserved (don't re-answer earlier questions)
- [ ] Final stars reflect the falls counter

## Returning player after a clear
- [ ] Reload page, click Play → map shows Habit Harbor unlocked
- [ ] Click Habit Harbor → still shows the Coming Soon island intro (it has no Phase 2 implementation yet — Phase 5+)
- [ ] Click Bias Breaker → level plays again (within-session state resets, but Habit Harbor stays unlocked)

## Console + storage edge cases
- [ ] No red console errors during entire playthrough
- [ ] If `localStorage.setItem` is monkey-patched to throw during the win → celebration still shows; banner on next map render

## Performance
- [ ] Smooth ~60 fps on test machine; no visible jank during platform spawns, modal transitions, or confetti

---

If every Phase 2 box is checked, Bias Breaker is **DONE** — first real island gameplay shipped.
