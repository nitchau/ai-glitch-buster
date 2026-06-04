import Phaser from 'phaser';
import { PreloadScene } from './scenes/PreloadScene';
import { GameScene } from './scenes/GameScene';
import { CANVAS_W, CANVAS_H, RENDER_SCALE } from './constants';

declare const __TEST_SEAM__: boolean;

// Top-down stealth, MANUAL movement (no Arcade physics). Boots straight into the
// vault — no avatar picker. Supersampled backing store; the scene zooms its camera
// by RENDER_SCALE. CelebrationScene is added in Milestone C (win flow).
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0a1226',
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
