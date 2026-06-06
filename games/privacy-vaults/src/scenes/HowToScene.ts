// HowToScene — the "Vault Manual" briefing shown before the Tetris board. Reached
// from PreloadScene; hands off to GameScene. Renders in the logical CANVAS space with
// the camera zoomed by RENDER_SCALE and text at TEXT_RES (same crisp-text pattern as
// GameScene). Clean-modern light theme: pulls the game's COLOR palette so the card
// chrome matches the in-game info panels. Secret-agent "security clearance" voice.

import Phaser from 'phaser';
import { CANVAS_W, CANVAS_H, RENDER_SCALE, TEXT_RES, COLOR } from '../constants';

export class HowToScene extends Phaser.Scene {
  constructor() {
    super('HowToScene');
  }

  create(): void {
    const cx = CANVAS_W / 2;
    this.cameras.main.setBackgroundColor('#e7edf9');
    this.cameras.main.setZoom(RENDER_SCALE);
    this.cameras.main.centerOn(CANVAS_W / 2, CANVAS_H / 2);

    // ---- Manual card (matches the in-game white panels) ----
    const cardW = 642;
    const cardH = 566;
    const cardX = cx - cardW / 2;
    const cardY = CANVAS_H / 2 - cardH / 2;
    const g = this.add.graphics();
    g.fillStyle(COLOR.boardShadow, 0.45);
    g.fillRoundedRect(cardX + 3, cardY + 8, cardW, cardH, 22);
    g.fillStyle(COLOR.rail, 1);
    g.fillRoundedRect(cardX, cardY, cardW, cardH, 22);
    g.lineStyle(2, COLOR.accent, 1);
    g.strokeRoundedRect(cardX, cardY, cardW, cardH, 22);

    // ---- Title + greeting ----
    this.add
      .text(cx, cardY + 52, '🔐  VAULT MANUAL', {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '32px',
        color: '#6f8cff',
        resolution: TEXT_RES,
      })
      .setOrigin(0.5);
    this.add
      .text(cx, cardY + 98, 'Welcome, Privacy Agent! Stack the blocks\nand keep your secrets safe. 🛡️', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
        color: '#3b456a',
        align: 'center',
        lineSpacing: 5,
        resolution: TEXT_RES,
      })
      .setOrigin(0.5);

    // ---- How-to rows ----
    const rowX = cardX + 40;
    let y = cardY + 170;
    const step = 69;
    this.row(rowX, y, '🔒', 'Each block drops LOCKED. Answer the privacy question to UNLOCK it.');
    this.row(rowX, (y += step), '🕹️', 'Then steer it:  ◄ ►  move  •  ⟳  rotate  •  ▼  drop   (or tap the buttons).');
    this.row(rowX, (y += step), '🧱', 'Fill a whole row across to clear a line.');
    this.row(rowX, (y += step), '🏆', 'Clear 5 lines to seal the vault and win!');
    this.row(rowX, (y += step), '😌', 'Too slow? The block just lands and a fresh question comes — no game-over.');

    // ---- Start button ----
    this.startButton(cx, cardY + cardH - 42, '🔓  Crack the Vault!');

    // Defensive: ignore input for a beat so a press that reached this screen can't
    // bleed into the first frame and trip Start (mirrors Bias Breaker's HowToScene).
    this.input.enabled = false;
    this.time.delayedCall(300, () => {
      this.input.enabled = true;
    });
  }

  private row(x: number, y: number, icon: string, text: string): void {
    this.add
      .text(x, y, icon, { fontFamily: 'Arial, sans-serif', fontSize: '23px', resolution: TEXT_RES })
      .setOrigin(0, 0.5);
    this.add
      .text(x + 46, y, text, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        color: '#5b67a6',
        wordWrap: { width: 510 },
        lineSpacing: 3,
        resolution: TEXT_RES,
      })
      .setOrigin(0, 0.5);
  }

  private startButton(x: number, y: number, label: string): void {
    const btn = this.add
      .text(x, y, label, {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '22px',
        color: '#ffffff',
        backgroundColor: '#6f8cff',
        padding: { x: 34, y: 13 },
        resolution: TEXT_RES,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setBackgroundColor('#8aa2ff'));
    btn.on('pointerout', () => btn.setBackgroundColor('#6f8cff'));
    btn.on('pointerdown', () => this.scene.start('GameScene'));
  }
}
