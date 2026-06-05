# Implementation Report: Glitch Guardians Migration — Phase 3 (Bad-Habit Harbor)

## Summary

Rebuilt **Bad-Habit Harbor** on the Phaser 3 + TypeScript + Vite stack as the
second game in the path-routed monorepo, mechanic-for-mechanic from the vanilla
`legacy/GAME/screens/habit-harbor*.js` — **plus** the win/celebration/unlock that
the vanilla game never had. The game now plays end-to-end: navigate the boat
through the dock maze, drive into each glitched helper-bot to open a bad-habits
quiz, rescue all five to open their gates, then sail into the harbor mouth to win
and unlock Privacy Vaults.

## Assessment vs Reality

| Metric | Predicted (Plan) | Actual |
|---|---|---|
| Complexity | XL | XL (as predicted) |
| Milestones | A–D | A–D, all complete |
| Est. files | ~18 | 17 source/test files + 4 config/CI/build |
| Confidence | — | Single-pass per milestone; one e2e bug fixed |

## Milestones

| Milestone | Deliverable | Commit |
|---|---|---|
| A | Scaffold + pure maze model + boat (per-axis collision) + static render | `c2e91fd` |
| B | 5 helper-bots + drive-into rescue quiz modal + gate-open + HUD/banner | `7ee62e5` |
| C | Win-at-exit + CelebrationScene + time-stars + Privacy Vaults unlock + persist | `cae88f1` |
| D | Happy-path e2e + full 60-question bad-habits bank + multi-game Vercel/CI | `b29c355` |

## Validation Results

| Level | Status | Notes |
|---|---|---|
| Static Analysis | ✅ Pass | `pnpm -r typecheck` + `pnpm -r lint` clean |
| Unit Tests | ✅ Pass | 40 monorepo (17 `_shared` + 13 bias + 10 harbor: 7 maze + 3 scoring) |
| Build | ✅ Pass | habit-harbor ~351 KB gz; combined `dist/` assembles both games |
| E2E | ✅ Pass | both Playwright happy-paths green (bias + harbor) |
| In-browser | ✅ Pass | render, movement/collision, rescue loop, win→celebration all verified live |

## Files Changed

**New package `games/habit-harbor/`** — `constants.ts`, `maze.ts` (pure),
`main.ts`, `scenes/PreloadScene.ts` + `GameScene.ts` + `CelebrationScene.ts`,
`entities/Boat.ts` + `Bot.ts`, `ui/Hud.ts` + `Banner.ts` + `QuizModal.ts`,
`scoring.ts`, `tests/unit/{maze,scoring}.test.ts`, `tests/e2e/happy-path.spec.ts`,
plus copied config (package/tsconfig/vite/vitest/playwright/index.html, dev port 5174).

**Shared / infra** — `games/_shared/src/quizData.ts` (bad-habits 8 → 60),
`games/_shared/tests/unit/quizData.test.ts` (+bad-habits ≥50 assertion),
`vercel.json` (multi-game combined output), `scripts/assemble-dist.cjs` (new),
`.github/workflows/ci.yml` (+habit-harbor e2e).

## Deviations from Plan

- **D4 Vercel**: the plan said "mirror the bias rewrite". The current single-output
  config (`outputDirectory: games/bias-breaker/dist` + root-strip rewrites) cannot
  serve two games — both paths would strip to the same root. Implemented the
  correct model instead: build both games and assemble into `dist/<game>/`
  (`scripts/assemble-dist.cjs`); each game's Vite `base` matches its folder, so
  assets resolve with **zero rewrites**. Verified the `dist/` layout + asset URLs
  locally (cannot deploy-test — GitHub push still blocked).
- **D1 unit tests** were front-loaded: `maze.test.ts` landed in Milestone A
  (the BFS solvability is the riskiest port) and `scoring.test.ts` in Milestone C.

## Issues Encountered

- **e2e first run timed out at boot** — the long-lived dev server was mid-HMR-reload
  from the quizData splice; re-ran clean. Root cause confirmed via MCP (app booted
  fine independently).
- **e2e `CELL is not defined`** — referenced a module-scope const inside
  `page.evaluate`, which runs in the browser with no access to Node closure vars.
  Fixed by passing `CELL` as an explicit arg.
- **Phaser Graphics has no `quadraticCurveTo`/text/shadowBlur** — the boat hull
  became an 8-point polygon (cached texture), and the Bot a Container (Graphics +
  a `"?"` Text) rather than a baked texture.
- GateGuard fired per new file / first Bash as expected; budgeted for.

## Tests Written

| Test File | Tests | Coverage |
|---|---|---|
| `games/habit-harbor/tests/unit/maze.test.ts` | 7 | buildMaze, isWall (walls/gates), reachableCells, validateSolvable |
| `games/habit-harbor/tests/unit/scoring.test.ts` | 3 | timeToStars 90/120 tiers |
| `games/habit-harbor/tests/e2e/happy-path.spec.ts` | 1 | boot → 5 rescues → win → Privacy Vaults unlocked |
| `games/_shared/tests/unit/quizData.test.ts` | +1 | bad-habits bank ≥ 50 |

## Next Steps

- **GitHub push/PR still blocked** — all Phase 1–3 commits are local on `main`;
  push/PR deferred until org auth (`nitchau` vs `wizkidzai/ai-glitch-buster`) resolves.
- **Phase 4** — main-app link cutover + all-games landing page (the combined
  `dist/` + placeholder root index from this phase are the foundation).
- Phases 5–7 — Privacy Vault, Hallucination Tower, The Core (new islands).
