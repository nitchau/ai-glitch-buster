import Phaser from 'phaser';
import { PreloadScene } from './scenes/PreloadScene';
import { GameScene } from './scenes/GameScene';
import { CANVAS_W, CANVAS_H } from './constants';

declare const __TEST_SEAM__: boolean;

// Bad-Habit Harbor is a top-down maze with MANUAL grid movement, so there is no
// Arcade physics block (unlike Bias Breaker). Boots straight into the maze — no
// avatar picker. CelebrationScene is added in Milestone C (win flow).
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0a2738',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: CANVAS_W,
    height: CANVAS_H,
  },
  scene: [PreloadScene, GameScene],
});

// Test seam: expose the game instance in dev/preview only.
if (__TEST_SEAM__) {
  (window as unknown as { __GAME__: Phaser.Game }).__GAME__ = game;
}
