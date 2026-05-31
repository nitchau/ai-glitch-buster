# Plan: Migration Phase 1 — Foundation

## Summary
Stand up the entire agentic infrastructure for the Glitch Guardians migration:
a pnpm monorepo with a typed `_shared` package (profile SDK + theme + forked
quizData), a first `games/bias-breaker/` package scaffolded as a Phaser 3 + TS
+ Vite "Hello" scene, Vitest + Playwright + ESLint + Prettier + tsc per
package, GitHub Actions CI that gates every push, and a Vercel monorepo
project that deploys to a preview URL on every commit. No gameplay code yet —
the bar is *pipeline works end-to-end*.

## User Story
As Nitin driving the migration, I want a working monorepo + CI + Vercel
preview deploys with a "Hello Phaser" scene, so that every subsequent game
phase (BB rebuild, BHH rebuild, PV/HT/Core fresh builds) plugs into a proven
pipeline instead of re-litigating infrastructure each time.

## Problem → Solution
A flat vanilla project with no build, types, tests, or preview URL → an
opinionated pnpm + Phaser/TS/Vite monorepo deployed to Vercel with full
CI gates and the ECC pipeline ready for `gan-design` / `e2e-runner` /
`vercel:deploy`.

## Metadata
- **Complexity**: Large
- **Source PRD**: `.claude/PRPs/prds/glitch-guardians-migration.prd.md`
- **PRD Phase**: Phase 1 — Foundation
- **Estimated Files**: ~25 new + 1 move (`GAME/` → `legacy/GAME/`)

---

## UX Design

### Before
```
ai-glitch-buster/
├── index.html              (main app — frozen)
├── GAME/                   (vanilla canvas games — referenced for ports)
└── .claude/                (PRPs, agents, skills)
```

### After
```
ai-glitch-buster/
├── index.html              (main app — STILL FROZEN)
├── legacy/GAME/            (moved; reference for mechanic-for-mechanic ports)
├── games/
│   ├── _shared/            (typed quizData + profile SDK + theme + types)
│   └── bias-breaker/       (Phaser+TS+Vite "Hello" scene; full game in Phase 2)
├── .github/workflows/ci.yml
├── package.json            (workspace root)
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── eslint.config.js
├── .prettierrc
├── vercel.json
└── .claude/                (unchanged)
```

### Interaction Changes (developer-experience)
| Touchpoint | Before | After |
|---|---|---|
| Run a game locally | open `index.html`, click launcher | `pnpm -F bias-breaker dev` → HMR at `http://localhost:5173/` |
| Type errors | none surfaced | `pnpm -F bias-breaker typecheck` |
| Unit tests | manual node harness | `pnpm -F bias-breaker test` (Vitest) |
| E2E | manual playtest | `pnpm -F bias-breaker e2e` (Playwright) |
| Deploy | n/a | `git push` → Vercel preview URL auto-builds |

---

## Mandatory Reading

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 | `.claude/PRPs/prds/glitch-guardians-migration.prd.md` | all | The PRD's Phase 1 scope + decisions log + open questions to lock in |
| P0 | `GAME/state.js` | 1–93 | The vanilla profile SDK to port to TS (verbatim shape) |
| P1 | `index.html` | 671 + 1274 + 1876 + 2478 (bank starts) | Quiz banks to fork into `_shared/src/quizData.ts` |
| P1 | `GAME/screens/bias-breaker-questions.js` | 1–71 | The fallback-shape pattern (the new `_shared` package needs no fallback — direct typed import) |
| P2 | `CLAUDE.md` | all | Project conventions (commits direct to main; opus; etc.) |

## External Documentation

