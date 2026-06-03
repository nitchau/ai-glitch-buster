# Glitch Guardians — Migration to Phaser 3 + TS + Vite + Vercel

**Project:** Glitch Guardians (the game tier of the AI Glitch Buster app, `C:\Users\nitin\ai-glitch-buster`)
**Date:** 2026-05-28
**Authors:** Nitin, Mishika & team, Claude Opus 4.7
**Status:** DRAFT — awaiting user review
**Source:** in-session decision to migrate the entire game tier off vanilla canvas onto an agentic, professional stack before national finals
**Replaces:** the vanilla-canvas Glitch Guardians shell + per-island screens under `GAME/` (kept as `legacy/` reference until cutover)

---

## Problem Statement

The vanilla-canvas Glitch Guardians stack cannot run the agentic feedback loops that ECC ships — there is no dev server, no build, no types, no preview URL, and no automated visual verification — so every visual or interaction bug consumes a human-playtest round-trip. Bias Breaker is already ~1900 lines of hand-rolled physics and state; the three remaining islands (Privacy Vault stealth, Hallucination Tower vertical platformer, The Core combined-mechanics finale) are each more complex than what is shipped. Without a stack change, finishing the slate before the national-finals booth becomes a slog of hand-rolled engine code with no agent-side feedback, and the bugs that surfaced this week (off-screen modal, blocky tile grid, NaN flyer positions, mid-air carrier hang) will keep recurring as a class.

## Evidence

- `GAME/screens/bias-breaker.js` is ~1900 lines, all hand-rolled physics, collision, carrier flyer, fall overlay, HUD, tortoise enemy. `GAME/screens/habit-harbor.js` is already ~700 lines after Phases 1–3 and growing.
- Four representative bugs from this week — modal pinned below the viewport, walls rendered as a tile grid instead of continuous docks, `NaN` flyer positions after a respawn, carrier flyer hanging mid-air at the end of its lerp — were all caught by user playtest, not by automated checks. Each cost 1–3 user round-trips.
- The current stack has no `tsc`, no lint, no test runner with a watcher, no build, no preview URL — so Playwright e2e, `gan-design` screenshot loops, multi-agent review on diffs, and per-branch preview deploys (all skills ECC already ships) are physically unavailable.
- The main `AI Glitch Buster` app embeds 240 quiz questions across 4 banks (`bias`, `bad-habits`, `privacy`, `hallucination`) — the games only need read-access to these; no new content authoring is required.
- The PRP loop (`prp-prd` → `prp-plan` → `prp-implement`) is proven — it shipped Bad-Habit Harbor Phases 1, 2, 3 in this session — but the gan-design / e2e / vercel-deploy half of the pipeline has been dormant because the stack can't host it.

## Proposed Solution

Migrate the entire game tier to a **pnpm monorepo of independent Phaser 3 + TypeScript + Vite games**, deployed as a **single Vercel project** with preview URLs per branch, and adopt the **full ECC pipeline** for every game's build cycle (`prp-prd` → `prp-plan` → `prp-implement` → `gan-design` → `e2e-runner` → `code-review` → `vercel:deploy`). The shipped games (Bias Breaker, Bad-Habit Harbor) are **rebuilt** in the new stack — mechanic-for-mechanic, no redesign — to validate pipeline maturity on known-quantity gameplay before fresh islands begin. The main AI Glitch Buster app is **frozen**, with one allowed change: its launcher swaps the in-app `GG.start()` call for a link to the deployed game URL. The 240 quiz questions are **forked into a typed shared package** (`games/_shared/src/quizData.ts`) so the games are fully self-contained for offline booth play, with the main app's inline copy left untouched. Order: Foundation → Bias Breaker rebuild → Bad-Habit Harbor rebuild → main-app link cutover → Privacy Vault → Hallucination Tower → The Core → booth QA.

## Key Hypothesis

