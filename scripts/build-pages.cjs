// Build the committed GitHub Pages bundle for the games.
//
// The app is served by "legacy" GitHub Pages straight from the repo root on `main`
// (no build step), under a sub-path (https://garage.wizkidz.ai/ai-glitch-buster/).
// So the games must be (a) pre-built and committed, and (b) path-portable. We build
// each game with a RELATIVE base (`--base ./`) so its assets load relative to its own
// index.html — which works under any sub-path — then assemble landing + games into
// `glitch-guardians/` at the repo root. The app's "Play" button links to it
// (href="glitch-guardians/"), and the landing/game links are all relative too.
//
// Re-run whenever a game or the landing changes:  node scripts/build-pages.cjs
// then commit the updated glitch-guardians/ folder.

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const out = path.join(root, 'glitch-guardians');
const GAMES = ['bias-breaker', 'habit-harbor', 'privacy-vaults'];

// 1. Build each game with relative asset paths.
for (const id of GAMES) {
  console.log(`building ${id} (base ./) ...`);
  execSync(`pnpm -F ${id} exec vite build --base ./`, { cwd: root, stdio: 'inherit' });
}

// 2. Assemble landing + games into the committed bundle.
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
for (const id of GAMES) {
  fs.cpSync(path.join(root, 'games', id, 'dist'), path.join(out, id), { recursive: true });
}
fs.copyFileSync(path.join(root, 'games', 'landing', 'index.html'), path.join(out, 'index.html'));

// 3. Drop sourcemaps — they're multi-MB and not needed to serve.
let stripped = 0;
(function stripMaps(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) stripMaps(p);
    else if (e.name.endsWith('.map')) {
      fs.rmSync(p);
      stripped++;
    }
  }
})(out);

console.log(`\nassembled glitch-guardians/ (landing + ${GAMES.join(', ')}); stripped ${stripped} sourcemap(s)`);