| Topic | Source | Key Takeaway |
|---|---|---|
| pnpm workspaces | https://pnpm.io/workspaces | `pnpm-workspace.yaml` lists package globs; `workspace:*` dep protocol |
| Vite + Phaser quickstart | https://github.com/phaserjs/template-vite-ts | Official Phaser+TS+Vite template structure (we adapt, not fork wholesale) |
| Vite config | https://vitejs.dev/config/ | `base` for subpath deploys; `build.outDir` |
| Vitest | https://vitest.dev/config/ | Extends Vite config; `test:` block; jsdom for DOM tests |
| Playwright | https://playwright.dev/docs/test-configuration | `webServer` auto-starts the dev server during tests |
| ESLint flat config | https://eslint.org/docs/latest/use/configure/configuration-files | `eslint.config.js` (not legacy `.eslintrc`) |
| GitHub Actions + pnpm | https://github.com/pnpm/action-setup | `pnpm/action-setup` + `setup-node` with `cache: 'pnpm'` |
| Vercel monorepo | https://vercel.com/docs/monorepos | `vercel.json` with `installCommand` + `buildCommand` + `outputDirectory` |
| Phaser scene lifecycle | https://newdocs.phaser.io/docs/3.80.0/Phaser.Scene | `init() / preload() / create() / update()` |

---

## Patterns to Mirror

This phase is *greenfield* infrastructure — there are no internal codebase patterns to mirror because we're creating the canonical ones. The "patterns" here are external (linked above) plus the conventions we lock in now for all future packages.

### PACKAGE_JSON_PATTERN (per game)
```jsonc
// games/<name>/package.json
{
  "name": "@gg/<name>",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "lint": "eslint src tests",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test",
    "e2e:ui": "playwright test --ui"
  },
  "dependencies": {
    "phaser": "^3.80.0",
    "@gg/shared": "workspace:*"
  },
  "devDependencies": {
    "vite": "^5.4.0",
    "vitest": "^2.0.0",
    "@playwright/test": "^1.47.0",
    "typescript": "^5.5.0",
    "@types/node": "^22.0.0",
    "jsdom": "^25.0.0"
  }
}
```

### VITE_CONFIG_PATTERN
```ts
// games/<name>/vite.config.ts
import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  base: '/<name>/',           // subpath when deployed under that segment
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  server: { port: 5173, open: true },
  build: { outDir: 'dist', sourcemap: true, target: 'es2020' },
  define: {
    __TEST_SEAM__: JSON.stringify(process.env.NODE_ENV !== 'production'),
  },
});
```

### VITEST_CONFIG_PATTERN
```ts
// games/<name>/vitest.config.ts
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

export default mergeConfig(viteConfig, defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['tests/unit/**/*.test.ts'],
    coverage: { reporter: ['text', 'html'] },
  },
}));
```

### PLAYWRIGHT_CONFIG_PATTERN
```ts
// games/<name>/playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

### TEST_SEAM_PATTERN
```ts
// games/<name>/src/main.ts
// Expose game state ONLY in non-production builds so Playwright can assert.
if (__TEST_SEAM__) {
  (window as unknown as { __GAME__: Phaser.Game }).__GAME__ = game;
}
```

### SCENE_PATTERN
```ts
// games/<name>/src/scenes/HelloScene.ts
import Phaser from 'phaser';