We believe **migrating the game tier to Phaser 3 + TypeScript + Vite + Vercel under the full ECC pipeline** will **let Nitin + Claude ship all five polished islands by national finals** for **Nitin (driver) and Mishika's team (inheritors and presenters)**.
We'll know we're right when **all five islands are live on a single Vercel project with green CI + Playwright happy-path e2e, a new game phase can go from PRD to deployed preview with at least 50% fewer human-eyeballing round-trips than in the vanilla stack, and the booth runs at smooth 60fps on a Chromebook with zero console errors**.

## What We're NOT Building

- **Any change to the main AI Glitch Buster app's content, UI, or other features** — only its single launcher link gets updated.
- **Redesign of shipped games** — Bias Breaker and Bad-Habit Harbor are ported mechanic-for-mechanic; no new mechanics, no different quiz format, no different star tiers.
- **Backend, auth, multiplayer, leaderboards, achievements, accounts** — booth must work offline.
- **Mobile portrait support** — desktop / tablet / Chromebook focus continues; the on-screen D-pad from BHH is enough touch coverage.
- **i18n** — English only.
- **Full WCAG audit** — basic readability and keyboard alternatives; not a compliance bar.
- **Public OSS prep** — repo stays as-is; no contributor guide, no license review.
- **Audio asset libraries** — synthesized Web Audio only, per Bias Breaker's pattern.
- **Per-game custom domains** — single Vercel project with path-based routing.

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Islands shipped on the new stack by finals | 5 of 5 (BB, BHH, PV, HT, Core) | Vercel deployments live + linked from main app |
| Automated e2e happy-path per game | 1+ Playwright test per game, green in CI | GitHub Actions report |
| Agentic dividend on a new phase build | ≥50% reduction in human-eyeball round-trips vs. vanilla equivalent | Session retrospectives; count "you tell me what's wrong" turns |
| Booth perf | Smooth 60fps on a Chromebook, no console errors during a 5-minute play | Manual run on Chromebook + DevTools |
| CI safety | Every push runs `tsc + eslint + vitest + playwright` per affected package | GitHub Actions on every PR |
| Bundle budget per game | ≤1MB JS gzipped, ≤2MB total assets | Vite build size report; manual check |
| Main app regression | Zero change to AI Glitch Buster behavior other than the launcher link | Manual smoke test |

## Open Questions

- [ ] Phaser starter template: official `phaser3-ts-vite-template` vs. lean hand-rolled — locked in Phase A.
- [ ] CI provider: GitHub Actions (lean toward) vs. Vercel's built-in checks — locked in Phase A.
- [ ] Theme tokens format: TS module vs. CSS vars vs. JSON — locked in Phase A.
- [ ] Asset pipeline: per-sprite imports vs. TexturePacker atlases — per-game decision in each plan.
- [ ] Particle library: Phaser built-in vs. small helper — locked when first celebration ships (Phase C).
- [ ] Whether a tiny "all-games" Vercel root index page (a launcher landing) is *Should* or *Must* — currently *Should*; revisit at Phase D.

---

## Users & Context

**Primary User — Nitin (the driver)**
- **Who**: Solo + Claude pair-programmer, working evenings/weekends, three islands to ship before finals.
- **Current behavior**: Drives the PRP loop in Claude Code; playtests every change in the browser; lives with the round-trip cost.
- **Trigger**: "I want to add an island / fix a bug" → fires up ECC.
- **Success state**: One `git push` ships a green-CI'd, automatically-deployed preview URL with screenshot-verified visuals; production cut-overs are one PR away.

**Secondary User — Mishika and her team**
- Kids contributing to the project. Inherit the stack post-finals. Need readable code, gentle TS, and an environment they can pair with Claude on.

**Audience — Finals interviewers**
- See a professional repo + a live deploy + automated tests. The migration's existence itself is part of the team's "we kept improving" story.

**Job to Be Done**
When **I want to build or iterate on a Glitch Guardians island**, I want to **drive it through the full agentic ECC pipeline (PRD → plan → implement → gan-design → e2e → review → preview deploy)**, so I can **ship three more polished islands before finals with minimal human-eyeballing round-trips while keeping a stack Mishika's team can inherit**.

