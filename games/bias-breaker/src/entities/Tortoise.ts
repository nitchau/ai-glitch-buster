// Tortoise — a slow Mario-style mini-enemy that walks the current platform.
// Port of legacy/GAME/screens/bias-breaker.js:696-827 (spawn / walk / death /
// draw). Moves MANUALLY per-frame (t.x += t.vx) exactly like the vanilla rAF
// loop — it is NOT an Arcade-physics body, so the 1.0 px/frame speed and the
// hand-rolled AABB stomp check stay bit-for-bit faithful to v13.1's tuning.

import Phaser from 'phaser';
import { TORTOISE_W, TORTOISE_H, TORTOISE_DEATH_FRAMES } from '../constants';

const TEXTURE_KEY = 'tortoise';

export type TortoiseStatus = 'alive' | 'despawn';

export class Tortoise {
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly sectionIdx: number;
  x: number;
  y: number;
  vx: number; // px/frame (+ = right, - = left)
  alive = true;
  private deadFrame = 0;

  constructor(
    scene: Phaser.Scene,
    sectionIdx: number,
    x: number,
    y: number,
    vx: number
  ) {
    if (!scene.textures.exists(TEXTURE_KEY)) generateTortoiseTexture(scene);
    this.sectionIdx = sectionIdx;
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.sprite = scene.add.sprite(x, y, TEXTURE_KEY).setOrigin(0, 0).setDepth(40);
    this.sprite.setFlipX(vx < 0); // head faces travel direction
  }

  /**
   * Advance one frame. While alive it walks; once killed it plays the pancake
   * fade. Returns 'despawn' when it walks off the platform edge or the death
   * animation has finished — the caller then destroys it.
   */
  update(animFrame: number, solidX: number, solidW: number): TortoiseStatus {
    if (!this.alive) {
      const prog = (animFrame - this.deadFrame) / TORTOISE_DEATH_FRAMES;
      this.sprite.y = this.y + prog * 22; // pancake down (legacy line 786)
      this.sprite.setAlpha(Math.max(0, 1 - prog));
      return prog >= 1 ? 'despawn' : 'alive';
    }
    this.x += this.vx;
    this.sprite.x = this.x;
    if (this.vx > 0 && this.x > solidX + solidW + 10) return 'despawn';
    if (this.vx < 0 && this.x + TORTOISE_W < solidX - 10) return 'despawn';
    return 'alive';
  }

  kill(animFrame: number): void {
    this.alive = false;
    this.deadFrame = animFrame;
  }

  destroy(): void {
    this.sprite.destroy();
  }
}

// Procedural shell + head + legs, drawn facing right (flipX handles leftward).
// Port of legacy drawTortoise (lines 789-825) collapsed into a static texture.
function generateTortoiseTexture(scene: Phaser.Scene): void {
  const w = TORTOISE_W;
  const h = TORTOISE_H;
  const g = scene.add.graphics({ x: 0, y: 0 });
  // Shell
  g.fillStyle(0x4a7c3a);
  g.fillEllipse(w / 2, h / 2, w - 8, h - 8);
  // Shell pattern (3 dots)
  g.fillStyle(0x2c4f24);
  for (let i = 0; i < 3; i++) g.fillCircle(16 + i * 12, 14, 4);
  // Head (right side, faces travel)
  g.fillStyle(0xa8d090);
  g.fillEllipse(w - 6, h * 0.6, 16, 14);
  // Eye
  g.fillStyle(0x111111);
  g.fillCircle(w - 3, h * 0.55, 2);
  // Legs (4 ovals)
  g.fillStyle(0xa8d090);
  const legY = h - 4;
  [12, 22, 34, 44].forEach((lx) => g.fillEllipse(lx, legY, 8, 6));
  g.generateTexture(TEXTURE_KEY, w, h);
  g.destroy();
}
