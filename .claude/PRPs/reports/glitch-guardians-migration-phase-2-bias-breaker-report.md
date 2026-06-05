# Implementation Report: Migration Phase 2 — Bias Breaker (Phaser rebuild)

## Summary

Rebuilt the entire Bias Breaker island on the new Phaser 3 + TypeScript + Vite
stack at feature parity with the vanilla v13.3 game, then took it past parity
on playtest feedback. The game now plays start-to-finish: pick an avatar →
emerge from the entry door → answer 5 bias questions by dwelling on the correct
flyer → ride/hang/fly across the gaps → dodge tortoises and the lava → walk
through the final door → celebration → Habit Harbor unlocks. Shipped with unit
tests, a headless Playwright happy-path, and the full 60-question bias bank.

## Assessment vs Reality

| Metric | Predicted (Plan) | Actual |
|---|---|---|
| Complexity | XL | XL (5 milestones + 2 feedback polish rounds) |
| Sessions | 2-3 | 3 (A+B / C+D / E) + 2 feedback turns |
| Confidence | 8/10 | Single-pass per milestone; feedback drove extra art/mechanics |
| Files (src) | ~12 | 13 src + 4 test files |
| Unit tests | ~8 | 29 (16 `_shared` + 13 `bias-breaker`) |
| Bundle | ≤1 MB gzipped | ~349 KB gzipped (Phaser-dominant) |

## Milestones Completed

| # | Milestone | Status | Commit |
|---|---|---|---|
| A | Static world + player + camera + keyboard | Complete | `1b5f443` |
| B | Flyers + dwell-to-confirm + carrier transit | Complete | `1b5f443` |
| C | Lava respawn (v13.2 NaN-free) + tortoise + HUD | Complete | `e788ee2` |
| D | Final door win → CelebrationScene + `markIslandCleared` | Complete | `10494b6` |
| E | Vitest level/scoring + Playwright happy-path + full bias bank | Complete | `9e0c6c4` |

### Post-parity polish (playtest feedback)

| Pass | Contents | Commit |
|---|---|---|
| Polish 1 | Limbed avatar + walk cycle, high-contrast banner, **60× cloud-drift bug fix**, circular dwell ring (2s), wrong→rain→lava, emerge-from-door + left wall | `f47d423` |
| Avatar | Fixed "two skin tones" face (single skin head + hair cluster), **boy/girl × light/dark picker** (`AvatarSelectScene` + shared `avatar.ts`) | `d324011` |
| Flyer rides | Per-stage carry: cloud/bird ride on top, **kite/quadcopter hang underneath**; frame-rate-independent ride coupling | `a1bac93` |
| Flyer art | Redrew bird/kite/helicopter/quadcopter so each reads as its name | `0f7fe4f` |
| Helicopter | **Spinning rotor + fly-up arc** ride | `660eaca` |

## Validation Results

| Level | Status | Notes |
|---|---|---|
| Static Analysis (tsc) | **Pass** | `pnpm -r typecheck` clean (strict + `noUncheckedIndexedAccess`) |
| Lint (ESLint) | **Pass** | `pnpm -r lint` clean |
| Unit Tests (Vitest) | **Pass** | 29 green |
| E2E (Playwright) | **Pass** | happy-path green headless in ~25s (chromium) |
| Build (Vite) | **Pass** | ~5s → ~349 KB gzipped |
| Manual / live | **Pass** | every mechanic verified live via MCP Playwright (screenshots in session) |

## Key Files

`games/bias-breaker/src/`:
`main.ts` (scene array), `constants.ts` (v13.3 constants + per-second
conversions), `scoring.ts` (timeToStars), `avatar.ts` (shared kid art + choice),
`level/{types,buildLevel}.ts`, `entities/{Player,Flyer,Tortoise}.ts`,
`ui/{Banner,Hud}.ts`, `scenes/{PreloadScene,AvatarSelectScene,GameScene,CelebrationScene}.ts`.

`games/_shared/src/quizData.ts` — bias bank expanded 8 → 60 questions.

Tests: `tests/unit/{sanity,level,scoring}.test.ts`, `tests/e2e/happy-path.spec.ts`,
`_shared/tests/unit/{profile,quizData}.test.ts`.

## Deviations from Plan

1. **Scope grew past parity.** The plan was a faithful v13.3 port; user playtest
   feedback added an avatar picker, per-stage hang/ride mechanics, redrawn
   sprites, and a helicopter rotor/arc — none in the original. Logged and built
   with the user's explicit go-ahead.
2. **`scoring.test.ts` tests extracted code, not an inline copy.** The plan
   sketched an inline `timeToStars`; extracted it to `src/scoring.ts` so the test
   guards the shipping logic.
3. **Happy-path drives via the test seam, not raw keyboard.** The plan suggested
   `page.keyboard` walking; the level geometry (a jump only reaches the lowest
   flyer) makes keyboard-driving to high answers fragile, so the e2e parks the
   player on the correct flyer and exercises the real dwell/carry/win flow.
4. **Bias bank is 60, others remain 8-question starters** — per the per-island
   content plan (bad-habits in Phase 3, etc.).

## Issues Encountered & Fixed

- **60× cloud-drift slowdown**: drift keyed off elapsed ms instead of the frame
  counter — ~6s sweep became ~6min. Switched to `animFrame`.
- **Ride coupling slid off narrow flyers**: `vx*60` assumed 60fps; flyers drift
  `vx`/update. Switched to `vx*1000/delta` (frame-rate independent) — surfaced by
  the kite and again by the headless ~38fps e2e.
- **Two-skin-tone face**: centre-anchored hair pie-slice → hair cluster.
- **Helicopter arc buried**: linear descent swallowed the lift; ease-in (`t²`)
  descent restored a visible ~58px hop.
- **e2e boot race + config**: gated on a scene being active (not just `__GAME__`),
  fixed the Phase-1 `webServer`/`baseURL` base-path mismatch.

## GitHub push

Still blocked — user `nitchau` vs org repo `wizkidzai/ai-glitch-buster` (403).
All Phase 2 work is committed locally on `main` (12 commits, `40927a4`→`9e0c6c4`);
PR/push deferred per the user.

## Next Steps

- [ ] Push / PR once GitHub auth for the org repo is resolved (CI runs the full
      gate incl. Playwright on push).
- [ ] **Phase 3** — Bad-Habit Harbor rebuild on the new stack (+ full bad-habits
      bank port).
- [ ] Phase 4 — main-app launcher link cutover + all-games landing page (refresh
      resume reads `gg.activeIsland`, already set/cleared by Bias Breaker).