**Non-Users**
- Booth kids playing the games — served by each game's own PRD, not by this migration.
- Main app's quiz users — main app is frozen; their experience is unchanged.
- Mobile-portrait players — same constraint as the games' PRDs.
- External contributors / OSS consumers — private competition project.

---

## Solution Detail

### Core Capabilities (MoSCoW)

| Priority | Capability | Rationale |
|----------|------------|-----------|
| Must | pnpm monorepo (`app/` + `games/*` + `games/_shared`) | Single repo, independent per-game builds |
| Must | Phaser 3 + TypeScript + Vite per game | Real 2D engine, types-as-feedback, instant HMR |
| Must | `games/_shared` package (quizData typed + profile/localStorage SDK + theme tokens + shared types) | Single source of truth across games; offline-capable |
| Must | Vitest unit tests + ESLint + tsc per package | Compile-time + lint-time agent feedback |
| Must | Playwright e2e (happy-path per game) + visual snapshot baseline | Enables `e2e-runner` and `gan-design` loops |
| Must | Single Vercel project, monorepo settings, preview URL per branch, production on `main` | Auto-deploys; same origin → shared `gg.profile` localStorage across games |
| Must | All 5 islands shipped on the new stack | Finals slate |
| Must | Feature parity for shipped games — Bias Breaker + Bad-Habit Harbor ported mechanic-for-mechanic | Don't regress what's working |
| Must | Main app's launcher swapped to an external link to the games' Vercel URL | Cleanest cutover; one HTML change only |
| Must | GitHub Actions CI gate (tsc + lint + test + playwright + build) per affected package | Nothing red ships |
| Should | Synthesized Web Audio sound (per Bias Breaker pattern) | Game feel; no asset bloat |
| Should | Animated tweens + particles for celebrations | Polish |
| Should | Visual regression snapshots (Playwright `expect(page).toHaveScreenshot()`) | Catches the class of bugs vanilla missed |
| Should | Per-game perf budget enforced in CI | Chromebook 60fps target |
| Should | `multi-frontend` multi-model workflow for UI-heavy iterations | Speed dividend |
| Should | A tiny "all-games" Vercel root index page (a launcher landing) | Booth fallback if a kid lands on the root |
| Could | Storybook-style scene browser per game | Component-level iteration for Mishika's team |
| Could | Service worker for offline booth play | Edge case; finals booth likely online |
| Could | Per-game custom paths / branded subdomains | Marketing only |
| Won't | Backend, auth, leaderboards, multiplayer | Out of scope |
| Won't | Mobile portrait, i18n, full WCAG audit | Out of scope |
| Won't | Audio asset libraries | Synth only |
| Won't | Changes to main AI Glitch Buster app beyond the one launcher link | Untouchable |
| Won't | Gameplay redesign of BB or BHH | Straight ports |

### MVP Scope

The smallest end-to-end validation: **Phase A (foundation) + Phase B (Bias Breaker rebuilt on the new stack, deployed, e2e green) + a tiny launcher cutover for BB only**. If one game makes it cleanly from `prp-prd` → preview URL → green Playwright → reviewed → production, the pipeline is validated. The rest is mechanical replay on the same pipeline.

### User Flow (the agentic per-island build loop)

```
prp-prd        → island PRD with phases
prp-plan       → Phase 1 plan with Phaser/TS patterns captured
prp-implement  → write code, tsc, vitest, commit per task
gan-design     → agent screenshots the Vercel preview, evaluator scores, iterates
e2e-runner     → Playwright runs the game-flow happy path
code-review    → reviewer agent reads the diff
vercel:deploy  → preview URL on every commit; production on main
learn          → capture patterns as ECC instincts for the next island
```

---

## Technical Approach

**Feasibility**: **HIGH** — every component is well-trodden; no novel tech.

### Architecture Notes (the decisions already baked in)

