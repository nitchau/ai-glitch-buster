// HUD — rescued count + timer, pinned to the camera viewport (setScrollFactor(0)).
// Mirrors bias-breaker's Hud; relabeled for the harbor rescue mission.

import Phaser from 'phaser';

const STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'Arial, sans-serif',
  fontSize: '20px',
  color: '#cfeefe',
  fontStyle: 'bold',
};

export class Hud {
  private readonly rescued: Phaser.GameObjects.Text;
  private readonly timer: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, total: number) {
    this.rescued = scene.add.text(16, 16, '', STYLE).setScrollFactor(0).setDepth(210);
    this.timer = scene.add.text(250, 16, '', STYLE).setScrollFactor(0).setDepth(210);
    this.setRescued(0, total);
    this.setTimer(0);
  }

  setRescued(n: number, total: number): void {
    this.rescued.setText(`🤖 Rescued ${n}/${total}`);
  }

  setTimer(seconds: number): void {
    this.timer.setText(`⏱ ${seconds}s`);
  }
}
