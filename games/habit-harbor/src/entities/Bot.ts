// A helper-bot stuck on a bad habit. Sits on one maze cell; the player drives the
// boat into it to open the rescue quiz. A cute screen-faced robot: glitch-red +
// worried + jittering while stuck, calm green + smiling once rescued. Ported in
// spirit from legacy drawBot (habit-harbor.js:382-436). A single redrawable
// Graphics (positioned at the cell), so the bad→good swap is one repaint and the
// jitter is just an x nudge.

import Phaser from 'phaser';
import { CELL } from '../constants';

export type BotData = { id: string; c: number; r: number; gate: string };

export class Bot {
  readonly id: string;
  readonly c: number;
  readonly r: number;
  readonly gate: string;
  readonly cxc: number; // cell-centre x (collision target)
  readonly cyc: number; // cell-centre y
  rescued = false;

  private readonly gfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, data: BotData) {
    this.id = data.id;
    this.c = data.c;
    this.r = data.r;
    this.gate = data.gate;
    this.cxc = data.c * CELL + CELL / 2;
    this.cyc = data.r * CELL + CELL / 2;
    this.gfx = scene.add.graphics({ x: data.c * CELL, y: data.r * CELL }).setDepth(40);
    this.drawBad();
  }

  // Per-frame glitch jitter (legacy sin(t*0.25 + c*1.7)*2). Still once rescued.
  update(animFrame: number): void {
    if (this.rescued) return;
    this.gfx.x = this.c * CELL + Math.sin(animFrame * 0.25 + this.c * 1.7) * 2;
  }

  rescue(): void {
    this.rescued = true;
    this.gfx.x = this.c * CELL; // settle (no more jitter)
    this.drawGood();
  }

  // All coordinates are local to the cell (0..CELL).
  private drawBad(): void {
    const g = this.gfx;
    g.clear();
    this.body(g, 0xe7402f, 0xd83b2b, 0xff6f5f, 0x8e1f14, 0xffd34d);
    // dark face screen + worried eyes
    g.fillStyle(0x2a0d0a, 1);
    g.fillRoundedRect(17, 27, 30, 17, 7);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(25, 35, 4);
    g.fillCircle(39, 35, 4);
    g.fillStyle(0x10171f, 1);
    g.fillCircle(25, 34, 1.8);
    g.fillCircle(39, 34, 1.8);
    // frown
    g.lineStyle(2, 0xffd9d2, 0.9);
    g.beginPath();
    g.arc(32, 43, 4, Math.PI * 1.15, Math.PI * 1.85);
    g.strokePath();
  }

  private drawGood(): void {
    const g = this.gfx;
    g.clear();
    this.body(g, 0x43e97b, 0x2bbf63, 0x8bf3ac, 0x1c8a47, 0xeafff2);
    // calm screen + happy eyes + smile
    g.fillStyle(0x06281a, 1);
    g.fillRoundedRect(17, 27, 30, 17, 7);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(25, 34, 3.2);
    g.fillCircle(39, 34, 3.2);
    g.lineStyle(2.5, 0xffffff, 1);
    g.beginPath();
    g.arc(32, 36, 5, 0.12 * Math.PI, 0.88 * Math.PI);
    g.strokePath();
    // sparkle
    g.fillStyle(0xffffff, 0.95);
    star(g, 49, 18, 4);
  }

  // Shared robot chassis: glow, body, top gloss, bottom shade, antenna + bulb.
  private body(
    g: Phaser.GameObjects.Graphics,
    glow: number,
    base: number,
    gloss: number,
    shade: number,
    bulb: number
  ): void {
    g.fillStyle(glow, 0.22);
    g.fillRoundedRect(6, 12, 52, 46, 14);
    g.fillStyle(base, 1);
    g.fillRoundedRect(10, 16, 44, 40, 12);
    g.fillStyle(gloss, 0.5);
    g.fillRoundedRect(13, 18, 38, 11, 7);
    g.fillStyle(shade, 0.45);
    g.fillRoundedRect(12, 47, 40, 8, 6);
    // side bolts
    g.fillStyle(shade, 0.8);
    g.fillCircle(13, 37, 2);
    g.fillCircle(51, 37, 2);
    // antenna + glowing bulb
    g.lineStyle(3, base, 1);
    g.beginPath();
    g.moveTo(32, 16);
    g.lineTo(32, 6);
    g.strokePath();
    g.fillStyle(bulb, 0.35);
    g.fillCircle(32, 5, 5);
    g.fillStyle(bulb, 1);
    g.fillCircle(32, 5, 3);
  }
}

// A small 4-point sparkle.
function star(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number): void {
  g.fillPoints(
    [
      new Phaser.Geom.Point(x, y - r),
      new Phaser.Geom.Point(x + r * 0.28, y - r * 0.28),
      new Phaser.Geom.Point(x + r, y),
      new Phaser.Geom.Point(x + r * 0.28, y + r * 0.28),
      new Phaser.Geom.Point(x, y + r),
      new Phaser.Geom.Point(x - r * 0.28, y + r * 0.28),
      new Phaser.Geom.Point(x - r, y),
      new Phaser.Geom.Point(x - r * 0.28, y - r * 0.28),
    ],
    true
  );
}
