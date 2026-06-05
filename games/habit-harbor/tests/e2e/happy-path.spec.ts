// Happy-path e2e: a full Bad-Habit Harbor run from boot to win.
//
// Bad-Habit Harbor has no flyer physics or dwell timing, so this drives the REAL
// rescue + win logic deterministically through the dev test seam: teleport the
// boat onto each bot (which opens its quiz), answer correctly, then sail into the
// harbor mouth and assert the win persisted (Privacy Vaults unlocked).
// The test seam (window.__GAME__ / __GAME_STATE__) only exists in dev/preview.

import { test, expect } from '@playwright/test';

type Bot = { id: string; cxc: number; cyc: number; rescued: boolean };
type HHScene = {
  sys: { settings: { key: string } };
  bots: Bot[];
  boat: { px: number; py: number };
  maze: { exit: { c: number; r: number } };
  state: { activeBot: Bot | null };
  answer(choice: { text: string; isCorrect: boolean }, bot: Bot | null): void;
};
type GameWin = {
  __GAME__: { scene: { getScenes(active: boolean): HHScene[] } };
  __GAME_STATE__: () => { rescued: number; quizOpen: boolean; won: boolean; atExit: boolean };
};

const CELL = 64;
const TOTAL = 5;

test('happy path: rescue 5 bots → win → Privacy Vaults unlocked', async ({ page }) => {
  test.setTimeout(120_000);
  const pageErrors: string[] = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  await page.goto('/habit-harbor/');

  // __GAME__ is set a few ticks before the SceneManager registers scenes.
  await page.waitForFunction(
    () => {
      const g = (window as unknown as Partial<GameWin>).__GAME__;
      return g != null && g.scene.getScenes(true).some((s) => s.sys.settings.key === 'GameScene');
    },
    null,
    { timeout: 15_000 }
  );

  // Seed a profile so markIslandCleared has something to update.
  await page.evaluate(() => {
    const profile = {
      name: 'Tester',
      gradeBand: 'explorer',
      createdAt: '2026-01-01T00:00:00.000Z',
      progress: {
        'bias-breaker': { unlocked: true, cleared: true, stars: 3 },
        'habit-harbor': { unlocked: true, cleared: false, stars: 0 },
        'privacy-vaults': { unlocked: false, cleared: false, stars: 0 },
        'reality-tower': { unlocked: false, cleared: false, stars: 0 },
        'the-core': { unlocked: false, cleared: false, stars: 0 },
      },
    };
    localStorage.setItem('gg.profile', JSON.stringify(profile));
  });

  // Rescue each bot: teleport the boat onto it (opens the quiz), then answer right.
  for (let i = 0; i < TOTAL; i++) {
    await page.evaluate((idx) => {
      const w = window as unknown as GameWin;
      const scene = w.__GAME__.scene.getScenes(true).find((s) => s.sys.settings.key === 'GameScene');
      const bot = scene?.bots[idx];
      if (!scene || !bot) return;
      scene.boat.px = bot.cxc;
      scene.boat.py = bot.cyc;
    }, i);

    await page.waitForFunction(() => (window as unknown as GameWin).__GAME_STATE__().quizOpen, null, {
      timeout: 10_000,
    });

    await page.evaluate(() => {
      const w = window as unknown as GameWin;
      const scene = w.__GAME__.scene.getScenes(true).find((s) => s.sys.settings.key === 'GameScene');
      if (!scene) return;
      scene.answer({ text: '', isCorrect: true }, scene.state.activeBot);
    });

    await page.waitForFunction(
      (n) => (window as unknown as GameWin).__GAME_STATE__().rescued >= n,
      i + 1,
      { timeout: 10_000 }
    );
  }

  // Sail into the harbor mouth (exit cell) — wins once all five are freed.
  // CELL is passed as an arg: page.evaluate runs in the browser and can't see
  // module-scope consts.
  await page.evaluate((cell) => {
    const w = window as unknown as GameWin;
    const scene = w.__GAME__.scene.getScenes(true).find((s) => s.sys.settings.key === 'GameScene');
    if (!scene) return;
    const ex = scene.maze.exit;
    scene.boat.px = ex.c * cell + cell / 2;
    scene.boat.py = ex.r * cell + cell / 2;
  }, CELL);

  await page.waitForFunction(
    () =>
      (window as unknown as GameWin).__GAME__.scene
        .getScenes(true)
        .some((s) => s.sys.settings.key === 'CelebrationScene'),
    null,
    { timeout: 10_000 }
  );

  // The win persisted: habit-harbor cleared, Privacy Vaults unlocked.
  const progress = await page.evaluate(() => {
    const raw = localStorage.getItem('gg.profile');
    return raw
      ? (JSON.parse(raw) as { progress: Record<string, { cleared: boolean; unlocked: boolean }> })
          .progress
      : null;
  });
  expect(progress?.['habit-harbor']?.cleared).toBe(true);
  expect(progress?.['privacy-vaults']?.unlocked).toBe(true);

  expect(pageErrors, 'unexpected page errors: ' + pageErrors.join(', ')).toEqual([]);
});
