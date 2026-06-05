// Clean-modern question renderer for the Privacy Vault Tetris. Draws a privacy
// question + four rounded A/B/C/D answer buttons INSIDE a given rect of the right-
// hand panel (no board-covering scrim — the board stays fully visible so the locked
// block is seen drifting + landing while you answer). The scene owns the game phase;
// this just renders the question and reports which choice was tapped.

import Phaser from 'phaser';
import { TEXT_RES, COLOR } from '../constants';
import { toChoices, type Question } from '@gg/shared';

export type Choice = { text: string; isCorrect: boolean };
export type Rect = { x: number; y: number; w: number; h: number };

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

  open(q: Question, rect: Rect, onPick: (choice: Choice) => void): void {
    this.close();
    const s = this.scene;
    const { x, y, w, h } = rect;
    const cx = x + w / 2;

    const c = s.add.container(0, 0).setDepth(200);

    // Question (wrapped) at the top of the rect.
    c.add(
      s.add
        .text(cx, y, q.question, {
          fontFamily: 'Arial Black, Arial, sans-serif',
          fontSize: '17px',
          color: '#3b456a',
          align: 'center',
          wordWrap: { width: w - 8 },
          resolution: TEXT_RES,
        })
        .setOrigin(0.5, 0),
    );

    // Four answer buttons fill the lower part of the rect.
    let picked = false;
    const choices = toChoices(q);
    const qReserve = 96; // space reserved for the question text
    const gap = 11;
    const bw = w;
    const bh = Math.min(58, (h - qReserve - gap * (choices.length - 1)) / choices.length);
    const top = y + qReserve;

    choices.forEach((ch, i) => {
      const by = top + i * (bh + gap) + bh / 2;
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

      const badgeX = cx - bw / 2 + 24;
      const badge = s.add.graphics();
      badge.fillStyle(COLOR.accent, 1);
      badge.fillCircle(badgeX, by, 13);
      const badgeText = s.add
        .text(badgeX, by, LETTERS[i] ?? '?', {
          fontFamily: 'Arial Black, sans-serif',
          fontSize: '14px',
          color: '#ffffff',
          resolution: TEXT_RES,
        })
        .setOrigin(0.5);
      const label = s.add
        .text(badgeX + 22, by, ch.text, {
          fontFamily: 'Arial',
          fontSize: '15px',
          color: '#3b456a',
          wordWrap: { width: bw - 72 },
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
        } else {
          draw(0xfcdfe1, 0xef9a9a);
          s.tweens.add({ targets: label, x: { from: badgeX + 17, to: badgeX + 22 }, duration: 70, repeat: 2, yoyo: true });
        }
        s.time.delayedCall(220, () => onPick(ch));
      });
    });

    c.setAlpha(0);
    s.tweens.add({ targets: c, alpha: 1, duration: 140 });
    this.container = c;
  }

  close(): void {
    if (this.container) {
      this.container.destroy(true);
      this.container = null;
    }
  }
}