export class HelloScene extends Phaser.Scene {
  constructor() { super('HelloScene'); }
  create(): void {
    const { width, height } = this.scale;
    this.add.text(width / 2, height / 2, 'Hello Glitch Guardians!', {
      fontFamily: 'Arial Black, sans-serif',
      fontSize: '56px',
      color: '#43e97b',
    }).setOrigin(0.5).setShadow(0, 4, '#000', 8, true, true);
  }
}
```

---

## Files to Change

| File | Action | Justification |
|---|---|---|
| `GAME/` → `legacy/GAME/` | RENAME (git mv) | Preserve vanilla as the porting reference; clear the namespace |
| `package.json` (root) | CREATE | Workspace root + dev tooling |
| `pnpm-workspace.yaml` | CREATE | Declare the `games/*` workspace |
| `tsconfig.base.json` | CREATE | Shared compiler options |
| `eslint.config.js` | CREATE | Flat-config ESLint at repo root |
| `.prettierrc` + `.prettierignore` | CREATE | Format rules |
| `.editorconfig` | CREATE | Cross-IDE consistency |
| `.gitignore` (additions) | UPDATE | `node_modules/`, `dist/`, `coverage/`, `playwright-report/`, `.vercel/` |
| `.nvmrc` | CREATE | Lock Node version (22 LTS) |
| `vercel.json` | CREATE | Monorepo build + route config |
| `.github/workflows/ci.yml` | CREATE | per-package CI gate |
| `games/_shared/package.json` | CREATE | Shared package manifest |
| `games/_shared/tsconfig.json` | CREATE | Per-package TS config |
| `games/_shared/src/types.ts` | CREATE | `Question`, `BankId`, `IslandId`, `GradeBand`, `Profile`, `IslandProgress` |
| `games/_shared/src/theme.ts` | CREATE | Theme tokens (colors, fonts, spacing) |
| `games/_shared/src/profile.ts` | CREATE | Typed port of `GAME/state.js` (load/save/markIslandCleared/etc.) |
| `games/_shared/src/quizData.ts` | CREATE | Forked typed quiz banks (extracted from `index.html`) |
| `games/_shared/src/index.ts` | CREATE | Barrel export |
| `games/_shared/tests/unit/*.test.ts` | CREATE | Tests for profile SDK + quizData structure |
| `games/_shared/vitest.config.ts` | CREATE | Test runner config |
| `games/bias-breaker/package.json` | CREATE | First game manifest |
| `games/bias-breaker/tsconfig.json` | CREATE | Per-package TS |
| `games/bias-breaker/vite.config.ts` | CREATE | Vite + base path |
| `games/bias-breaker/vitest.config.ts` | CREATE | Vitest |
| `games/bias-breaker/playwright.config.ts` | CREATE | Playwright |
| `games/bias-breaker/index.html` | CREATE | Vite entry HTML |
| `games/bias-breaker/src/main.ts` | CREATE | Phaser.Game bootstrap |
| `games/bias-breaker/src/scenes/HelloScene.ts` | CREATE | First scene |
| `games/bias-breaker/tests/unit/sanity.test.ts` | CREATE | Trivial unit test importing from `@gg/shared` |
| `games/bias-breaker/tests/e2e/hello.spec.ts` | CREATE | Asserts the Phaser game boots + the scene renders |
| `games/bias-breaker/public/` | CREATE | Empty for now (favicon later) |
| `README.md` | UPDATE | New monorepo orientation block |

## NOT Building (Phase 1)
- **Any Bias Breaker gameplay** — Phase 2.
- **Habit Harbor / Privacy Vault / Hallucination Tower / The Core packages** — Phases 3, 5, 6, 7.
- **The main app launcher link cutover** — Phase 4 (the main `index.html` stays untouched in Phase 1).
- **Visual polish, asset pipeline, sounds, particles, theme expansion** — all later phases.
- **Multi-game build orchestration** — only one game exists in Phase 1; revisit in Phase 4.

---

## Step-by-Step Tasks

### Task 1: Snapshot vanilla code as `legacy/`
- **ACTION**: `git mv GAME legacy/GAME` so the vanilla code becomes the porting reference (still readable, not mistaken for live code).
- **IMPLEMENT**: `mkdir -p legacy && git mv GAME legacy/GAME`. Commit.
- **MIRROR**: n/a (one-time housekeeping).
- **GOTCHA**: `git mv` not `mv` so history is preserved. The main app's `index.html` still references `GAME/` paths — **do not** edit `index.html` (the launcher won't work locally during the migration; that's expected and gets fixed in Phase 4). Document the temporary "in-app launcher broken until Phase 4" in the commit message.
- **VALIDATE**: `git status` shows the rename; `legacy/GAME/screens/bias-breaker.js` exists.

### Task 2: Workspace root setup
- **ACTION**: Create the four root files that make this a pnpm monorepo.
- **IMPLEMENT**:
  - `pnpm-workspace.yaml`:
    ```yaml
    packages:
      - 'games/*'
    ```
  - `package.json` (root):
    ```jsonc
    {
      "name": "glitch-guardians",
      "private": true,
      "version": "0.0.0",
      "type": "module",
      "packageManager": "pnpm@9.12.0",
      "engines": { "node": ">=22" },
      "scripts": {
        "typecheck": "pnpm -r typecheck",
        "lint": "pnpm -r lint",
        "test": "pnpm -r test",
        "build": "pnpm -r --filter='./games/*' --filter='!./games/_shared' build",
        "e2e": "pnpm -F bias-breaker e2e",
        "format": "prettier --write ."
      },
      "devDependencies": {
        "typescript": "^5.5.0",
        "eslint": "^9.11.0",
        "@typescript-eslint/eslint-plugin": "^8.6.0",
        "@typescript-eslint/parser": "^8.6.0",
        "prettier": "^3.3.3"
      }
    }
    ```
  - `.nvmrc`: `22`
  - `.editorconfig`:
    ```
    root = true
    [*]
    indent_style = space
    indent_size = 2
    end_of_line = lf
    charset = utf-8
    trim_trailing_whitespace = true
    insert_final_newline = true
    ```
- **GOTCHA**: `packageManager` field is critical for Vercel + Corepack — without it, Vercel installs the wrong pnpm version. Pin to a specific 9.x.
- **VALIDATE**: `pnpm install` succeeds from root (will currently install nothing into workspace packages — that's expected; just validates the manifest).

### Task 3: Shared TypeScript + ESLint + Prettier config
- **ACTION**: Create the shared dev-tooling configs that every package extends.
- **IMPLEMENT**:
  - `tsconfig.base.json`:
    ```jsonc
    {
      "compilerOptions": {
        "target": "ES2022",
        "module": "ESNext",
        "moduleResolution": "bundler",
        "strict": true,
        "exactOptionalPropertyTypes": false,
        "noUncheckedIndexedAccess": true,
        "skipLibCheck": true,
        "esModuleInterop": true,
        "resolveJsonModule": true,
        "isolatedModules": true,
        "useDefineForClassFields": true,
        "forceConsistentCasingInFileNames": true,
        "lib": ["ES2022", "DOM", "DOM.Iterable"]
      }
    }
    ```
  - `eslint.config.js` (flat config):
    ```js
    import tseslint from '@typescript-eslint/eslint-plugin';
    import tsparser from '@typescript-eslint/parser';

    export default [
      {
        files: ['**/*.{ts,tsx}'],
        languageOptions: { parser: tsparser, parserOptions: { project: false } },
        plugins: { '@typescript-eslint': tseslint },
        rules: {
          '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
          '@typescript-eslint/no-explicit-any': 'warn',
          'no-console': ['warn', { allow: ['warn', 'error'] }],
        },
      },
      { ignores: ['**/dist/**', '**/node_modules/**', 'legacy/**', '.vercel/**'] },
    ];
    ```
  - `.prettierrc`:
    ```json
    {
      "semi": true,
      "singleQuote": true,
      "trailingComma": "es5",
      "printWidth": 100,
      "tabWidth": 2,
      "arrowParens": "always"
    }
    ```
  - `.prettierignore`:
    ```
    dist/
    node_modules/
    legacy/
    .vercel/
    coverage/
    playwright-report/
    *.html
    *.md
    ```
  - `.gitignore` (append):
    ```
    node_modules/
    dist/
    coverage/
    playwright-report/
    .vercel/
    *.log
    ```
- **GOTCHA**: ESLint flat config (`eslint.config.js`) is required for ESLint 9; legacy `.eslintrc` is silently ignored. Use `parserOptions: { project: false }` to keep typecheck fast — we run `tsc` separately.
- **VALIDATE**: `pnpm dlx eslint --print-config eslint.config.js` succeeds.

### Task 4: `_shared` package shell + types + theme
- **ACTION**: Create the shared package with `types.ts` and `theme.ts`.
- **IMPLEMENT**: as specified in PACKAGE_JSON_PATTERN above; types/theme code snippets baked into the Files-to-Change rows. See the actual content blocks at the head of this Patterns section.
- **MIRROR**: PACKAGE_JSON_PATTERN (subset).
- **GOTCHA**: Workspace TS source-import — Vite resolves `@gg/shared` straight to the `src/` files via the `main`/`exports` pointing at `./src/index.ts`. No build step needed for the shared package in development. (`pnpm typecheck` enforces correctness.)
- **VALIDATE**: `pnpm -F @gg/shared typecheck` is clean.

### Task 5: `_shared` profile SDK (typed port of `GAME/state.js`)
- **ACTION**: Port the vanilla profile SDK to TypeScript, preserving the schema and method semantics 1:1.
- **IMPLEMENT**: The full TS port lives at `games/_shared/src/profile.ts`. Functions to port verbatim from `GAME/state.js`: `blankProgress`, `isValidProfile`, `load`, `save`, `reset`, `isIslandUnlocked`, `newProfile`, `markIslandCleared`. The schema is `Profile = { name, gradeBand, createdAt, progress: Record<IslandId, IslandProgress> }`. Island order: `['bias-breaker','habit-harbor','privacy-vaults','reality-tower','the-core']`. Use the typed signatures from `_shared/src/types.ts`.
- **MIRROR**: `GAME/state.js:1–93` — same semantics, types added.
- **GOTCHA**: `noUncheckedIndexedAccess: true` (in `tsconfig.base.json`) means `ISLANDS[idx + 1]` is `T | undefined` — note the `!` assertion after the bounds check; alternative is a local variable + null check.
- **VALIDATE**: ported tests pass (Task 7).

### Task 6: `_shared` quizData fork from `index.html`
- **ACTION**: Extract the 4 quiz banks from `index.html` into a typed TS module.
- **IMPLEMENT**: Create `games/_shared/src/quizData.ts` with four exported arrays — `quizDataBias`, `quizDataBadHabits`, `quizDataPrivacy`, `quizDataHallucination` — each typed `: Question[]`. Copy each bank's question array **verbatim** from `index.html`:
  - hallucination ≈ line 672 onward
  - bias ≈ line 1274 onward
  - bad-habits ≈ line 1876 onward
  - privacy ≈ line 2478 onward
  Then export a `quizData: Record<BankId, Question[]>` map. Include `pickN(bankId, n)` and `toChoices(q)` helpers (ported from `bias-breaker-questions.js` + the `toChoices` added in BHH Phase 3).
- **MIRROR**: `GAME/screens/bias-breaker-questions.js:50-58` (pickN shuffle pattern) and `bias-breaker-questions.js`-derived `toChoices` from BHH Phase 3.
- **GOTCHA**: The hyphen in `"bad-habits"` is the bank ID; the variable name uses camelCase (`quizDataBadHabits`). The Record map keys preserve the hyphen. `options` is `readonly [string, string, string, string]` (4-tuple), not `string[]`.
- **VALIDATE**: structure test (Task 7): every question has 4 options, exactly one correct, all banks non-empty.

### Task 7: `_shared` Vitest config + tests
- **ACTION**: Wire Vitest and write tests for the profile SDK + quizData structure.
- **IMPLEMENT**:
  - `games/_shared/vitest.config.ts` exporting `defineConfig({ test: { environment: 'jsdom', globals: false, include: ['tests/unit/**/*.test.ts'] } })`.
  - `games/_shared/tests/unit/profile.test.ts`: 5 tests — `load() null on fresh storage`, `save+load round-trips`, `isIslandUnlocked('bias-breaker') true on fresh`, `markIslandCleared sets cleared+stars+unlocks next`, `markIslandCleared keeps best-of stars`.
  - `games/_shared/tests/unit/quizData.test.ts`: `it.each` over 4 banks asserting non-empty + well-formed (4 options, correct index 0-3, non-empty option strings); `pickN(5)` returns 5; `toChoices` returns 4 with exactly one `isCorrect`.
- **MIRROR**: TEST_STRUCTURE — `describe`/`it` blocks, `beforeEach(() => reset())` for state isolation.
- **GOTCHA**: `jsdom` provides `localStorage`. Tests reset storage between runs.
- **VALIDATE**: `pnpm -F @gg/shared test` is green (10 tests).

### Task 8: `games/bias-breaker/` scaffold + Phaser HelloScene
- **ACTION**: Stand up the first game package with a "Hello" Phaser scene.
- **IMPLEMENT**:
  - `games/bias-breaker/package.json` per PACKAGE_JSON_PATTERN
  - `games/bias-breaker/tsconfig.json` extending `../../tsconfig.base.json`, `outDir: './dist'`, `types: ['vite/client', 'node']`, including `src/**/*`, `tests/**/*`, `vite.config.ts`
  - `games/bias-breaker/vite.config.ts` per VITE_CONFIG_PATTERN with `base: '/bias-breaker/'`
  - `games/bias-breaker/index.html` — minimal HTML5, `<div id="game">`, `<script type="module" src="/src/main.ts">`, body styled to fill viewport with dark navy bg
  - `games/bias-breaker/src/main.ts` — `new Phaser.Game({ type: Phaser.AUTO, parent: 'game', backgroundColor: '#0a0820', scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: [HelloScene] })`; expose `window.__GAME__` only when `__TEST_SEAM__` is true
  - `games/bias-breaker/src/scenes/HelloScene.ts` per SCENE_PATTERN
- **MIRROR**: PACKAGE_JSON_PATTERN, VITE_CONFIG_PATTERN, SCENE_PATTERN, TEST_SEAM_PATTERN.
- **GOTCHA**: `type: Phaser.AUTO` lets Phaser pick WebGL with Canvas2D fallback (Chromebook-friendly). `Phaser.Scale.RESIZE` fills the viewport. `base: '/bias-breaker/'` makes the build deployable under that path on Vercel.
- **VALIDATE**: `pnpm -F bias-breaker dev` → `http://localhost:5173/` shows the green "Hello Glitch Guardians!" text centered.