- **Workspace tool**: pnpm — lightest monorepo, Vercel-native
- **Per-game shape**: standalone Vite project with `package.json`, `tsconfig.json`, `vite.config.ts`, `src/{scenes,entities,systems}`, `tests/{unit,e2e}`, `public/`
- **Shared package** (`games/_shared`): TypeScript module — typed quiz banks (forked from `index.html`), profile/localStorage SDK (typed wrapper over `gg.profile`), theme tokens, shared types
- **Routing**: Single Vercel project, monorepo. Paths: `/bias-breaker/`, `/habit-harbor/`, `/privacy-vault/`, `/reality-tower/`, `/the-core/`. Root `/` serves an optional all-games launcher.
- **CI gate** (GitHub Actions, per affected package): `pnpm -F <pkg> typecheck && lint && test && build && e2e`
- **Test seam** for Playwright: in dev/preview builds, expose `window.__GAME__` with current scene + state for assertions; stripped from production via Vite env flag
- **Profile portability**: all games share the `glitch-guardians.vercel.app` origin → shared `localStorage.gg.profile` → progression works across games without any sync code
- **Main app launcher cutover** (the only allowed app change): replace `<button id="gg-launch-button" onclick="GG.start()">` with `<a href="https://glitch-guardians.vercel.app/" id="gg-launch-button">` (one line)
- **Legacy code**: existing `GAME/` folder moves to `legacy/` for reference until all 5 are cut over, then deleted

### Technical Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Vercel monorepo first-time setup (ignored builds, base paths, per-package output) | M | Phase A dedicated to it; standard documented `vercel.json` + `ignoreCommand` per package |
| Feature parity for Bias Breaker (carrier flyer, tortoise, lava, refresh-persist — heavily iterated through v13) | M-H | Use the vanilla version as the spec; mechanic-by-mechanic port; per-mechanic Vitest + Playwright |
| Bad-Habit Harbor Phase 4 (win/celebration/stars/unlock) — never built in vanilla, has to land in the Phaser rebuild | M | Build fresh in Phaser, where Scenes/Tweens/particles make this *easier* than vanilla would have been |
| Playwright + Phaser test seam (`window.__GAME__`) leaking into production | L | Vite env flag (`import.meta.env.PROD`) strips it; CI snapshot guards it |
| Chromebook perf with Phaser WebGL | L | Phaser auto-falls-back to Canvas2D on weak GPUs; ≤1MB JS / ≤2MB asset budget |
| Mishika's TypeScript ramp | L | Read-only types as documentation; no advanced patterns; pair-read with Claude same as JS |
| Drift between forked `quizData.ts` and the main app's inline copy | L | Snapshot test in CI that diffs the two; convention "edit both in one commit" surfaces in code review |
| Time cost of rebuilding shipped games (BB + BHH) before any new island ships | M | Accepted trade-off per the phasing decision; mitigated by skipping vanilla BHH Phase 4 |

---

## Implementation Phases

<!--
  STATUS: pending | in-progress | complete
  PARALLEL: phases that can run concurrently (e.g., "with 3" or "-")
  DEPENDS: phases that must complete first (e.g., "1, 2" or "-")
  PRP: link to generated plan file once created
