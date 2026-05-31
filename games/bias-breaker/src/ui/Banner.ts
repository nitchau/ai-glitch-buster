// Floating question banner — port of legacy `buildBanner` / `showSectionBanner`
// (legacy lines 408-415). Stays at the top of the camera viewport.

import Phaser from 'phaser';

export class Banner extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Rectangle;
  private text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    super(scene, scene.scale.width / 2, 90);
    this.bg = scene.add
      .rectangle(0, 0, 900, 70, 0xffffff, 0.92)
      .setStrokeStyle(2, 0x43e97b);
    this.text = scene.add
      .text(0, 0, '', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        color: '#15234a',
        align: 'center',
        wordWrap: { width: 860 },
      })
      .setOrigin(0.5, 0.5);
    this.add([this.bg, this.text]);
    scene.add.existing(this);
    this.setScrollFactor(0).setDepth(200);
    this.setVisible(false);
  }

  show(message: string, kind: 'question' | 'correct' | 'wrong' | 'info' = 'question'): void {
    this.text.setText(message);
    const color =
      kind === 'correct'
        ? 0x43e97b
        : kind === 'wrong'
          ? 0xf5576c
          : kind === 'info'
            ? 0xffd700
            : 0xffffff;
    this.bg.setFillStyle(color, 0.92);
    // Resize bg to fit text width
    const padW = 60;
    const padH = 24;
    this.bg.width = Math.max(400, this.text.width + padW);
    this.bg.height = Math.max(60, this.text.height + padH);
    this.setVisible(true);
  }

  hide(): void {
    this.setVisible(false);
  }
}
