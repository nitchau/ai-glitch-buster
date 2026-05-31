import { test, expect } from '@playwright/test';

test('Phaser game boots + HelloScene is active', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/');

  // Wait for the test seam to expose the game instance
  await page.waitForFunction(
    () => Boolean((window as unknown as { __GAME__?: unknown }).__GAME__),
    { timeout: 10_000 }
  );

  const sceneKey = await page.evaluate(() => {
    const game = (
      window as unknown as {
        __GAME__: {
          scene: {
            getScenes: () => { sys: { settings: { key: string } } }[];
          };
        };
      }
    ).__GAME__;
    return game.scene.getScenes()[0]?.sys.settings.key;
  });

  expect(sceneKey).toBe('HelloScene');
  expect(errors, 'unexpected page errors: ' + errors.join(', ')).toEqual([]);
});