-->

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|
| 1 | Foundation | pnpm monorepo, Phaser 3 + TS + Vite scaffold, `_shared` package (forked quizData + profile SDK + theme), Vitest + Playwright + ESLint + tsc, GitHub Actions CI, Vercel project + monorepo settings, "Hello Glitch Guardians!" Phaser scene deployed to a preview URL | complete | - | - | `.claude/PRPs/plans/completed/glitch-guardians-migration-phase-1-foundation.plan.md` |
| 2 | Bias Breaker rebuild | Port mechanic-for-mechanic from `GAME/screens/bias-breaker*.js`: avatar, platforms, carrier flyer, lava, tortoise, dwell-confirm, banner/HUD, refresh-persist, celebration, time/score stars. Vitest for question pool + state; Playwright happy-path (start → answer correct → reach door → celebration → unlock) | complete | - | 1 | `.claude/PRPs/plans/completed/glitch-guardians-migration-phase-2-bias-breaker.plan.md` (+ report) |
| 3 | Bad-Habit Harbor rebuild | Port from `GAME/screens/habit-harbor*.js`: maze model (linear-chain solvability), D-pad + keyboard, top-down movement + per-axis collision, drive-into-bot quiz modal, rescue + gate-open, HUD, banner. **Plus** the never-built win-at-exit → celebration → time-based stars → unlock Privacy Vault (was vanilla Phase 4). Vitest + Playwright. | in-progress | - | 2 | `.claude/PRPs/plans/glitch-guardians-migration-phase-3-bad-habit-harbor.plan.md` |
| 4 | Main app link cutover + all-games launcher | One-line HTML change in `index.html`: `<button id="gg-launch-button" onclick="GG.start()">` → `<a href="https://glitch-guardians.vercel.app/">`. Optional all-games landing page at Vercel root listing all five islands with their unlock state read from `localStorage.gg.profile`. Smoke test main app for zero regression. | pending | - | 3 | - |
| 5 | Privacy Vault (new) | New island: stealth/timing — patrol-bot sprites with line-of-sight cones, slip past to shut down each leak, quiz at each junction. Full ECC pipeline. | pending | - | 4 | - |
| 6 | Hallucination Tower (new) | New island: vertical platformer with shifting/fake platforms; the "spot the fake info" mechanic gates each ascent. Full ECC pipeline. | pending | - | 5 | - |
| 7 | The Core (new — finale) | Combines mechanics from BB / BHH / PV / HT into a final escape-room sequence. Boss-tier quiz set drawn from all four banks. | pending | - | 6 | - |
| 8 | Booth QA + dry run | Chromebook perf pass; full 5-island playthrough; visual snapshot review; offline-capable check; finals demo script. | pending | - | 7 | - |

### Phase Details

**Phase 1: Foundation**
- **Goal**: Empty-but-real monorepo with one game stub deploying live; the whole agentic pipeline working.
- **Scope**: `pnpm-workspace.yaml`; `games/_shared` with forked typed `quizData`, profile SDK, theme; one game (`games/bias-breaker/`) scaffolded from a Phaser+TS+Vite template with a "Hello" scene; Vitest config; Playwright config (browsers cached); ESLint + Prettier; `tsconfig.json` per package; root `tsconfig.base.json`; GitHub Actions workflow that runs `pnpm -F ... typecheck && lint && test && build && e2e` on affected packages; `vercel.json` with monorepo settings; first Vercel deploy succeeds at `glitch-guardians.vercel.app/bias-breaker/`. Open-question lock-ins (starter template, CI choice, theme format).
- **Success signal**: pushing a commit triggers GitHub Actions (all green) and a Vercel preview URL; opening the URL shows the Phaser "Hello" scene.

**Phase 2: Bias Breaker rebuild**
- **Goal**: Bias Breaker at vanilla v13.3 feature parity, on the new stack, with green e2e in CI.
- **Scope**: Port the avatar (SVG → Phaser sprite or scene-tinted graphics), platform sections, carrier flyer (with the v13.3 snap fix), lava fall + respawn (with the v13.2 NaN-free reset), tortoise mini-enemy + stomp, dwell-confirm flyer mechanic, HUD (sections, timer, score), banner, refresh-persist via the shared profile SDK, time-based 3-tier stars, celebration with confetti, `markIslandCleared('bias-breaker', stars)` + unlock. Vitest: question pool sanity, maze/section count, state machine. Playwright: happy-path (load → answer all 5 → celebration → unlock state in profile).
- **Success signal**: side-by-side parity with `legacy/GAME/screens/bias-breaker*.js`; 18+ tests green; Playwright happy-path green.

**Phase 3: Bad-Habit Harbor rebuild**
- **Goal**: Bad-Habit Harbor at vanilla Phase-3 parity *plus* the never-built Phase 4 win/celebration/stars/unlock.
- **Scope**: Re-encode the 15×9 maze model + `validateSolvable()` in TS; D-pad + keyboard input as a Phaser plugin; top-down 4-direction movement + per-axis wall collision; drive-into-bot quiz modal (using the shared question shuffler); rescue + state.openGates + happy-bot rendering; HUD (rescued + timer paused-during-quiz); banner; **new win sequence**: drive into the harbor-mouth exit → celebration scene → time-based stars (with the current 90/120/+ tiers) → `markIslandCleared('habit-harbor', stars)` → Privacy Vault unlock. Vitest: maze solvability + isWall + toChoices. Playwright: happy-path (rescue all 5 → exit → celebration → unlock).
- **Success signal**: full end-to-end playthrough; 21+ tests green; the Phase-4 win/celebration finally exists.

