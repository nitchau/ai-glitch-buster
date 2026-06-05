# Implementation Report: Bad-Habit Harbor — Phase 3 (Bots, rescue & gates)

## Summary
The teach-and-progress core landed. Driving into a glitch-bot pauses the game
and opens a tappable quiz (4 shuffled choices from `quizData["bad-habits"]`).
Correct fixes the bot (happy-green + smile) and opens its gate via
`state.openGates` (boat can drive through immediately); wrong shows a friendly
nudge and loads a fresh question (never punishes). A HUD shows "Rescued X/5" and
a count-up timer that pauses during quizzes. Rescuing all 5 opens the full maze.
No win/celebration/stars/unlock/sound yet (Phase 4).

## Assessment vs Reality

| Metric | Predicted (Plan) | Actual |
|---|---|---|
| Complexity | Medium-Large | Medium-Large |
| Confidence | — | Single-pass, no rework |
| Files Changed | 1 screen + adapter + CSS + tests | 4 modified |

## Tasks Completed

| # | Task | Status | Notes |
|---|---|---|---|
| 1 | `toChoices(q)` in adapter | Complete | shuffled [{text,isCorrect}] |
| 2 | Rescue state + bot collision | Complete | distance trigger; only un-rescued bots |
| 3 | Quiz modal + answer logic | Complete | correct=rescue+close; wrong=nudge+new Q (no punish); pool refills |
| 4 | Rescue effect + gate/bot rendering | Complete | gate→faded posts; bot→green smile |
| 5 | HUD + banner + timer | Complete | rescued X/5; timer pauses during quiz |
| 6 | CSS (hud/banner/modal) | Complete | modal z-index 10 > dpad 5 |
| 7 | toChoices tests | Complete | +2 → 21/21 |

## Validation Results

| Level | Status | Notes |
|---|---|---|
| Static Analysis | Pass | `node --check` on habit-harbor.js, habit-harbor-questions.js, test.js |
| Unit Tests | Pass | 21/21 via headless full-suite run (2 new) |
| Build | N/A | Vanilla JS |
| Integration | Partial | quiz/rescue/HUD logic via tests + patterns; interactive flow is a browser/visual check (handed to user) |
| Edge Cases | Pass | wrong-never-punishes, rescued bot no re-trigger, movement frozen during quiz, timer pause, pool refill |

## Files Changed

| File | Action |
|---|---|
| `GAME/screens/habit-harbor-questions.js` | UPDATED (toChoices) |
| `GAME/screens/habit-harbor.js` | UPDATED (rescue state machine, quiz modal, HUD/banner, gate/bot rendering, timer) |
| `GAME/glitch-guardians.css` | UPDATED (.gg-hh-hud / .gg-hh-banner / .gg-hh-modal / .gg-hh-opt) |
| `GAME/test.js` | UPDATED (+2 toChoices tests) |

## Deviations from Plan
- On a wrong answer the explanation is rendered as part of the *next* question's
  modal (passed as `explainText` to `renderQuiz`) rather than toggled on the
  current modal — avoids the rebuild wiping a just-shown note. Same UX, cleaner.

## Issues Encountered
None.

## Tests Written

| Test File | Tests | Coverage |
|---|---|---|
| `GAME/test.js` | 2 new | toChoices count/one-correct; texts + correct mapping preserved |

## Next Steps
- [ ] User playtest: drive into bots → quiz → correct fixes + opens gate; wrong never punishes; HUD + timer; rescue all 5.
- [ ] Phase 4: win at the harbor mouth → celebration → time-based stars → markIslandCleared (Privacy Vault unlock) + optional sound/followers. Run `prp-plan` on the PRD again.
