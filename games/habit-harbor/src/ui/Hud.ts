// HUD — rescued count + timer, pinned to the camera viewport (setScrollFactor(0)),
// each on a rounded translucent pill for legibility. Crisp text via TEXT_RES.

import Phaser from 'phaser';
import { TEXT_RES } from '../constants';

const STYLE: Phaser.Types.GameObjects.Text.TextStyle = {
  fontFamily: 'Arial, sans-serif',
  fontSize: '18px',
  color: '#eaf5ff',
  fontStyle: 'bold',
  resolution: TEXT_RES,
};

export class Hud {
  private readonly rescued: Phaser.GameObjects.Text;
  private readonly timer: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, total: number) {
    const bg = scene.add.graphics().setScrollFactor(0).setDepth(209);
    pill(bg, 14, 12, 176, 36);
    pill(bg, 200, 12, 96, 36);

    this.rescued = scene.add.text(30, 30, '', STYLE).setOrigin(0, 0.5).setScrollFactor(0).setDepth(210);
    this.timer = scene.add.text(214, 30, '', STYLE).setOrigin(0, 0.5).setScrollFactor(0).setDepth(210);
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

function pill(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number): void {
  g.fillStyle(0x0c1f3e, 0.82);
  g.fillRoundedRect(x, y, w, h, h / 2);
  g.lineStyle(2, 0x2f63a8, 0.9);
  g.strokeRoundedRect(x, y, w, h, h / 2);
}
