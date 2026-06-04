// Rescue quiz overlay — the Phaser port of the legacy DOM modal (habit-harbor.js
// :176-217), redesigned for a sharper, more polished look: a glassy gradient
// panel with a glow + drop shadow, a worried helper-bot icon, crisp (high-
// resolution) text, and rounded answer pills with A/B/C/D badges, hover states,
// and click feedback. The scene owns the paused state; this renders + reports.

import Phaser from 'phaser';
import { TEXT_RES } from '../constants';
import { toChoices, type Question } from '@gg/shared';

export type Choice = { text: string; isCorrect: boolean };

const LETTERS = ['A', 'B', 'C', 'D'];

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
    const pw = 724;
    const ph = 476;
    const px = cx - pw / 2;
    const py = cy - ph / 2;

    const c = s.add.container(0, 0).setScrollFactor(0).setDepth(300);

    // Dimming scrim — swallows clicks/taps behind the modal.
    c.add(s.add.rectangle(cx, cy, W, H, 0x05101f, 0.8).setInteractive());

    // Panel: drop shadow + outer glow + glassy fill + bright border + top sheen.
    const g = s.add.graphics();
    g.fillStyle(0x03070f, 0.5);
    g.fillRoundedRect(px + 5, py + 12, pw, ph, 26);
    for (let i = 4; i >= 1; i--) {
      g.lineStyle(2 + i * 3, 0x35d0ff, 0.05 * i);
      g.strokeRoundedRect(px - i * 2, py - i * 2, pw + i * 4, ph + i * 4, 26 + i * 2);
    }
    g.fillStyle(0x0e2247, 1);
    g.fillRoundedRect(px, py, pw, ph, 26);
    g.fillStyle(0xffffff, 0.05);
    g.fillRoundedRect(px + 9, py + 9, pw - 18, ph * 0.26, 18);
    g.lineStyle(2.5, 0x4fe3ff, 0.95);
    g.strokeRoundedRect(px, py, pw, ph, 26);
    c.add(g);

    // Worried helper-bot icon in the header.
    const icon = s.add.graphics();
    drawMiniBot(icon, cx, py + 50);
    c.add(icon);

    // Lead line.
    c.add(
      s.add
        .text(cx, py + 92, 'This helper-bot picked up a bad habit:', {
          fontFamily: 'Arial, sans-serif',
          fontSize: '16px',
          color: '#9fc0e8',
          resolution: TEXT_RES,
        })
        .setOrigin(0.5)
    );

    // Optional friendly nudge (after a wrong answer) — an amber chip.
    let qy = py + 134;
    if (explain) {
      const chip = s.add
        .text(cx, py + 118, explain, {
          fontFamily: 'Arial Black, sans-serif',
          fontSize: '15px',
          color: '#0c1830',
          backgroundColor: '#ffd36b',
          align: 'center',
          padding: { x: 14, y: 7 },
          wordWrap: { width: pw - 150 },
          resolution: TEXT_RES,
        })
        .setOrigin(0.5);
      c.add(chip);
      qy = py + 118 + chip.height / 2 + 34;
    }

    // Question.
    c.add(
      s.add
        .text(cx, qy, q.question, {
          fontFamily: 'Arial Black, sans-serif',
          fontSize: '24px',
          color: '#ffffff',
          align: 'center',
          wordWrap: { width: pw - 96 },
          stroke: '#06122e',
          strokeThickness: 4,
          resolution: TEXT_RES,
        })
        .setOrigin(0.5)
    );

    // Four answer pills, bottom-aligned inside the panel.
    let picked = false;
    const choices = toChoices(q);
    const bw = pw - 108;
    const bh = 56;
    const step = bh + 14;
    const lastY = py + ph - 44;
    const startY = lastY - (choices.length - 1) * step;

    choices.forEach((ch, i) => {
      const byc = startY + i * step;
      const btn = s.add.container(0, 0);
      const pill = s.add.graphics();
      const drawPill = (fill: number, border: number, borderAlpha = 1) => {
        pill.clear();
        pill.fillStyle(fill, 1);
        pill.fillRoundedRect(cx - bw / 2, byc - bh / 2, bw, bh, bh / 2);
        pill.lineStyle(2, border, borderAlpha);
        pill.strokeRoundedRect(cx - bw / 2, byc - bh / 2, bw, bh, bh / 2);
      };
      drawPill(0x16335f, 0x2f63a8);
      // A/B/C/D badge.
      const badgeX = cx - bw / 2 + 34;
      const badge = s.add.graphics();
      badge.fillStyle(0x4fe3ff, 1);
      badge.fillCircle(badgeX, byc, 17);
      const badgeText = s.add
        .text(badgeX, byc, LETTERS[i] ?? '?', {
          fontFamily: 'Arial Black, sans-serif',
          fontSize: '18px',
          color: '#06202a',
          resolution: TEXT_RES,
        })
        .setOrigin(0.5);
      const label = s.add
        .text(cx + 20, byc, ch.text, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '19px',
          color: '#eaf3ff',
          align: 'center',
          wordWrap: { width: bw - 130 },
          resolution: TEXT_RES,
        })
        .setOrigin(0.5);
      const hit = s.add
        .rectangle(cx, byc, bw, bh, 0xffffff, 0.001)
        .setInteractive({ useHandCursor: true });
      btn.add([pill, badge, badgeText, label, hit]);
      c.add(btn);

      hit.on('pointerover', () => {
        if (!picked) drawPill(0x21518f, 0x4fe3ff);
      });
      hit.on('pointerout', () => {
        if (!picked) drawPill(0x16335f, 0x2f63a8);
      });
      hit.on('pointerdown', () => {
        if (picked) return;
        picked = true;
        if (ch.isCorrect) {
          drawPill(0x1f7a4a, 0x43e97b);
          s.tweens.add({ targets: btn, scaleX: 1.03, scaleY: 1.03, duration: 120, yoyo: true });
        } else {
          drawPill(0x7a2230, 0xf5576c);
          s.tweens.add({ targets: btn, x: { from: -7, to: 0 }, duration: 90, repeat: 2, yoyo: true });
        }
        s.time.delayedCall(260, () => onPick(ch));
      });
    });

    // Pop-in.
    c.setScale(0.94);
    c.setAlpha(0.6);
    s.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 180, ease: 'Back.out' });

    this.container = c;
  }

  close(): void {
    if (this.container) {
      this.container.destroy(true);
      this.container = null;
    }
  }
}