**Phase 4: Main app link cutover + all-games launcher**
- **Goal**: The main AI Glitch Buster app's launcher now points at the deployed games; no other change to the main app.
- **Scope**: Edit `index.html`: replace the launcher button with an anchor (`<a href="https://glitch-guardians.vercel.app/">`). Build a minimal all-games landing page (Vite static at the Vercel root) that lists the 5 islands with locked/unlocked state read from `localStorage.gg.profile`. Smoke test main app's existing features (quiz, badges) for zero regression. Delete `GAME/` (now in `legacy/`).
- **Success signal**: Clicking the main app's launcher opens the all-games page; clicking an island opens the game; backing out works; main app's other features identical to before.

**Phase 5: Privacy Vault (new)**
- **Goal**: First *new* island built end-to-end on the matured pipeline.
- **Scope**: A stealth mechanic — patrol-bot sprites moving on tweened paths with cone-of-vision detection, leak "terminals" the player approaches to shut them down via quiz, multiple short rooms. Uses `quizData["privacy"]`. Full ECC pipeline.
- **Success signal**: PRP-PRD for the game → plan → implement → preview URL → green e2e; unlock chain advances.

**Phase 6: Hallucination Tower (new)**
- **Goal**: Vertical-platformer island.
- **Scope**: Climbing mechanic — vertical scrolling, real-vs-fake platforms (the "hallucination" pillar in gameplay form), quiz at each tier. Uses `quizData["hallucination"]`. Full ECC pipeline.
- **Success signal**: Same as Phase 5, applied to the new mechanic.

**Phase 7: The Core (new — finale)**
- **Goal**: Combined-mechanics escape-room finale.
- **Scope**: Sequence combining the previous mechanics in short rooms; a final boss-tier quiz set sampled from all four banks; the "you healed Datapolis" arc payoff.
- **Success signal**: Final unlock state, end-of-game story screen, Vercel production deploy.

**Phase 8: Booth QA + dry run**
- **Goal**: Demonstrate the slate works at booth quality.
- **Scope**: Chromebook hardware pass at 60fps for each game; full 5-island playthrough on multiple browsers; visual snapshot review; offline-capable smoke (turn off WiFi at the booth, play); finals demo script for the team.
- **Success signal**: Green on all of the above; team ready to demo.

### Parallelism Notes

The phases are intentionally linear — each `prp-prd` → `prp-plan` → `prp-implement` cycle consumes context that benefits the next. Within a phase, Claude can parallelize per-task work via `multi-frontend`. Phases 2 and 3 could in theory run in parallel after Phase 1 (independent packages) but the realistic build pace (one game at a time with a single human reviewer) keeps them sequential. Phases 5–7 likewise depend on Phase 4 cleanly cutting over the launcher.

---

## Decisions Log