### Task 9: First unit test in `bias-breaker` (sanity import from `_shared`)
- **ACTION**: Wire Vitest in the game package and write a trivial test that imports from `@gg/shared` (proving the workspace dep + types both work).
- **IMPLEMENT**:
  - `games/bias-breaker/vitest.config.ts` per VITEST_CONFIG_PATTERN
  - `games/bias-breaker/tests/unit/sanity.test.ts`: import `ISLANDS` and `theme` from `@gg/shared`; assert `ISLANDS` contains `'bias-breaker'` and `theme.colors.primary` equals `'#43e97b'`.
- **GOTCHA**: Vite resolves `@gg/shared` to `games/_shared/src/index.ts` via the workspace + `main` field. No build step needed.
- **VALIDATE**: `pnpm -F bias-breaker test` is green.

### Task 10: Playwright e2e — "Hello" renders
- **ACTION**: Add Playwright with one happy-path test asserting the game boots.
- **IMPLEMENT**:
  - `games/bias-breaker/playwright.config.ts` per PLAYWRIGHT_CONFIG_PATTERN
  - `games/bias-breaker/tests/e2e/hello.spec.ts`: capture page errors, `goto('/')`, `waitForFunction(() => Boolean(window.__GAME__))`, evaluate `window.__GAME__.scene.getScenes()[0].sys.settings.key`, expect `'HelloScene'`, expect no page errors.