// A small worried glitch-bot, centred at (x, y) — the header mascot.
function drawMiniBot(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
  g.fillStyle(0xe7402f, 0.22);
  g.fillRoundedRect(x - 24, y - 22, 48, 46, 14);
  g.fillStyle(0xd83b2b, 1);
  g.fillRoundedRect(x - 20, y - 18, 40, 38, 11);
  g.fillStyle(0xff6f5f, 0.5);
  g.fillRoundedRect(x - 16, y - 15, 32, 10, 6);
  // antenna + glowing bulb
  g.lineStyle(3, 0xd83b2b, 1);
  g.beginPath();
  g.moveTo(x, y - 18);
  g.lineTo(x, y - 27);
  g.strokePath();
  g.fillStyle(0xffd34d, 0.35);
  g.fillCircle(x, y - 29, 6);
  g.fillStyle(0xffd34d, 1);
  g.fillCircle(x, y - 29, 3);
  // dark face screen + worried eyes
  g.fillStyle(0x2a0d0a, 1);
  g.fillRoundedRect(x - 15, y - 7, 30, 17, 6);
  g.fillStyle(0xffffff, 1);
  g.fillCircle(x - 7, y - 1, 3.4);
  g.fillCircle(x + 7, y - 1, 3.4);
  g.fillStyle(0x10171f, 1);
  g.fillCircle(x - 7, y - 2, 1.6);
  g.fillCircle(x + 7, y - 2, 1.6);
  // frown
  g.lineStyle(2, 0xffffff, 0.85);
  g.beginPath();
  g.arc(x, y + 9, 4, Math.PI * 1.15, Math.PI * 1.85);
  g.strokePath();
}
