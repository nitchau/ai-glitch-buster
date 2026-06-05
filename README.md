# Glitch Guardians

Educational AI-safety games for kids, in two tiers:

- `index.html` — main **AI Glitch Buster** quiz app (vanilla; frozen)
- `games/` — Phaser 3 + TS + Vite monorepo: the games (`bias-breaker`, `habit-harbor`, `privacy-vaults`), shared code (`_shared`), and the island-map (`landing/`)
- `glitch-guardians/` — the built, committed bundle served by GitHub Pages (rebuild with `node scripts/build-pages.cjs`)

## Quick start

```bash
pnpm install
pnpm -F bias-breaker dev      # http://localhost:5173/
pnpm -F bias-breaker test     # Vitest
pnpm -F bias-breaker e2e      # Playwright
pnpm -r typecheck && pnpm -r lint
```

See `.claude/PRPs/prds/glitch-guardians-migration.prd.md` for the migration roadmap.