- **GOTCHA**: `__TEST_SEAM__` is defined by `vite.config.ts`; in production builds (`NODE_ENV=production`), it's `false` and `window.__GAME__` is not set. Playwright runs against `pnpm dev`, so the seam is on.
- **VALIDATE**: `pnpm -F bias-breaker e2e` is green. The Playwright HTML report shows one passing test.

### Task 11: GitHub Actions CI
- **ACTION**: Add a workflow that gates every push/PR.
- **IMPLEMENT**: `.github/workflows/ci.yml` with one job `build-test` on `ubuntu-latest`: checkout, `pnpm/action-setup@v4` (v9), `setup-node@v4` (Node 22, `cache: 'pnpm'`), `pnpm install --frozen-lockfile`, then `pnpm -r typecheck`, `pnpm -r lint`, `pnpm -r test`, `pnpm -r --filter='!./games/_shared' build`, `pnpm -F bias-breaker exec playwright install --with-deps chromium`, `pnpm -F bias-breaker e2e`. On failure, upload `games/bias-breaker/playwright-report/` as an artifact.
- **GOTCHA**: `cache: 'pnpm'` requires `setup-node` to come AFTER `pnpm/action-setup` so Node knows pnpm exists. `--frozen-lockfile` ensures CI deps match the lockfile. The Playwright install step uses `--with-deps` for headless Chrome system deps.
- **VALIDATE**: push the commit; CI shows green; no Playwright artifact on success.

