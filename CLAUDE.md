# Claude Code Memory — AI Glitch Buster + Glitch Guardians

> Project memory for the **AI Glitch Buster** web app (the kids' competition app from `index.html`) and the **Glitch Guardians** educational game module being added inside `GAME/`. Read this first to load full context.

## What this repo is

- A static **HTML/CSS/JS web app** (no Node, no npm, no build step) for the **Presidential AI Challenge 2026**.
- Built by Mishika and her team (the AI Glitch Busters). They won State + Regional and are heading to National Finals.
- The team submits work on behalf of kids who aren't old enough for GitHub accounts — commit messages include a disclaimer noting this.
- Anything kids open via `index.html` should just work in a browser. Keep that simple.

## Tech stack (do not change without explicit user approval)

- **Pure HTML5 + CSS3 + ES5-ish JavaScript** (use `var`, `function`, no arrow functions, no classes — runs on school Chromebooks)
- **localStorage** for state persistence (single profile per device under key `gg.profile`)
- **No frameworks, no bundler, no transpiler**
- **SVG** for any vector graphics (map, characters, icons) — no external image dependencies
- **Python's `http.server`** is the dev server during testing (`python -m http.server 7891`)
- **Playwright MCP** is the validation harness; **no automated CI** yet

## Operating preferences (set by Nitin)

- **Use Claude Opus 4.7 for ALL development work** — both the main session and any subagent dispatches (`model: "opus"` explicitly).
- **Use the `everything-claude-code` plugin's skills** end-to-end:
  - `everything-claude-code:prp-plan` to plan
  - `everything-claude-code:prp-implement` to execute
  - `everything-claude-code:code-review` between phases
- Commits go directly to `main` (per the team's existing workflow). Each plan task ends with a commit.
- Commit messages are prose-style (not conventional commits) and include the kids-disclaimer + `Co-Authored-By: Claude Opus 4.7 (1M context)` footer.
- "Build it in small steps" — every feature must be testable in a browser before the next is added.

## Repository layout

```
ai-glitch-buster/
├── CLAUDE.md                          ← this file
├── README.md
├── index.html                         ← Mishika's existing AI Glitch Buster app (~145KB)
├── ai-model-trainer.html              ← teammate's model-training tool (separate)
├── interview-prep/                    ← unrelated old folder
├── GAME/                              ← Glitch Guardians game module
│   ├── glitch-guardians.js                ← entry + screen router (start/exit, history)
│   ├── glitch-guardians.css               ← all game styles (every class prefixed .gg-)
│   ├── state.js                           ← profile + progress + localStorage
│   ├── screens/
│   │   ├── onboarding.js                  ← name + grade-band picker
│   │   ├── map.js                         ← Datapolis SVG world map + confused-kid scene
│   │   └── island-intro.js                ← per-island story blurb (Coming Soon placeholder)
│   ├── test.html                          ← in-browser test runner
│   ├── test.js                            ← 7 TDD tests for state.js
│   └── PLAYTEST.md                        ← manual playtest checklist
├── docs/
│   └── superpowers/
│       ├── specs/2026-05-26-glitch-guardians-shell-design.md
│       └── plans/2026-05-26-glitch-guardians-shell.md
└── *.pdf                              ← project + policy documents (untracked)
```

## What's done — Phase 1 + UI polish

**Phase 1: walking-skeleton shell** (commits `f59568e` → `7ce48e1`, tag `gg-phase1-shell`)

- Launcher button in `index.html` header → full-screen game container
- Onboarding (name + grade band: Explorer K-5 / Guardian 6-8)
- Datapolis world-map with **5 islands** (Bias Breaker unlocked, 4 locked)
- Per-island "Coming Soon" intro screens (story blurb)
- localStorage profile persistence + corrupted/blocked storage handling
- Back-to-App button + browser-back-button handling via `history.pushState/replaceState`
- **7/7 automated tests** for `state.js`
- Manual playtest checklist
- 9 atomic commits, one per plan task

**UI polish iterations**

- `810a47e` — fixed hover wobble (nested SVG `<g>` outer-position + inner-effects), renamed islands to match the 4 AI safety pillars (Bias Breaker, Bad-Habit Harbor, Privacy Vault, Hallucination Tower, The Core), curved bezier paths with flowing-dash animation + glow filter, layered drifting gradient background + circuit overlay + floating orbs
- `3cc2e09` — added 4 confused-kid silhouettes in screen corners with pulsing thought bubbles (`?`, `?!`, `…`, `AI?`), 12 floating data particles rising from bottom to top, staggered entrance animations for header and islands
- `4bd8d59` — redesigned the kids with full anatomy: head with face details, neck, torso with V-neck collar, curved arms with circle hands, legs in pants, shoes; 4 distinct poses (head-scratch / cheek-clutch / shrug / thinker), 4 hair styles, 4 skin tones, per-pose micro-animations

## Key design decisions (don't relitigate without reason)

- **No build step.** Kids must be able to clone and double-click `index.html`.
- **One global namespace: `window.GG`.** Submodules: `GG.state`, `GG.screens.*`, `GG.start`, `GG.exit`.
- **CSS class prefix: `gg-*`** to prevent collisions with the existing app's global classes (`.badge`, `.container`, `.header`, …).
- **`createElement` / `createElementNS` everywhere — never `innerHTML`** (the project's security hook flags it). Static literal strings can still be safely concatenated into `textContent`.
- **Island IDs are immutable.** `bias-breaker`, `habit-harbor`, `privacy-vaults`, `reality-tower`, `the-core`. Display names can change; IDs stay so saved profiles never break.
- **SVG `<g>` outer-position + inner-effects pattern.** When an SVG element needs to be positioned AND animated via CSS, the outer `<g>` uses the SVG `transform` attribute for position; the inner `<g>` carries the CSS class for hover/animations. CSS transforms on SVG `<g>` *replace* (not combine with) the SVG attribute — this caused the original wobble bug.
- **Game module is fully isolated.** Lives under `GAME/`. The only edits to `index.html` are: one launcher `<button>` and the `<link>`/`<script>` tags before `</body>` — both surgical, both reviewed.

## How to run / verify

```powershell
cd C:\Users\nitin\ai-glitch-buster
python -m http.server 7891

# Then open in browser:
http://localhost:7891/index.html          # main app + game
http://localhost:7891/GAME/test.html      # automated unit tests
```

For manual verification, walk through `GAME/PLAYTEST.md`.

## What's next — Phase 2

Replace the Bias Breaker "Coming Soon" intro card with **real platformer gameplay**:

- WASD / arrow-key movement, space to jump
- Colored-square avatar (Geometry-Dash style; player can pick color in onboarding later)
- 3–5 hand-authored bias/fairness questions (no AI question-engine yet)
- "Answer correctly → next platform appears" loop
- Fall = restart section (not whole island)
- Win → mark Bias Breaker cleared + unlock Habit Harbor in `state.js`
- Celebration screen (stars, story progression)

A separate spec lives at `docs/superpowers/specs/` once Phase 2 brainstorming is approved.

Future phases (not yet specced):
- Phase 3: AI Quiz Engine (Model A — generates questions)
- Phase 4: Guardian Watch validator (Model B — checks every question)
- Phase 5+: remaining islands (Bad-Habit Harbor, Privacy Vault, Hallucination Tower)
- Phase N: The Core escape-room + final boss
- Avatar customization, badges (10 total), printable certificates, power-ups, classroom multiplayer

## How to resume work in a new session

1. Open this repo from `C:\Users\nitin\ai-glitch-buster` so this file auto-loads
2. Skim the "What's done" section for current state
3. Check `git log --oneline -20` for recent commits
4. Open `GAME/PLAYTEST.md` if you need to verify the shell still works
5. Find the most recent spec under `docs/superpowers/specs/`
6. Find the most recent plan under `docs/superpowers/plans/`
7. Continue from where the user directed — usually they'll say "continue Phase N" or pick a specific task

When in doubt, brainstorm before building. The `everything-claude-code:prp-prd` skill is good for the brainstorm-into-spec phase.
