// HowToScene — the "Captain's Orders" briefing shown before the maze. Reached from
// PreloadScene; hands off to GameScene. Renders in the logical CANVAS space with the
// camera zoomed by RENDER_SCALE (crisp shapes) and text at TEXT_RES — same pattern as
// GameScene/CelebrationScene. Nautical theme: deep-teal bg, gold + green accents.

import Phaser from 'phaser';
import { CANVAS_W, CANVAS_H, RENDER_SCALE, TEXT_RES } from '../constants';

export class HowToScene extends Phaser.Scene {
  constructor() {
    super('HowToScene');
  }

  create(): void {
    const cx = CANVAS_W / 2;
    this.cameras.main.setBackgroundColor('#0a2738');
    this.cameras.main.setZoom(RENDER_SCALE);
    this.cameras.main.centerOn(CANVAS_W / 2, CANVAS_H / 2);

    // ---- Briefing card ----
    const cardW = 824;
    const cardH = 474;
    const cardX = cx - cardW / 2;
    const cardY = CANVAS_H / 2 - cardH / 2;
    const g = this.add.graphics();
    g.fillStyle(0x000000, 0.3);
    g.fillRoundedRect(cardX + 4, cardY + 8, cardW, cardH, 20);
    g.fillStyle(0x0c3a4a, 0.96);
    g.fillRoundedRect(cardX, cardY, cardW, cardH, 20);
    g.lineStyle(3, 0x43e97b, 1);
    g.strokeRoundedRect(cardX, cardY, cardW, cardH, 20);

    // ---- Title + greeting ----
    this.add
      .text(cx, cardY + 48, '⚓  CAPTAIN’S ORDERS', {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '34px',
        color: '#ffce3a',
        resolution: TEXT_RES,
      })
      .setOrigin(0.5);
    this.add
      .text(cx, cardY + 96, 'Ahoy! Five helper-bots caught BAD HABITS.\nSail out and bring every one of them home. 🌊', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '17px',
        color: '#cfeefe',
        align: 'center',
        lineSpacing: 5,
        resolution: TEXT_RES,
      })
      .setOrigin(0.5);

    // ---- How-to rows ----
    const rowX = cardX + 56;
    let y = cardY + 168;
    const step = 56;
    this.row(rowX, y, '🕹️', 'Steer with Arrow keys / WASD — or the ◄ ▲ ▼ ► buttons on screen');
    this.row(rowX, (y += step), '🤖', 'Bump your boat into a red, glitchy bot to start a quiz');
    this.row(rowX, (y += step), '✅', 'Pick the kind, honest answer → the bot turns green and a gate opens');
    this.row(rowX, (y += step), '🙅', 'Got it wrong? No worries — we never sink you. Just try again!');
    this.row(rowX, (y += step), '⛵', 'Free all 5 bots, then sail to the glowing harbor mouth to win!');

    // ---- Start button ----
    this.startButton(cx, cardY + cardH - 38, '⛵  Set Sail!');

    // Defensive: ignore input for a beat so a press that reached this screen can't
    // bleed into the first frame and trip Start (mirrors Bias Breaker's HowToScene).
    this.input.enabled = false;
    this.time.delayedCall(300, () => {
      this.input.enabled = true;
    });
  }

  private row(x: number, y: number, icon: string, text: string): void {
    this.add
      .text(x, y, icon, { fontFamily: 'Arial, sans-serif', fontSize: '24px', resolution: TEXT_RES })
      .setOrigin(0, 0.5);
    this.add
      .text(x + 44, y, text, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        color: '#eaf6ff',
        wordWrap: { width: 700 },
        lineSpacing: 3,
        resolution: TEXT_RES,
      })
      .setOrigin(0, 0.5);
  }

  private startButton(x: number, y: number, label: string): void {
    const btn = this.add
      .text(x, y, label, {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '23px',
        color: '#06202a',
        backgroundColor: '#43e97b',
        padding: { x: 30, y: 12 },
        resolution: TEXT_RES,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setBackgroundColor('#38f9d7'));
    btn.on('pointerout', () => btn.setBackgroundColor('#43e97b'));
    btn.on('pointerdown', () => this.scene.start('GameScene'));
  }
}
