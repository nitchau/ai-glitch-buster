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
const GAMES = ['bias-breaker', 'habit-harbor', 'privacy-vaults'];

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

// Ship the all-games landing page (five islands + unlock state from gg.profile)
// as the Vercel root. It's a static file — copy it verbatim.
fs.copyFileSync(path.join(root, 'landing', 'index.html'), path.join(out, 'index.html'));
console.log('copied landing/index.html -> dist/index.html');
console.log('assembled dist/ for:', GAMES.join(', '));
