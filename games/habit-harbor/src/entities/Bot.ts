// A helper-bot stuck on a bad habit. Sits on one maze cell; the player drives
// the boat into it to open the rescue quiz. Glitch-red + jittering while stuck,
// calm green + smiling once rescued. Ported from legacy drawBot (habit-harbor.js
// :382-436). Unlike the Tortoise this is a Container (Graphics + a "?" Text),
// because Phaser Graphics can't bake text or shadows into a texture.

import Phaser from 'phaser';
import { CELL, COLOR } from '../constants';

export type BotData = { id: string; c: number; r: number; gate: string };

export class Bot {
  readonly id: string;
  readonly c: number;
  readonly r: number;
  readonly gate: string;
  readonly cxc: number; // cell-centre x (collision target)
  readonly cyc: number; // cell-centre y
  rescued = false;

  private readonly container: Phaser.GameObjects.Container;
  private readonly gfx: Phaser.GameObjects.Graphics;
  private readonly q: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, data: BotData) {
    this.id = data.id;
    this.c = data.c;
    this.r = data.r;
    this.gate = data.gate;
    this.cxc = data.c * CELL + CELL / 2;
    this.cyc = data.r * CELL + CELL / 2;

    this.container = scene.add.container(data.c * CELL, data.r * CELL).setDepth(40);
    this.gfx = scene.add.graphics();
    this.q = scene.add
      .text(CELL / 2, CELL - 14, '?', {
        fontFamily: 'sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        color: '#ffffff',
      })
      .setOrigin(0.5);
    this.container.add([this.gfx, this.q]);
    this.drawBad();
  }

  // Per-frame glitch jitter (legacy sin(t*0.25 + c*1.7)*2). Still once rescued.
  update(animFrame: number): void {
    if (this.rescued) return;
    this.container.x = this.c * CELL + Math.sin(animFrame * 0.25 + this.c * 1.7) * 2;
  }

  rescue(): void {
    this.rescued = true;
    this.container.x = this.c * CELL; // settle (no more jitter)
    this.drawGood();
  }

  private drawBad(): void {
    const g = this.gfx;
    g.clear();
    g.fillStyle(COLOR.botBad, 0.25); // soft glitch glow (no Graphics shadowBlur)
    g.fillRoundedRect(9, 13, 46, 42, 10);
    g.fillStyle(COLOR.botBad, 1);
    g.fillRoundedRect(12, 16, CELL - 24, CELL - 28, 8);
    // antenna + bulb
    g.lineStyle(3, COLOR.botBad, 1);
    g.beginPath();
    g.moveTo(CELL / 2, 16);
    g.lineTo(CELL / 2, 7);
    g.strokePath();
    g.fillStyle(COLOR.botAntennaDot, 1);
    g.fillCircle(CELL / 2, 6, 3);
    // wide worried eyes
    g.fillStyle(0xffffff, 1);
    g.fillCircle(CELL / 2 - 9, 30, 5);
    g.fillCircle(CELL / 2 + 9, 30, 5);
    g.fillStyle(0x1a1a22, 1);
    g.fillCircle(CELL / 2 - 9, 30, 2);
    g.fillCircle(CELL / 2 + 9, 30, 2);
    this.q.setVisible(true);
  }

  private drawGood(): void {
    const g = this.gfx;
    g.clear();
    g.fillStyle(COLOR.botGood, 0.25);
    g.fillRoundedRect(9, 13, 46, 42, 10);
    g.fillStyle(COLOR.botGood, 1);
    g.fillRoundedRect(12, 16, CELL - 24, CELL - 28, 8);
    // calm eyes + smile
    g.fillStyle(COLOR.ink, 1);
    g.fillCircle(CELL / 2 - 9, 30, 3);
    g.fillCircle(CELL / 2 + 9, 30, 3);
    g.lineStyle(2.5, COLOR.ink, 1);
    g.beginPath();
    g.arc(CELL / 2, 34, 8, 0.15 * Math.PI, 0.85 * Math.PI);
    g.strokePath();
    this.q.setVisible(false);
  }
}