### Task 12: Vercel monorepo config + first deploy
- **ACTION**: Configure Vercel for the monorepo and trigger the first preview deploy.
- **IMPLEMENT**:
  - `vercel.json` (root): `{ installCommand: "pnpm install --frozen-lockfile", buildCommand: "pnpm -F bias-breaker build", outputDirectory: "games/bias-breaker/dist", rewrites: [{ source: "/bias-breaker/(.*)", destination: "/$1" }, { source: "/bias-breaker", destination: "/" }] }`
  - Connect via the ECC Vercel plugin: invoke `vercel:bootstrap` to link the GitHub repo to a new Vercel project (or use the Vercel CLI: `npx vercel link`).
  - Push to GitHub → Vercel automatically builds + deploys.
- **MIRROR**: external — https://vercel.com/docs/monorepos
- **GOTCHA**: For Phase 1 the deploy serves `bias-breaker` at BOTH `/` AND `/bias-breaker/*` (rewrite). When Phase 2/3 add more games, this config swaps to a multi-game build pipeline (one Vite build per game → unified `dist/`). Don't over-engineer for that now.
- **VALIDATE**: Vercel preview URL (printed in the GitHub PR check or Vercel dashboard) loads the "Hello Glitch Guardians!" scene with no console errors.

### Task 13: README orientation
- **ACTION**: Update `README.md` so future contributors (and future Claudes) understand the layout.
- **IMPLEMENT**: Replace the current placeholder `README.md` with a short orientation block describing: the two tiers (`index.html` main app frozen; `games/` Phaser monorepo; `legacy/GAME/` reference), the quick-start commands (`pnpm install`, `pnpm -F bias-breaker dev`, `test`, `e2e`, `typecheck`, `lint`), and a pointer to the migration PRD at `.claude/PRPs/prds/glitch-guardians-migration.prd.md`.
- **GOTCHA**: Don't promise deploy URLs in the README until Vercel actually returns one (rename in a follow-up).
- **VALIDATE**: `cat README.md` shows the orientation block.

