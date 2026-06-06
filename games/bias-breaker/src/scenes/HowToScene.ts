// HowToScene — the "Mission Briefing" shown after you pick a Glitch Buster and
// before the level starts. Reached from AvatarSelectScene; hands off to GameScene.
// Mirrors AvatarSelectScene's look (native 1800×780, no camera zoom, #0a0820 bg,
// #43e97b accent) so it feels like the same world. Greets the player by the
// persona they just chose for a personal touch.

import Phaser from 'phaser';
import { loadPersona } from '../avatar';

export class HowToScene extends Phaser.Scene {
  constructor() {
    super('HowToScene');
  }

  create(): void {
    const { width, height } = this.scale;
    const cx = width / 2;
    this.cameras.main.setBackgroundColor('#0a0820');
    const name = loadPersona().name;

    // ---- Briefing card ----
    const cardW = 1140;
    const cardH = 650;
    const cardX = cx - cardW / 2;
    const cardY = height / 2 - cardH / 2;
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.35);
    g.fillRoundedRect(cardX + 6, cardY + 12, cardW, cardH, 26);
    g.fillStyle(0x14224a, 0.96);
    g.fillRoundedRect(cardX, cardY, cardW, cardH, 26);
    g.lineStyle(4, 0x43e97b, 1);
    g.strokeRoundedRect(cardX, cardY, cardW, cardH, 26);

    // ---- Title + greeting ----
    this.add
      .text(cx, cardY + 70, '🦸  MISSION BRIEFING', {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '46px',
        color: '#43e97b',
      })
      .setOrigin(0.5);
    this.add
      .text(cx, cardY + 132, `Agent ${name}, the city of Datapolis has a BIAS glitch.\nFair AI treats everyone the same — go set things right! ⚖️`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#cfeefe',
        align: 'center',
        lineSpacing: 6,
      })
      .setOrigin(0.5);

    // ---- How-to rows ----
    const rowX = cardX + 90;
    let y = cardY + 250;
    const step = 74;
    this.row(rowX, y, '🏃', 'Walk with  ←  →   (or  A / D)');
    this.row(rowX, (y += step), '⬆️', 'Jump with  ↑  /  W  /  Space');
    this.row(rowX, (y += step), '☁️', 'Read the question up top, then JUMP onto the cloud with the RIGHT answer and stand still a moment to lock it in.');
    this.row(rowX, (y += step), '🌋', 'Picked wrong? You splash into the lava and pop right back — no game over, ever!');
    this.row(rowX, (y += step), '🚪', 'Clear all 5 zones to reach the door and free Datapolis!');

    // ---- Start button ----
    this.startButton(cx, cardY + cardH - 46, '▶  Start the Mission!');

    // The press that opened this briefing (the avatar-picker's Play! button sits at
    // nearly the same spot) can bleed into the first frame and trip Start, skipping
    // the screen. Ignore input briefly so the briefing actually stays up.
    this.input.enabled = false;
    this.time.delayedCall(300, () => {
      this.input.enabled = true;
    });
  }

  private row(x: number, y: number, icon: string, text: string): void {
    this.add.text(x, y, icon, { fontFamily: 'Arial, sans-serif', fontSize: '32px' }).setOrigin(0, 0.5);
    this.add
      .text(x + 56, y, text, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '23px',
        color: '#eaf6ff',
        wordWrap: { width: 920 },
        lineSpacing: 4,
      })
      .setOrigin(0, 0.5);
  }

  private startButton(x: number, y: number, label: string): void {
    const btn = this.add
      .text(x, y, label, {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '32px',
        color: '#06202a',
        backgroundColor: '#43e97b',
        padding: { x: 40, y: 16 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setBackgroundColor('#38f9d7'));
    btn.on('pointerout', () => btn.setBackgroundColor('#43e97b'));
    btn.on('pointerdown', () => this.scene.start('GameScene'));
  }
}
