# Implementation Report: Glitch Guardians Migration — Phase 4 (Link Cutover + Landing)

## Summary
Cut the main AI Glitch Buster app's "Play Glitch Guardians" launcher over from the dead
in-page vanilla game to an external link to the deployed Phaser games, removed the orphaned
`GAME/` script block, and shipped a real all-games landing page at the Vercel root (five
islands + unlock state from `localStorage.gg.profile`).

## Assessment vs Reality
| Metric | Predicted (Plan) | Actual |
|---|---|---|
| Complexity | Small–Medium | Small–Medium (as predicted) |
| Files | 3 | 3 (`index.html`, `landing/index.html`, `scripts/assemble-dist.cjs`) |
| Confidence | 9/10 | Single-pass, no rework |

## Tasks Completed
| # | Task | Status | Notes |
|---|---|---|---|
| 1 | Cut launcher → external link | ✅ | `<button>`→`<a href=vercel target=_blank>`; `display:inline-block` keeps the button look |
| 2 | Remove dead `GAME/` block | ✅ | 18 lines of 404s deleted; quiz app independent (verified) |
| 3 | All-games landing page | ✅ | `landing/index.html`: 5 island cards + profile-driven state |
| 4 | Wire assemble-dist | ✅ | `copyFileSync(landing/index.html → dist/index.html)` |
| 5 | Smoke test | ✅ | Main app + landing verified in-browser |

## Validation Results
| Level | Status | Notes |
|---|---|---|
| Static analysis | ✅ Pass | `pnpm -r typecheck` + `lint` clean (game packages untouched) |
| Build + assemble | ✅ Pass | `dist/{index.html(landing), bias-breaker/, habit-harbor/}` |
| Landing — fresh profile | ✅ Pass | Only Bias Breaker playable; Bad-Habit Harbor 🔒 Locked; 3 future 🔒 Coming soon |
| Landing — seeded profile | ✅ Pass | Bias Breaker "Cleared ⭐⭐⭐"; Bad-Habit Harbor "▶ Play" |
| Landing links | ✅ Pass | Playable cards → `/bias-breaker/`, `/habit-harbor/` |
| Main app | ✅ Pass | Renders; **zero `GAME/` requests**; `showTopic` intact; launcher = `<a>` → Vercel (new tab) |

## Files Changed
| File | Action | Lines |
|---|---|---|
| `index.html` | UPDATE | launcher line + −18 (dead GAME/ block) |
| `landing/index.html` | CREATE | +~215 (static HTML/CSS/JS) |
| `scripts/assemble-dist.cjs` | UPDATE | placeholder → `copyFileSync` |

## Deviations from Plan
- **Removed the dead `GAME/` block** (a documented departure from the "main app — one line only"
  lock-in). Justified: `GAME/` was already moved to `legacy/`, so those 14 `<script>` tags + the
  CSS link were already 404s; deleting them only removes console noise and changes no working
  behavior (verified: zero `GAME/` resource requests, `showTopic` still present).

## Issues Encountered
- None. The one console error on the main app is a pre-existing favicon/embed warning, not from
  this change (confirmed: no `GAME/` requests).

## Open Items
- **Cutover URL is a placeholder** (`https://glitch-guardians.vercel.app/`) with a `TODO(deploy)`
  comment — set it to the real Vercel URL after the first deploy (org-repo push still blocked).

## Next Steps
- **Deploy** once the `wizkidzai/ai-glitch-buster` push is unblocked → set the real launcher URL,
  verify the live landing + same-origin profile sharing.
- **Phases 5–7**: build Privacy Vault, Hallucination Tower, The Core (the landing's "coming soon"
  cards flip to playable as each ships). Then Phase 8: Booth QA.
