# Plan: Glitch Guardians Migration — Phase 4 (Main-App Link Cutover + All-Games Landing)

## Summary
Point the main AI Glitch Buster app's "Play Glitch Guardians" launcher at the deployed
Phaser games instead of the (now-removed) in-page vanilla game, and give the games' Vercel
root a real all-games landing page that lists the five islands with their unlock state read
from `localStorage.gg.profile`. Smoke-test the main app for zero regression.

## User Story
As a kid (or booth visitor) on the main AI Glitch Buster app, I want the "Play Glitch
Guardians" button to open the real, polished Phaser games, so that I can play Bias Breaker
and Bad-Habit Harbor (and see which islands are unlocked) instead of clicking a dead button.

## Problem → Solution
The vanilla game moved to `legacy/GAME/`, so `index.html`'s `GAME/...` script tags now **404**
and the launcher button (`#gg-launch-button`, wired by the missing `GAME/glitch-guardians.js`)
**does nothing**. → Cut the launcher over to an external link to the deployed games, drop the
dead `GAME/` block, and ship a proper landing page at the games' Vercel root.

## Metadata
- **Complexity**: Small–Medium
- **Source PRD**: `.claude/PRPs/prds/glitch-guardians-migration.prd.md`
- **PRD Phase**: 4 — Main app link cutover + all-games launcher
- **Estimated Files**: 3 (`index.html` edit, `scripts/assemble-dist.cjs` edit, new `landing/index.html`)

---

## UX Design

### Before
```
Main app (index.html)            Vercel root (dist/index.html)
┌───────────────────────┐        ┌──────────────────────────┐
│ 🎮 Play Glitch        │        │ placeholder: <ul> of two │
│    Guardians  [DEAD]  │        │ raw game links           │
│ (GAME/*.js → 404,     │        └──────────────────────────┘
│  button does nothing) │
└───────────────────────┘
```

### After
```
Main app (index.html)            Vercel root (dist/index.html)  = LANDING
┌───────────────────────┐        ┌────────────────────────────────────────┐
│ 🎮 Play Glitch        │  ───▶  │  Glitch Guardians — pick an island       │
│    Guardians  ─────────┼──link─▶│  ⚖️ Bias Breaker      ✓ cleared ⭐⭐⭐ │
│ (now <a href=VERCEL>) │        │  🌊 Bad-Habit Harbor  ▶ play             │
└───────────────────────┘        │  🔐 Privacy Vault     🔒 coming soon     │
                                 │  🗼 Hallucination Tw. 🔒 coming soon     │
                                 │  💥 The Core          🔒 coming soon     │
                                 └────────────────────────────────────────┘
```

### Interaction Changes
| Touchpoint | Before | After | Notes |
|---|---|---|---|
| Main-app launcher | Dead button (404 scripts) | External link → games Vercel URL | One functional line; placeholder URL until deploy |
| Vercel root `/` | Placeholder `<ul>` of 2 links | Themed landing: 5 islands + unlock state | Reads `localStorage.gg.profile` (same-origin) |
| In-page GG game | Already broken (GAME/ moved) | Removed (dead `GAME/` block deleted) | Cleanup; no behavior the main app relied on |

---

## Mandatory Reading
| Priority | File | Lines | Why |
|---|---|---|---|
| P0 | `index.html` | 587 (launcher), 3523–3540 (dead GAME/ block) | The exact markup to change/remove |
| P0 | `scripts/assemble-dist.cjs` | all | Where `dist/index.html` is produced; copy the new landing instead |
| P1 | `games/_shared/src/profile.ts` | 10–18, 80–97 | `gg.profile` schema + `blankProgress` (bias-breaker unlocked) + ISLANDS cascade |
| P1 | `legacy/GAME/screens/map.js` | 12–16 | Canonical island id/name/icon list |

### Current markup (exact)
**Launcher (index.html:587):**
```html
<button id="gg-launch-button" class="gg-launch" type="button">🎮 Play Glitch Guardians</button>
```
**Dead GG block (index.html:3523–3540):** a `<link rel="stylesheet" href="GAME/glitch-guardians.css">`,
`<div id="gg-root" hidden></div>`, and 14 `<script src="GAME/...">` tags — all 404 now.

### Island roster (legacy/GAME/screens/map.js:12–16) — ISLANDS order
| id | name | icon | built? | path |
|---|---|---|---|---|
| `bias-breaker` | Bias Breaker | ⚖️ | ✅ | `/bias-breaker/` |
| `habit-harbor` | Bad-Habit Harbor | 🌊 | ✅ | `/habit-harbor/` |
| `privacy-vaults` | Privacy Vault | 🔐 | ❌ | coming soon |
| `reality-tower` | Hallucination Tower | 🗼 | ❌ | coming soon |
| `the-core` | The Core | 💥 | ❌ | coming soon |

