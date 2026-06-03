// Rescue quiz overlay — the Phaser port of the legacy DOM modal (habit-harbor.js
// :176-217). A dark scrim + a glassy panel: lead line, an optional friendly nudge
// after a wrong answer, the question, and four tappable choice buttons. The scene
// owns the paused state; this just renders and reports the chosen answer.

import Phaser from 'phaser';
import { toChoices, type Question } from '@gg/shared';

export type Choice = { text: string; isCorrect: boolean };

export class QuizModal {
  private readonly scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  get isOpen(): boolean {
    return this.container !== null;
  }

  open(q: Question, explain: string | null, onPick: (choice: Choice) => void): void {
    this.close();
    const s = this.scene;
    const W = s.scale.width;
    const H = s.scale.height;
    const cx = W / 2;
    const cy = H / 2;
    const pw = 700;
    const ph = 450;
    const px = cx - pw / 2;
    const py = cy - ph / 2;

    const c = s.add.container(0, 0).setScrollFactor(0).setDepth(300);

    // Scrim — swallows clicks/taps behind the modal.
    c.add(s.add.rectangle(cx, cy, W, H, 0x06122e, 0.72).setInteractive());

    // Panel: glow + glassy fill + bright border.
    const g = s.add.graphics();
    for (let i = 3; i >= 1; i--) {
      g.lineStyle(2 + i * 3, 0x38f9d7, 0.05 * i);
      g.strokeRoundedRect(px - i * 2, py - i * 2, pw + i * 4, ph + i * 4, 22 + i * 2);
    }
    g.fillStyle(0x0c1838, 0.98);
    g.fillRoundedRect(px, py, pw, ph, 22);
    g.lineStyle(3, 0x38f9d7, 1);
    g.strokeRoundedRect(px, py, pw, ph, 22);
    c.add(g);

    // Lead line.
    c.add(
      s.add
        .text(cx, py + 34, 'This helper-bot picked up a bad habit:', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '17px',
          color: '#9fb4d8',
        })
        .setOrigin(0.5)
    );

    // Optional friendly nudge (after a wrong answer).
    let qy = py + 92;
    if (explain) {
      c.add(
        s.add
          .text(cx, py + 66, explain, {
            fontFamily: 'Arial Black, sans-serif',
            fontSize: '16px',
            color: '#ffd36b',
            align: 'center',
            wordWrap: { width: pw - 80 },
          })
          .setOrigin(0.5)
      );
      qy = py + 116;
    }

    // Question.
    c.add(
      s.add
        .text(cx, qy, q.question, {
          fontFamily: 'Arial Black, sans-serif',
          fontSize: '22px',
          color: '#ffffff',
          align: 'center',
          wordWrap: { width: pw - 70 },
        })
        .setOrigin(0.5)
    );

    // Four choice buttons, bottom-aligned inside the panel.
    let picked = false;
    const choices = toChoices(q);
    const bw = pw - 100;
    const bh = 50;
    const stepY = bh + 12;
    const startY = py + ph - 49 - (choices.length - 1) * stepY;
    const NORMAL = 0x16264f;
    const HOVER = 0x244a86;
    choices.forEach((ch, i) => {
      const byc = startY + i * stepY;
      const btn = s.add
        .rectangle(cx, byc, bw, bh, NORMAL, 1)
        .setStrokeStyle(2, 0x2f4d86)
        .setInteractive({ useHandCursor: true });
      const label = s.add
        .text(cx, byc, ch.text, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '18px',
          color: '#eaf3ff',
          align: 'center',
          wordWrap: { width: bw - 30 },
        })
        .setOrigin(0.5);
      btn.on('pointerover', () => btn.setFillStyle(HOVER));
      btn.on('pointerout', () => btn.setFillStyle(NORMAL));
      btn.on('pointerdown', () => {
        if (picked) return;
        picked = true;
        onPick(ch);
      });
      c.add(btn);
      c.add(label);
    });

    this.container = c;
  }

  close(): void {
    if (this.container) {
      this.container.destroy(true);
      this.container = null;
    }
  }
}
