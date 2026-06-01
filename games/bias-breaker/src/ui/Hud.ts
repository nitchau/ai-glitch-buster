// HUD — section / timer / score readout pinned to the camera viewport.
// Port of legacy/GAME/screens/bias-breaker.js:382-396 (buildHUD). The vanilla
// version used three DOM <span>s; here they are camera-fixed Phaser Text
// objects (setScrollFactor(0)) so they don't scroll with the level.

import Phaser from 'phaser';

const STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'Arial, sans-serif',
  fontSize: '20px',
  color: '#cfeefe',
  fontStyle: 'bold',
};

export class Hud {
  private readonly section: Phaser.GameObjects.Text;
  private readonly timer: Phaser.GameObjects.Text;
  private readonly score: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, totalSections: number) {
    this.section = scene.add.text(16, 16, '', STYLE).setScrollFactor(0).setDepth(210);
    this.timer = scene.add.text(230, 16, '', STYLE).setScrollFactor(0).setDepth(210);
    this.score = scene.add.text(360, 16, '', STYLE).setScrollFactor(0).setDepth(210);
    this.setSection(1, totalSections);
    this.setTimer(0);
    this.setScore(0);
  }

  setSection(current: number, total: number): void {
    this.section.setText(`Section: ${current}/${total}`);
  }

  setTimer(seconds: number): void {
    this.timer.setText(`⏱ ${seconds}s`);
  }

  setScore(points: number): void {
    this.score.setText(`★ ${points} pts`);
  }
}
