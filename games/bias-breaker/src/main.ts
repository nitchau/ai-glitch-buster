import Phaser from 'phaser';
import { HelloScene } from './scenes/HelloScene';

declare const __TEST_SEAM__: boolean;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0a0820',
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [HelloScene],
});

// Test seam: expose the game instance ONLY in dev/preview builds so
// Playwright can assert scene state. Stripped from production builds.
if (__TEST_SEAM__) {
  (window as unknown as { __GAME__: Phaser.Game }).__GAME__ = game;
}
