// Happy-path e2e: a full Bias Breaker run from boot to win.
//
// Rather than fight the platformer physics (jumping flyer-to-flyer to reach a
// high answer), this drives the REAL game logic through the dev test seam:
// each section it drops the player onto the correct flyer, then lets the actual
// dwell → commit → carry → arrive flow run. After 5 correct answers it walks
// into the door and asserts the win persisted (Habit Harbor unlocked).
// The test seam (window.__GAME__ / __GAME_STATE__) only exists in dev/preview.

import { test, expect } from '@playwright/test';

// Minimal shapes of the live scene we reach into via the seam.
type Flyer = { data: { isCorrect: boolean; x: number; y: number; w: number } };
type Sprite = { setPosition(x: number, y: number): void; setVelocity(x: number, y: number): void };
type BiasScene = {
  sys: { settings: { key: string } };
  state: { tortoiseSpawnFrame: number };
  tortoise: { destroy(): void } | null;
  flyers: Flyer[];
  player: { sprite: Sprite };
  level: { door: { x: number; y: number; w: number; h: number } };
};
type GameWin = {
  __GAME__: {
    scene: {
      getScene(key: string): { scene: { start(key: string): void } };
      getScenes(active: boolean): BiasScene[];
    };
  };
  __GAME_STATE__: () => {
    section: number;
    doorEntered: boolean;
    carryingFlyer: boolean;
    onFlyer: boolean;
    dwellTicks: number;
    timeMs: number;
    sections: number;
  };
};

const SECTIONS = 5;

test('happy path: 5 correct answers → win → Habit Harbor unlocked', async ({ page }) => {
  test.setTimeout(120_000);
  const pageErrors: string[] = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  await page.goto('/bias-breaker/');
  // Wait until the game has booted far enough that the avatar scene is live
  // (window.__GAME__ is set a few ticks before the SceneManager adds scenes).
  await page.waitForFunction(
    () => {
      const g = (window as unknown as Partial<GameWin>).__GAME__;
      return (
        g != null && g.scene.getScenes(true).some((s) => s.sys.settings.key === 'AvatarSelectScene')
      );
    },
    null,
    { timeout: 15_000 }
  );

  // Seed a profile (so markIslandCleared has something to update) + an avatar,
  // then jump straight into the level (the avatar picker is covered elsewhere).
  await page.evaluate(() => {
    const profile = {
      name: 'Tester',
      gradeBand: 'explorer',
      createdAt: '2026-01-01T00:00:00.000Z',
      progress: {
        'bias-breaker': { unlocked: true, cleared: false, stars: 0 },
        'habit-harbor': { unlocked: false, cleared: false, stars: 0 },
        'privacy-vaults': { unlocked: false, cleared: false, stars: 0 },
        'reality-tower': { unlocked: false, cleared: false, stars: 0 },
        'the-core': { unlocked: false, cleared: false, stars: 0 },
      },
    };
    localStorage.setItem('gg.profile', JSON.stringify(profile));
    localStorage.setItem('gg.bias.avatar', JSON.stringify({ gender: 'boy', skin: 'light' }));
    const w = window as unknown as GameWin;
    w.__GAME__.scene.getScene('AvatarSelectScene').scene.start('GameScene');
  });

  await page.waitForFunction(
    () => {
      const w = window as unknown as GameWin;
      return w.__GAME__.scene.getScenes(true).some((s) => s.sys.settings.key === 'GameScene');
    },
    null,
    { timeout: 10_000 }
  );

  // Answer each section by parking the player on the correct flyer. The ride-
  // coupling keeps them aboard while the 2s dwell commits, so we re-park only if
  // they actually fall off (not on a flyer and not mid-carry) — re-parking every
  // tick would fight the coupling and reset the dwell.
  for (let section = 0; section < SECTIONS; section++) {
    await page.waitForFunction(
      (sec) => {
        const w = window as unknown as GameWin;
        const scene = w.__GAME__.scene
          .getScenes(true)
          .find((s) => s.sys.settings.key === 'GameScene');
        if (!scene) return false;
        const st = w.__GAME_STATE__();
        if (st.section > sec || st.doorEntered) return true;
        if (!st.onFlyer && !st.carryingFlyer) {
          scene.state.tortoiseSpawnFrame = 1e9; // silence the tortoise during the dwell
          if (scene.tortoise) {
            scene.tortoise.destroy();
            scene.tortoise = null;
          }
          const correct = scene.flyers.find((f) => f.data.isCorrect);
          if (correct) {
            scene.player.sprite.setPosition(correct.data.x + correct.data.w / 2, correct.data.y);
            scene.player.sprite.setVelocity(0, 0);
          }
        }
        return false;
      },
      section,
      { timeout: 30_000, polling: 300 }
    );
  }

  // On the final platform: walk into the (now open) door.
  await page.evaluate(() => {
    const w = window as unknown as GameWin;
    const scene = w.__GAME__.scene.getScenes(true).find((s) => s.sys.settings.key === 'GameScene');
    if (!scene) return;
    const d = scene.level.door;
    scene.player.sprite.setPosition(d.x + d.w / 2, d.y + d.h - 5);
  });

  await page.waitForFunction(
    () => {
      const w = window as unknown as GameWin;
      return w.__GAME__.scene.getScenes(true).some((s) => s.sys.settings.key === 'CelebrationScene');
    },
    null,
    { timeout: 10_000 }
  );

  // The win persisted: bias-breaker cleared, Habit Harbor unlocked.
  const progress = await page.evaluate(() => {
    const raw = localStorage.getItem('gg.profile');
    return raw
      ? (JSON.parse(raw) as { progress: Record<string, { cleared: boolean; unlocked: boolean }> })
          .progress
      : null;
  });
  expect(progress?.['bias-breaker']?.cleared).toBe(true);
  expect(progress?.['habit-harbor']?.unlocked).toBe(true);

  expect(pageErrors, 'unexpected page errors: ' + pageErrors.join(', ')).toEqual([]);
});
