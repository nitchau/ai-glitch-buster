import Phaser from 'phaser';
import { PreloadScene } from './scenes/PreloadScene';
import { AvatarSelectScene } from './scenes/AvatarSelectScene';
import { GameScene } from './scenes/GameScene';
import { CelebrationScene } from './scenes/CelebrationScene';
import { CANVAS_W, CANVAS_H } from './constants';

declare const __TEST_SEAM__: boolean;

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0a0820',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: CANVAS_W,
    height: CANVAS_H,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },   // gravity applied per-sprite (matches v13.3 pattern)
      debug: false,
    },
  },
  scene: [PreloadScene, AvatarSelectScene, GameScene, CelebrationScene],
});

// Test seam: expose the game instance in dev/preview only.
if (__TEST_SEAM__) {
  (window as unknown as { __GAME__: Phaser.Game }).__GAME__ = game;
}
