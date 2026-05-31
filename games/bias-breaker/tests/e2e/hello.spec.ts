// Smoke e2e: Phaser game boots, GameScene is active, test seam exposes state.
// The full happy-path (drive through 5 sections to celebration) lands in Milestone E.

import { test, expect } from '@playwright/test';

test('Phaser game boots and GameScene is active', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');

  await page.waitForFunction(
    () => Boolean((window as unknown as { __GAME__?: unknown }).__GAME__),
    { timeout: 10_000 }
  );

  const sceneKey = await page.evaluate(() => {
    const game = (
      window as unknown as {
        __GAME__: {
          scene: { getScenes: (active: boolean) => { sys: { settings: { key: string } } }[] };
        };
      }
    ).__GAME__;
    const scenes = game.scene.getScenes(true);
    return scenes[scenes.length - 1]?.sys.settings.key;
  });

  expect(sceneKey).toBe('GameScene');
  expect(errors, 'unexpected page errors: ' + errors.join(', ')).toEqual([]);
});