---

## Testing Strategy

### Unit Tests (Vitest)
| Test | Where | Expected | Edge case? |
|---|---|---|---|
| `_shared` profile round-trip | `games/_shared/tests/unit/profile.test.ts` | save + load preserves all fields | Yes |
| `_shared` islands unlock chain | profile.test.ts | markIslandCleared('bias-breaker') unlocks 'habit-harbor' | Yes |
| `_shared` best-of stars | profile.test.ts | re-clearing with lower stars keeps the higher | Yes |
| `_shared` quiz banks well-formed | quizData.test.ts | 4 options, exactly one correct, non-empty | Yes |
| `_shared` toChoices | quizData.test.ts | 4 choices, exactly one isCorrect | Yes |
| `bias-breaker` workspace dep | sanity.test.ts | `@gg/shared` imports resolve | Yes |

### E2E (Playwright)
| Test | Where | Expected |
|---|---|---|
| Phaser game boots | `games/bias-breaker/tests/e2e/hello.spec.ts` | `window.__GAME__` exists; HelloScene is active; no page errors |

### Edge Cases Checklist
- [x] Fresh storage (no profile) → `load()` returns null
- [x] Corrupted profile JSON → `load()` returns null (not throwing)
- [x] Re-clear with lower stars → keeps higher
- [x] Test seam stripped from production build (verified by `pnpm build && grep __TEST_SEAM__ dist/assets/*.js` — should NOT appear as `true`)
- [ ] (Phase 2) Bias Breaker mechanics
- [ ] (Phase 3) BHH mechanics + win
- [ ] (Phase 4) Main app link cutover smoke test

