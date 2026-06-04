// Assemble a single Vercel output directory from the per-game Vite builds.
//
// Vercel serves ONE outputDirectory, but we ship several path-routed games. Each
// game is built with a matching Vite `base` (e.g. /habit-harbor/), so copying its
// dist into dist/<game>/ makes every asset URL resolve with no rewrites: a request
// to /habit-harbor/ serves dist/habit-harbor/index.html, whose assets live at
// /habit-harbor/assets/* → dist/habit-harbor/assets/*.
//
// Run after the per-game builds: `node scripts/assemble-dist.cjs`.

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'dist');

// Games to publish (each must already be built into games/<id>/dist).
const GAMES = ['bias-breaker', 'habit-harbor'];

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

for (const id of GAMES) {
  const src = path.join(root, 'games', id, 'dist');
  if (!fs.existsSync(src)) {
    throw new Error(`missing build for ${id} — run "pnpm -F ${id} build" first (${src})`);
  }
  fs.cpSync(src, path.join(out, id), { recursive: true });
  console.log(`copied games/${id}/dist -> dist/${id}/`);
}

// A tiny placeholder index that links to each game. The real Datapolis landing
// page lands in Phase 4 (main-app link cutover).
const links = GAMES.map((id) => `<li><a href="/${id}/">${id}</a></li>`).join('');
fs.writeFileSync(
  path.join(out, 'index.html'),
  `<!doctype html><meta charset="utf-8"><title>Glitch Guardians</title>` +
    `<style>body{background:#0a0820;color:#cfeefe;font-family:system-ui;padding:2rem}` +
    `a{color:#43e97b}</style><h1>Glitch Guardians</h1><ul>${links}</ul>\n`
);
console.log('wrote dist/index.html (placeholder landing)');
console.log('assembled dist/ for:', GAMES.join(', '));
