// Clean-modern question tray for the Privacy Vault Tetris. A light card that fades
// up from the bottom while a piece is locked: a privacy question + four rounded
// answer buttons (A/B/C/D) with hover and correct/wrong feedback. The scene owns the
// game phase; this just renders the question and reports which choice was tapped.

import Phaser from 'phaser';
import { CANVAS_W, CANVAS_H, TEXT_RES, COLOR } from '../constants';
import { toChoices, type Question } from '@gg/shared';

export type Choice = { text: string; isCorrect: boolean };

const LETTERS = ['A', 'B', 'C', 'D'];

export class QuizCard {
  private readonly scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  get isOpen(): boolean {
    return this.container !== null;
  }

  open(q: Question, onPick: (choice: Choice) => void): void {
    this.close();
    const s = this.scene;
    const cardX = 18;
    const cardW = CANVAS_W - 36;
    const cardTop = 360;
    const cardBottom = CANVAS_H - 16;
    const cardH = cardBottom - cardTop;
    const cx = CANVAS_W / 2;

    const c = s.add.container(0, 0).setDepth(300);

    // Light scrim — focuses attention while keeping the board faintly visible.
    c.add(s.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, CANVAS_W, CANVAS_H, 0x1b2547, 0.16).setInteractive());

    // Card: soft drop shadow + white panel + border.
    const g = s.add.graphics();
    g.fillStyle(COLOR.boardShadow, 0.5);
    g.fillRoundedRect(cardX, cardTop + 8, cardW, cardH, 20);
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(cardX, cardTop, cardW, cardH, 20);
    g.lineStyle(2, COLOR.railEdge, 1);
    g.strokeRoundedRect(cardX, cardTop, cardW, cardH, 20);
    c.add(g);

    c.add(
      s.add
        .text(cx, cardTop + 24, '🔒  Answer to take control', {
          fontFamily: 'Arial',
          fontSize: '15px',
          color: '#8b96b4',
          resolution: TEXT_RES,
        })
        .setOrigin(0.5),
    );

    c.add(
      s.add
        .text(cx, cardTop + 50, q.question, {
          fontFamily: 'Arial Black, Arial, sans-serif',
          fontSize: '19px',
          color: '#3b456a',
          align: 'center',
          wordWrap: { width: cardW - 56 },
          resolution: TEXT_RES,
        })
        .setOrigin(0.5, 0),
    );

    // Four answer buttons, bottom-aligned inside the card.
    let picked = false;
    const choices = toChoices(q);
    const bw = cardW - 44;
    const bh = 44;
    const stepY = bh + 10;
    const lastY = cardBottom - 14 - bh / 2;
    const startY = lastY - (choices.length - 1) * stepY;

    choices.forEach((ch, i) => {
      const by = startY + i * stepY;
      const btn = s.add.container(0, 0);
      const pill = s.add.graphics();
      const draw = (fill: number, border: number): void => {
        pill.clear();
        pill.fillStyle(fill, 1);
        pill.fillRoundedRect(cx - bw / 2, by - bh / 2, bw, bh, 12);
        pill.lineStyle(2, border, 1);
        pill.strokeRoundedRect(cx - bw / 2, by - bh / 2, bw, bh, 12);
      };
      draw(0xffffff, COLOR.railEdge);

      const badgeX = cx - bw / 2 + 26;
      const badge = s.add.graphics();
      badge.fillStyle(COLOR.accent, 1);
      badge.fillCircle(badgeX, by, 14);
      const badgeText = s.add
        .text(badgeX, by, LETTERS[i] ?? '?', {
          fontFamily: 'Arial Black, sans-serif',
          fontSize: '15px',
          color: '#ffffff',
          resolution: TEXT_RES,
        })
        .setOrigin(0.5);
      const label = s.add
        .text(badgeX + 26, by, ch.text, {
          fontFamily: 'Arial',
          fontSize: '16px',
          color: '#3b456a',
          wordWrap: { width: bw - 88 },
          resolution: TEXT_RES,
        })
        .setOrigin(0, 0.5);
      const hit = s.add.rectangle(cx, by, bw, bh, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      btn.add([pill, badge, badgeText, label, hit]);
      c.add(btn);

      hit.on('pointerover', () => {
        if (!picked) draw(0xeef2ff, COLOR.accent);
      });
      hit.on('pointerout', () => {
        if (!picked) draw(0xffffff, COLOR.railEdge);
      });
      hit.on('pointerdown', () => {
        if (picked) return;
        picked = true;
        if (ch.isCorrect) {
          draw(0xdaf3e0, 0x43c06d);
          s.tweens.add({ targets: btn, scaleX: 1.02, scaleY: 1.02, duration: 110, yoyo: true });
        } else {
          draw(0xfcdfe1, 0xef9a9a);
          s.tweens.add({ targets: btn, x: { from: -6, to: 0 }, duration: 80, repeat: 2, yoyo: true });
        }
        s.time.delayedCall(240, () => onPick(ch));
      });
    });

    c.setAlpha(0);
    c.y = 16;
    s.tweens.add({ targets: c, alpha: 1, y: 0, duration: 160, ease: 'Quad.out' });
    this.container = c;
  }

  close(): void {
    if (this.container) {
      this.container.destroy(true);
      this.container = null;
    }
  }
}