| Decision | Choice | Alternatives | Rationale |
|----------|--------|--------------|-----------|
| Game engine | Phaser 3 | Vanilla canvas (continue); PixiJS; Three.js; Godot HTML5; Unity WebGL | Real 2D engine, scenes/sprites/physics/tweens out of the box, CDN/npm install, kid-readable API, well-suited to the next 3 islands |
| Language | TypeScript | Plain JavaScript | Types are the agent's compass; doubles as documentation; mild ramp for Mishika |
| Bundler / dev server | Vite | Webpack, esbuild, Parcel | Sub-100ms HMR; Vitest pairs natively |
| Test runner | Vitest | Jest, Mocha | Vite-native, Jest-compatible API, fast |
| E2E | Playwright | Cypress | Already integrated with ECC's `e2e-runner` and `gan-design`; screenshot APIs |
| Linter | ESLint + Prettier | Biome | Familiar; broad ecosystem; agents handle it well |
| Monorepo tool | pnpm workspaces | Nx, Turborepo, Yarn workspaces | Lightest setup, Vercel-native, no extra abstractions |
| Deploy host | Vercel | Netlify, Cloudflare Pages, GitHub Pages | ECC has a Vercel plugin; preview URLs per branch; monorepo support; free Hobby tier sufficient |
| Vercel topology | Single monorepo project, path routing | One project per game | Shared origin → shared `localStorage.gg.profile` → progression works without sync code |
| CI provider | GitHub Actions (lean) | Vercel's checks alone, CircleCI | Familiar; same repo, fewer dashboards |
| Quiz data sourcing | (A) Fork to typed `_shared/quizData.ts` | (B) Runtime fetch from main app; (C) Codegen from `index.html` | User choice; self-contained for offline booth; main app untouched; small drift mitigated by a CI snapshot test |
| Migration order | (α) Foundation → rebuild shipped → new islands | (β) Foundation → new first → rebuild shipped last; (γ) Don't rebuild shipped at all before finals | User choice; validates pipeline on the most complex known-quantity game (BB); regressions caught against a known-good vanilla version |
| Shipped-game treatment | Rebuild in Phaser, mechanic-for-mechanic | Keep on vanilla and only do new islands in Phaser | User direction: stack consistency across all 5 islands; one pipeline to maintain |
| Vanilla BHH Phase 4 (win/celebration) | Skip; built fresh in Phase 3 (Phaser BHH rebuild) | Finish in vanilla first | Avoid throwaway work; Phaser scenes/tweens make the celebration *easier* than vanilla would have been |
| Main app changes | Exactly one line: launcher button → external link | Multi-line refactor; new "Games" tab | User direction: main app is frozen |
| Mobile portrait | Out of scope | Add responsive layout | Booth + desktop + tablet focus continues |

---

## Research Summary

**Market Context**
The `Phaser 3 + TypeScript + Vite` combo is a standard, well-documented stack — official starter templates exist on the Phaser organization's GitHub, and the pattern is widely used for HTML5 game competitions (Ludum Dare, js13kGames, GMTK Jam). Vercel monorepo deploys for game projects are well-trodden (used by indie web games and Phaser community examples). Playwright is the de-facto choice for browser-game e2e in 2026, with first-class support for headless WebGL and pixel-diff snapshots; the "expose `window.__GAME__`" test-seam pattern is the community standard. No novel tooling or experimental tech in this plan.

**Technical Context (codebase grounding)**
Direct findings from this codebase:
- `index.html` (lines 1878–2468 for `quizData["bad-habits"]`, similar blocks for the other 3 banks) — the 240 questions to fork into `_shared`.
- `index.html` launcher button (the `gg-launch-button` element wired to `GG.start()` in `GAME/glitch-guardians.js:5–18`) — the one allowed change.
- `GAME/state.js` — the `gg.profile` localStorage schema (5-island progression, unlock ordering); re-encoded in the typed shared profile SDK.
- `GAME/screens/bias-breaker*.js` — vanilla v13.3 mechanics to port; 1900+ lines, all hand-rolled.
- `GAME/screens/habit-harbor*.js` — vanilla Phase-3 mechanics; 700+ lines after this session.
- `GAME/screens/habit-harbor-maze.js` — `validateSolvable()` linear-chain solvability invariant; ports directly to TS.
- `.claude/PRPs/prds/bad-habit-harbor.prd.md` + the archived plans — historical reference for the BHH gameplay design (used during the rebuild, not re-decided).
- `.claude/PRPs/plans/completed/` — Phase 1, 2, 3 plans archived; structural blueprint for how each new game's PRP cycle should look.
- ECC skills installed and ready: `prp-prd`, `prp-plan`, `prp-implement`, `gan-design`, `gan-build`, `e2e-runner`, `code-review`, `santa-loop`, `multi-frontend`, `vercel:deploy`, `vercel:bootstrap`, `vercel:env`, `learn`.

---

*Generated: 2026-05-28*
*Status: DRAFT — needs user review*