---

## Validation Commands

### Static Analysis
```bash
pnpm install
pnpm -r typecheck
pnpm -r lint
```
EXPECT: zero errors.

### Unit Tests
```bash
pnpm -r test
```
EXPECT: ~10 tests green across `_shared` + `bias-breaker`.

### Build
```bash
pnpm -F bias-breaker build
```
EXPECT: `games/bias-breaker/dist/index.html` + bundled JS, no warnings.

### E2E
```bash
pnpm -F bias-breaker exec playwright install --with-deps chromium
pnpm -F bias-breaker e2e
```
EXPECT: 1 test green.

### Manual Validation
- [ ] `pnpm -F bias-breaker dev` → http://localhost:5173/ shows "Hello Glitch Guardians!" centered, green text on dark navy
- [ ] CI is green on the push
- [ ] Vercel preview URL (from the PR check) opens the scene
- [ ] No console errors on the preview URL
- [ ] `legacy/GAME/screens/bias-breaker.js` still readable as reference

---

## Acceptance Criteria
- [ ] All 13 tasks complete
- [ ] `pnpm -r typecheck && lint && test && build` is green
- [ ] Playwright e2e is green
- [ ] CI workflow runs and gates pushes
- [ ] Vercel preview URL serves the Phaser "Hello" scene
- [ ] No regression in the main app's existing behavior (smoke check `index.html` features still work — they will, since we didn't touch them; the in-app GG launcher won't work locally because `GAME/` moved, but that's expected and gets fixed in Phase 4)

## Completion Checklist
- [ ] Repo structure matches the "After" diagram exactly
- [ ] `@gg/shared` workspace dep resolves from `bias-breaker`
- [ ] Test seam (`window.__GAME__`) only exists in dev/preview, stripped in prod build
- [ ] CI installs deps with `--frozen-lockfile`
- [ ] Vercel deploy URL captured in `README.md` (follow-up commit OK)
- [ ] No gameplay code added (that's Phase 2+)

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Vercel monorepo first-time deploy config off | M | Med | Single-game config now; refactor to multi-game in Phase 4; follow Vercel monorepo docs verbatim |
| Workspace TS source-import not resolving in Vite | L | Med | The `main`/`exports` pointing to `./src/index.ts` is the standard pattern; Vite handles workspace protocol natively; double-check with `pnpm -F bias-breaker dev` |
| Playwright cache size on Chromebook | L | Low | CI only; install with-deps chromium only |
| Hidden coupling between main app and `GAME/` directory paths breaks main app smoke | M | Low | The in-app launcher button calls `GG.start()` which expects `GAME/glitch-guardians.js` — that file moves to `legacy/`. The launcher button will throw on click. Expected. Document in Task 1 commit; fix in Phase 4. |

## Notes
- This phase deliberately stops at *infrastructure*, not *gameplay*. Phase 2 (Bias Breaker rebuild) is where the actual port begins, on top of this proven pipeline.
- The `_shared/src/quizData.ts` fork is the only piece of *content migration* in Phase 1 — it's mechanical (extract + add types). All 4 banks ported now even though only `bias` is used until Phase 2, because doing them all at once is the same cost as doing one.
- The in-app launcher (the button in `index.html` that calls `GG.start()`) **will be broken locally** after Task 1 because `GAME/` moves. That's expected and gets fixed in Phase 4 (one-line link cutover). Note this in the Task 1 commit so future me doesn't panic.
- After Phase 1 + verification, update the PRD: flip Phase 1 from `in-progress` → `complete`, link the archived plan, run `prp-plan` again for Phase 2.
