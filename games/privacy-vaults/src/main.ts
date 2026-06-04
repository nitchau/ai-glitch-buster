import Phaser from 'phaser';
import { PreloadScene } from './scenes/PreloadScene';
import { GameScene } from './scenes/GameScene';
import { CANVAS_W, CANVAS_H, RENDER_SCALE } from './constants';

declare const __TEST_SEAM__: boolean;

// Old-school Tetris. Boots straight into the board. Supersampled backing store; the
// scene zooms its camera by RENDER_SCALE so the vector tiles stay crisp when
// FIT-scaled. CelebrationScene is added in Milestone C (win flow).
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#e7edf9',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: CANVAS_W * RENDER_SCALE,
    height: CANVAS_H * RENDER_SCALE,
  },
  scene: [PreloadScene, GameScene],
});

if (__TEST_SEAM__) {
  (window as unknown as { __GAME__: Phaser.Game }).__GAME__ = game;
}