### Profile schema (read-only on the landing)
`localStorage["gg.profile"]` = JSON `{ name, gradeBand, createdAt(ISO), progress: { <islandId>: { unlocked:boolean, cleared:boolean, stars:number } } }`.
No profile → treat bias-breaker as unlocked, the rest locked (mirrors `blankProgress`).

---

## Patterns to Mirror

### EXTERNAL_LINK (decision lock-in: "main app — one functional line")
// SOURCE: index.html:535,539 (existing external-link buttons)
```html
onclick="window.open('ai-model-trainer.html', '_blank')"
```
The main app already opens external targets via `window.open(...,'_blank')`. Mirror that style for the cutover (keeps the main app open behind the games).

### ASSEMBLE_LANDING (the seam to reuse)
// SOURCE: scripts/assemble-dist.cjs (current placeholder)
```js
fs.writeFileSync(path.join(out, 'index.html'), `<!doctype html>...<ul>${links}</ul>`);
```
Replace the inline template with a copy of a real source file: `fs.copyFileSync('landing/index.html', path.join(out, 'index.html'))`.

### PROFILE_DEFAULT (no @gg/shared import on the static page)
// SOURCE: games/_shared/src/profile.ts:65-68 (isIslandUnlocked)
```ts
if (!p) return id === 'bias-breaker';   // fresh visitor: only the first island is open
```

---

## Files to Change
| File | Action | Justification |
|---|---|---|
| `index.html` | UPDATE | Cut launcher → external link; remove dead `GAME/` script block |
| `landing/index.html` | CREATE | The all-games landing (static HTML + CSS + vanilla JS) |
| `scripts/assemble-dist.cjs` | UPDATE | Copy `landing/index.html` → `dist/index.html` instead of the inline placeholder |

