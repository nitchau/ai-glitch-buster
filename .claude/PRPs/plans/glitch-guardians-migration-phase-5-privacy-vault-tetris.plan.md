# Plan: Glitch Guardians — Phase 5 (Privacy Vault → quiz-gated Tetris)

> Supersedes the abandoned stealth plan (`completed/…-ABANDONED-stealth.plan.md`).
> Pivot reason: the procedural stealth art (hooded guard, vision cones) read as
> low-fidelity. Tetris is geometry-native and renders cleanly from the same API.

## Summary
An old-school **Tetris** for the `privacy-vaults` island. Each tetromino spawns
**locked**; the player must answer a **privacy** question to earn control of that
piece (move / rotate / drop). Clear **8 lines** to "fill the vault" →
CelebrationScene → unlock 🗼 Hallucination Tower. **Clean-modern** visuals:
soft-shadowed rounded pastel tiles, a light board, subtle grid, gentle line-clear.
Reuse the `privacy-vaults` package plumbing + shared QuizModal / CelebrationScene /
Hud / Banner; strip all stealth gameplay & art.

## User Story
As a kid at the booth, I want a calm, good-looking Tetris where I answer privacy
questions to steer each block, so I learn to handle private data while having fun.

## Design (locked with user, 2026-06-04)
- **Quiz gate = unlock-per-block.** A new piece spawns locked and auto-drifts down
  slowly while a privacy question shows. Correct → full control of *that* piece.
  Wrong → it keeps gently falling on autopilot (player may keep answering to grab
  control before it lands). No lives, no game-over.
- **Win = clear 8 lines** → unlock Hallucination Tower.
- **Visual = clean modern** (soft shadows, rounded pastel tiles, minimal — NOT neon).

## Metadata
- Complexity: **Large** (new game: pure model + render + quiz-gate state machine; ~14 files, much reused).
- Island id `privacy-vaults` · package `privacy-vaults` · base `/privacy-vaults/` · dev port 5175.
- Source PRD: `.claude/PRPs/prds/glitch-guardians-migration.prd.md` (Phase 5).

---

## KEEP (from the existing privacy-vaults scaffold)
- `package.json`, `vite/tsconfig/vitest/playwright` config, `index.html`, `main.ts`, `PreloadScene` (boots GameScene).
- `@gg/shared`: `pickN('privacy', n)`, `toChoices`, `markIslandCleared('privacy-vaults')` → unlocks `reality-tower`, `Question`.
- Copy in from **habit-harbor** (relabel): `ui/QuizModal.ts`, `scenes/CelebrationScene.ts`, `ui/Hud.ts`, `ui/Banner.ts`, `scoring.ts`, plus the `RENDER_SCALE` / `TEXT_RES` / `STAR_TIME_*` constants pattern + camera supersample.

## TRASH (delete)
- `src/vault.ts`, `src/entities/Guardian.ts`, the stealth `src/scenes/GameScene.ts`, `tests/unit/vault.test.ts`.
  (PatrolBot / vision cones were never built.)

## NEW files
- `src/tetris.ts` — **pure model** (grid, 7 tetrominoes, gravity/collision, matrix rotation + wall-kick, line-clear, 7-bag). No Phaser.
- `src/constants.ts` — rewritten for Tetris (grid dims, cell, supersample, gravity speeds, lock delay, `LINES_TO_WIN=8`, pastel palette, board theme).
- `src/scenes/GameScene.ts` — rewritten: clean-modern render + controls + gravity + line-clear + ghost + Next + the quiz-gate.
- `tests/unit/tetris.test.ts`, `tests/unit/scoring.test.ts`, `tests/e2e/happy-path.spec.ts`.

---

## Pure model — `tetris.ts` (the tested heart)
- `COLS=10`, `ROWS=20`; `Grid = number[][]` (0 empty, else colour id 1..7).
- `SHAPES` — spawn-orientation matrices per piece (I 4×4, O 2×2, rest 3×3). Rotation = matrix rotate, so SHAPES is the only shape source.
- `spawn(id)` — centred at top, fully visible (top filled row at grid row 0).
- `cells(piece)` — world cells of filled matrix entries.
- `collides(grid, piece)` — off sides/floor or overlaps a filled cell (r<0 above the board is allowed).
- `merge(grid, piece)` — lock into a NEW grid (no mutation).
- `clearLines(grid)` → `{ grid, cleared }` (drop rows above).
- `move(grid, piece, dx, dy)` → moved piece or `null`.
- `rotate(grid, piece, dir)` → rotated piece with simple wall-kick (offsets `0,-1,1,-2,2`) or `null`.
- `dropPosition(grid, piece)` — rest position (ghost + hard drop).
- `SevenBag(rand=Math.random)` — every bag is a shuffled permutation of all seven (fair distribution; injectable RNG for tests).

