// Floating banner — a dark glassy card with a glowing border, a small kind-tag,
// bold text, and a pop-in tween. Used for rescue notifications ("Fixed! A gate
// opened ✓") and the all-clear prompt. Mirrors bias-breaker's Banner.

import Phaser from 'phaser';
import { TEXT_RES, CANVAS_W } from '../constants';

export type BannerKind = 'question' | 'correct' | 'wrong' | 'info';

type KindStyle = { border: number; tag: string; tagText: string };

const KIND_STYLES: Record<BannerKind, KindStyle> = {
  question: { border: 0x38f9d7, tag: '❓ QUESTION', tagText: '#06202a' },
  correct: { border: 0x43e97b, tag: '✓ FIXED', tagText: '#06281a' },
  wrong: { border: 0xf5576c, tag: '✗ TRY AGAIN', tagText: '#2a0810' },
  info: { border: 0xffd700, tag: 'ℹ INFO', tagText: '#2a2206' },
};

const PANEL_FILL = 0x0c1838;
const MIN_W = 460;

export class Banner extends Phaser.GameObjects.Container {
  private gfx: Phaser.GameObjects.Graphics;
  private tagBg: Phaser.GameObjects.Graphics;
  private tag: Phaser.GameObjects.Text;
  private text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    super(scene, CANVAS_W / 2, 74);
    this.gfx = scene.add.graphics();
    this.tagBg = scene.add.graphics();
    this.tag = scene.add
      .text(0, 0, '', {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '15px',
        color: '#06202a',
        resolution: TEXT_RES,
      })
      .setOrigin(0.5);
    this.text = scene.add
      .text(0, 6, '', {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '23px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: 760 },
        stroke: '#06122e',
        strokeThickness: 4,
        resolution: TEXT_RES,
      })
      .setOrigin(0.5, 0.5);
    this.add([this.gfx, this.tagBg, this.tag, this.text]);
    scene.add.existing(this);
    this.setDepth(200);
    this.setVisible(false);
  }

  show(message: string, kind: BannerKind = 'info'): void {
    const style = KIND_STYLES[kind];
    this.text.setText(message);
    this.text.setColor('#ffffff');

    const w = Math.max(MIN_W, this.text.width + 90);
    const h = Math.max(74, this.text.height + 50);
    const x = -w / 2;
    const y = -h / 2;

    this.gfx.clear();
    for (let i = 3; i >= 1; i--) {
      this.gfx.lineStyle(2 + i * 3, style.border, 0.06 * i);
      this.gfx.strokeRoundedRect(x - i * 2, y - i * 2, w + i * 4, h + i * 4, 22 + i * 2);
    }
    this.gfx.fillStyle(PANEL_FILL, 0.96);
    this.gfx.fillRoundedRect(x, y, w, h, 20);
    this.gfx.lineStyle(3, style.border, 1);
    this.gfx.strokeRoundedRect(x, y, w, h, 20);
    this.gfx.fillStyle(0xffffff, 0.06);
    this.gfx.fillRoundedRect(x + 6, y + 6, w - 12, h * 0.32, 14);

    this.tag.setText(style.tag).setColor(style.tagText);
    const tagW = this.tag.width + 22;
    const tagH = 26;
    const tagX = x + 18;
    const tagY = y - tagH / 2;
    this.tagBg.clear();
    this.tagBg.fillStyle(style.border, 1);
    this.tagBg.fillRoundedRect(tagX, tagY, tagW, tagH, 13);
    this.tag.setPosition(tagX + tagW / 2, tagY + tagH / 2);

    this.setVisible(true);
    this.setScale(0.92);
    this.scene.tweens.add({ targets: this, scale: 1, duration: 180, ease: 'Back.out' });
  }

  hide(): void {
    this.setVisible(false);
  }
}
