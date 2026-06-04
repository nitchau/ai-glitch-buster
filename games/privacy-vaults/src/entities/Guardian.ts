// The player's Guardian — a procedural top-down hooded sneaker. MANUAL movement
// (no Arcade body): GameScene passes a hitsWall(px,py) probe and we resolve each
// axis separately so the Guardian slides along walls. Mirrors habit-harbor's Boat;
// faces the direction of travel.

import Phaser from 'phaser';
import { CELL, GUARDIAN_SPEED_PER_S, COLOR } from '../constants';

const TEX = 'guardian';

export type Dir = { left: boolean; right: boolean; up: boolean; down: boolean };

export class Guardian {
  readonly sprite: Phaser.GameObjects.Sprite;
  px: number;
  py: number;
  facing = 0; // radians; texture is drawn facing +x
  private bobT = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    if (!scene.textures.exists(TEX)) generateGuardianTexture(scene);
    this.px = x;
    this.py = y;
    this.sprite = scene.add.sprite(x, y, TEX).setDepth(50);
  }

  update(dir: Dir, dtSec: number, hitsWall: (px: number, py: number) => boolean): void {
    this.bobT += 1;
    const dx = (dir.right ? 1 : 0) - (dir.left ? 1 : 0);
    const dy = (dir.down ? 1 : 0) - (dir.up ? 1 : 0);
    const step = GUARDIAN_SPEED_PER_S * dtSec;
    if (dx !== 0) {
      const nx = this.px + dx * step;
      if (!hitsWall(nx, this.py)) this.px = nx;
    }
    if (dy !== 0) {
      const ny = this.py + dy * step;
      if (!hitsWall(this.px, ny)) this.py = ny;
    }
    if (dx !== 0 || dy !== 0) this.facing = Math.atan2(dy, dx);
    const bob = Math.sin(this.bobT * 0.18) * 1.2;
    this.sprite.setPosition(this.px, this.py + bob).setRotation(this.facing);
  }

  /** Hard teleport (used by the "spotted" reset later). */
  setPos(x: number, y: number): void {
    this.px = x;
    this.py = y;
    this.sprite.setPosition(x, y);
  }
}

// A hooded Guardian seen from above, facing +x (a skin face peeks from the hood).
function generateGuardianTexture(scene: Phaser.Scene): void {
  const S = 72;
  const cx = S / 2;
  const cy = S / 2;
  const R = CELL * 0.34;
  const g = scene.add.graphics({ x: 0, y: 0 });
  // cloak (outline + body)
  g.fillStyle(COLOR.guardianCloakDk, 1);
  g.fillCircle(cx, cy, R + 2.5);
  g.fillStyle(COLOR.guardianCloak, 1);
  g.fillCircle(cx, cy, R);
  // hood toward the back (-x)
  g.fillStyle(COLOR.guardianHood, 0.92);
  g.fillCircle(cx - R * 0.26, cy, R * 0.82);
  // face peeking at the front (+x)
  g.fillStyle(COLOR.skin, 1);
  g.fillCircle(cx + R * 0.45, cy, R * 0.4);
  // eyes looking forward
  g.fillStyle(COLOR.ink, 1);
  g.fillCircle(cx + R * 0.64, cy - R * 0.15, 2.2);
  g.fillCircle(cx + R * 0.64, cy + R * 0.15, 2.2);
  g.generateTexture(TEX, S, S);
  g.destroy();
}