## Render — clean modern (`GameScene`)
- Supersample: canvas ×`RENDER_SCALE`, `camera.setZoom + centerOn`; UI in logical coords, scrollFactor 1 (NOT 0 under zoom); text `resolution: TEXT_RES`.
- Board: light panel (`#eef1f8`) rounded-rect, soft outer shadow, faint gridlines (`#e1e6f1`); side rail for "Next" + "Lines x/8" + a calm progress bar.
- Tile: rounded rect (`r≈CELL*0.18`), **pastel** fill per id, soft drop-shadow (offset darker rounded rect) + subtle top highlight. Muted palette (e.g. I cyan, O butter, T lilac, S mint, Z coral, J sky, L peach).
- Ghost piece: ~16% alpha at landing position. Line clear: rows flash white → quick collapse/fade (~260 ms) → settle; soft particle puff.

## Quiz gate (state machine)
- Spawn → `locked=true`, gravity SLOW (~1 cell / 1.1 s), input ignored; `QuizModal` with `pickN('privacy',1)`.
- Correct → `locked=false`: normal gravity + control (`← →`, rotate, `↓` soft, `Space` hard) with lock-delay.
- Wrong → gentle banner ("Autopilot! 🤖"), piece keeps slow-falling locked; player may answer again to grab control before it lands.
- Lockdown → `merge` → `clearLines` → next piece (locked, new question).
- **Top-out** (fresh piece collides) → GENTLE: "Vault's full — tidying up!" clears the top, keeps lines-cleared progress; no game-over.

## Controls
- Keys: `← →` move · `↑`/`X` rotate CW · `Z` rotate CCW · `↓` soft drop · `Space` hard drop.
- Touch: D-pad (`◄ ► ▼`) + `⟳` rotate + `⤓` hard-drop.

## Win + unlock
- `lines ≥ 8` → CelebrationScene `{ stars by time, lines }` → `markIslandCleared('privacy-vaults', stars)` → unlocks `reality-tower`. Confetti + "🗼 Hallucination Tower unlocked!".

---

## Milestones
- **A — Looks & plays like Tetris.** Strip stealth; `tetris.ts` + unit tests; clean-modern render; controls; gravity; line-clear; ghost; Next preview. (Pieces freely controllable — gate comes next.) ✅ when typecheck/lint/test green AND in-browser it looks polished and plays.
- **B — Quiz gate.** Lock-per-piece + privacy `QuizModal` + unlock-on-correct + gentle wrong + gentle top-out + 🔒/🔓 HUD.
- **C — Win + celebration + juice.** 8-line win → CelebrationScene → unlock; scoring; line-clear particles; polish.
- **D — Tests + deploy + closeout.** `tetris`/`scoring` unit tests; seam-driven Playwright happy-path (force pieces, auto-answer, clear 8, assert celebration + `privacy-vaults.cleared` + `reality-tower.unlocked`); `assemble-dist` GAMES += `privacy-vaults`; `vercel.json`; landing `built:true`; CI e2e; report + PRD Phase 5 complete + archive + memory.

## Validation
```bash
pnpm -F privacy-vaults typecheck && pnpm -F privacy-vaults lint && pnpm -F privacy-vaults test
pnpm -F privacy-vaults build
pnpm -F bias-breaker build && pnpm -F habit-harbor build && pnpm -F privacy-vaults build && node scripts/assemble-dist.cjs
git diff --cached --name-only | grep -iE '\.pdf$|/dist/|node_modules'   # EXPECT empty (never stage the 4 root PDFs)
```

## NOT building
- No Hold queue, no T-spin scoring, no multiplayer, no escalating speed beyond gentle.
- No hard game-over (gentle top-out only). No deploy/push (org repo access still blocked).

## Risks
| Risk | L | I | Mitigation |
|---|---|---|---|
| Rotation / wall-kick edge cases | M | M | Pure-model unit tests + ghost piece |
| Quiz-gate pacing too slow/fast for kids | M | M | Tune locked gravity; allow re-answer; playtest |
| Fidelity still feels off | L | M | Clean-modern spec locked; verify in-browser at the END of Milestone A (early visual check) |
| Accidentally stage a root PDF | L | H | Stage only `games/privacy-vaults/**` paths; run leak-check before every commit |

## Notes
- Build forward: when Milestone A is ready, the commit deletes `vault.ts`/`Guardian.ts` and rewrites the scene — the stealth game is gone by replacement.
- Island id stays `privacy-vaults` (plural) to match ISLANDS + the landing link + the celebration copy.