## NOT Building
- No deploy (push/Vercel still blocked) — the cutover URL is a **placeholder** with a TODO; verify live after deploy is unblocked.
- No build step for the landing (plain static page; copied verbatim by assemble-dist).
- No changes to the main app's quiz logic / topics / other buttons — only the launcher + dead GG block.
- No new island games (Privacy Vault etc. remain "coming soon" cards — Phases 5–7).
- No `@gg/shared` import on the landing (it's a standalone static page; profile read is hand-rolled).

---

## Step-by-Step Tasks

### Task 1: Cut over the main-app launcher
- **ACTION**: In `index.html`, replace the dead launcher button (line 587) with an external link to the games.
- **IMPLEMENT**:
  ```html
  <a id="gg-launch-button" class="gg-launch" href="https://glitch-guardians.vercel.app/"
     target="_blank" rel="noopener">🎮 Play Glitch Guardians</a>
  ```
  Mark the URL with an HTML comment `<!-- TODO: set to the real Vercel URL after first deploy -->`.
- **MIRROR**: EXTERNAL_LINK (existing `window.open(...,'_blank')` buttons).
- **GOTCHA**: `.gg-launch` is styled as a button; an `<a>` may need `display:inline-block` if the existing CSS assumed a `<button>`. Verify it still looks like a button (smoke test). Keep the same id/class so existing styles apply.
- **VALIDATE**: Open `index.html` locally; the button looks unchanged and links out (new tab); no console errors from it.

### Task 2: Remove the dead `GAME/` block
- **ACTION**: Delete `index.html` lines 3523–3540 (the `GAME/glitch-guardians.css` link, `#gg-root` div, and all `GAME/...` script tags).
- **IMPLEMENT**: Remove the whole `<!-- Glitch Guardians game module -->` block. Leave a one-line comment noting the game now lives at the external link.
- **GOTCHA**: This is a deliberate, documented deviation from the literal "one line only" lock-in — the scripts already 404 (GAME/ moved to legacy/), so removing them only deletes dead includes and stops the console 404 spam. The main quiz app does not depend on them.
- **VALIDATE**: Reload the main app; DevTools console shows **no `GAME/*` 404s**; the quiz topics (bias/hallucination/bad-habits/privacy) still open and play.

### Task 3: Build the all-games landing page
- **ACTION**: Create `landing/index.html` — a themed, kid-friendly page (dark navy `#0a0820`, green `#43e97b` accents to match the games) with five island cards.
- **IMPLEMENT**:
  - Inline `<style>` (no external deps) + the five cards from the roster table (id/name/icon).
  - Vanilla `<script>`: read `localStorage.gg.profile`; for each island compute state:
    - no profile → `bias-breaker` unlocked, rest locked.
    - else read `progress[id]`: `cleared` (show ⭐×stars), `unlocked` (▶ Play), else 🔒.
    - built islands (`bias-breaker`,`habit-harbor`) → card links to `/<id>/` when unlocked; the 3 future islands always show "🔒 Coming soon" regardless of unlock.
  - Each playable card is an `<a href="/bias-breaker/">` / `/habit-harbor/`.
- **MIRROR**: PROFILE_DEFAULT (bias-breaker default-unlocked) + ASSEMBLE_LANDING.
- **GOTCHA**: Same-origin is what makes the profile readable — the landing (`/`) and games (`/<id>/`) are one Vercel project, so they share `localStorage`. Guard `JSON.parse` in try/catch (storage blocked / corrupt).
- **VALIDATE**: build both games + `node scripts/assemble-dist.cjs`; open `dist/index.html`; with no profile only Bias Breaker is playable; seed a profile with `habit-harbor.unlocked=true` → its card becomes playable; cleared islands show stars.

### Task 4: Wire assemble-dist to copy the landing
- **ACTION**: In `scripts/assemble-dist.cjs`, replace the inline `dist/index.html` placeholder with a copy of `landing/index.html`.
- **IMPLEMENT**:
  ```js
  fs.copyFileSync(path.join(root, 'landing', 'index.html'), path.join(out, 'index.html'));
  console.log('copied landing/index.html -> dist/index.html');
  ```
- **GOTCHA**: Keep the existing per-game `dist/<game>/` copy loop; only the root `index.html` generation changes.
- **VALIDATE**: `node scripts/assemble-dist.cjs` → `dist/index.html` is the landing; `dist/bias-breaker/` + `dist/habit-harbor/` still present.

### Task 5: Smoke test (zero regression)
- **ACTION**: Verify the main app and the landing locally.
- **VALIDATE**:
  - Main app: open `index.html` (static server) — home + a quiz topic round work; no `GAME/*` 404s; launcher links out.
  - Landing: open `dist/index.html` — renders the 5 islands; profile state reflected; playable cards navigate (relative `/bias-breaker/` resolves under a server).
  - Monorepo unchanged: `pnpm -r typecheck && pnpm -r lint && pnpm -r test` still green (Phase 4 doesn't touch the game packages).

---

## Testing Strategy
### Manual / Browser (no new unit tests — static HTML + a one-line app edit)
| Check | Expected |
|---|---|
| Main app loads | Home screen renders; no `GAME/*.js` 404 in console |
| Quiz still works | `showTopic('bias')` → quiz round plays (existing app intact) |
| Launcher | `#gg-launch-button` is an external link (new tab) to the Vercel URL |
| Landing — fresh | Only Bias Breaker playable; others 🔒 |
| Landing — seeded | `habit-harbor.unlocked=true` → playable; `cleared` → ⭐×stars |
| assemble-dist | `dist/{index.html, bias-breaker/, habit-harbor/}` all present |

### Edge Cases Checklist
- [ ] No `gg.profile` in localStorage → default (bias-breaker only)
- [ ] Corrupt `gg.profile` JSON → try/catch → default, no crash
- [ ] localStorage blocked → default, no crash
- [ ] Future island clicked → inert "coming soon" (no dead link)

---

## Validation Commands
```bash
# Monorepo regression (Phase 4 doesn't touch game packages, but confirm)
pnpm -r typecheck && pnpm -r lint && pnpm -r test    # EXPECT: green

# Build + assemble; confirm dist layout
pnpm -F bias-breaker build && pnpm -F habit-harbor build && node scripts/assemble-dist.cjs
find dist -maxdepth 2 -name index.html               # EXPECT: dist/index.html + dist/<game>/index.html

# Leak guard before commit (NEVER stage the 4 root PDFs)
git diff --cached --name-only | grep -iE '\.pdf$|/dist/|node_modules'   # EXPECT: empty
```
### Manual
- [ ] Serve repo root, click launcher → opens games landing (new tab)
- [ ] Serve `dist/`, landing shows correct unlock states; click Bias Breaker → game boots

---

## Acceptance Criteria
- [ ] Launcher links to the games (external) — no dead button
- [ ] Dead `GAME/` block removed; no `GAME/*` 404s on the main app
- [ ] Landing page lists all 5 islands with live unlock state from `gg.profile`
- [ ] `assemble-dist.cjs` ships the landing as `dist/index.html`
- [ ] Monorepo typecheck/lint/test still green
- [ ] No PDFs/dist/node_modules staged

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Vercel URL unknown (deploy blocked) | High | Low | Placeholder + TODO; one-line fix post-deploy |
| `.gg-launch` CSS assumed `<button>` | Med | Low | Keep id/class; add `display:inline-block` if needed; smoke test |
| Removing GAME/ scripts breaks main app | Low | Med | Scripts already 404; quiz app is independent; smoke test the quiz |
| Landing relative links under file:// | Low | Low | Test under a static server (relative `/<game>/` needs an origin) |

## Notes
- **Deploy deferred / push blocked** — everything commits locally on `main`; the cutover goes live when the org-repo push + Vercel deploy are unblocked. Surface the placeholder URL to the user.
- The combined `dist/` + `scripts/assemble-dist.cjs` from Phase 3 Milestone D are the foundation this builds on.
