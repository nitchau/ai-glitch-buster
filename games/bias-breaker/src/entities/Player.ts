// Player — port of vanilla physics + a procedural kid avatar.
// Mirrors legacy/GAME/screens/bias-breaker.js:1342-1364 (movement) and the
// SVG kid in legacy/GAME/screens/bias-breaker-avatar.js (simplified for Phaser).

import Phaser from 'phaser';
import {
  PLAYER_W,
  PLAYER_H,
  GRAVITY_PER_S,
  JUMP_SPEED_PER_S,
  WALK_SPEED_PER_S,
  FRICTION,
} from '../constants';

const TEXTURE_KEY = 'player-kid';

export type PlayerKeys = {
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
  up: Phaser.Input.Keyboard.Key;
  A: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
  W: Phaser.Input.Keyboard.Key;
  SPACE: Phaser.Input.Keyboard.Key;
};

export class Player {
  readonly sprite: Phaser.Physics.Arcade.Sprite;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    if (!scene.textures.exists(TEXTURE_KEY)) {
      generateKidTexture(scene);
    }
    this.sprite = scene.physics.add.sprite(x, y, TEXTURE_KEY);
    this.sprite.setOrigin(0.5, 1); // anchor at feet so y = ground line
    this.sprite.setSize(PLAYER_W * 0.7, PLAYER_H); // physics box slightly narrower than art
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setGravityY(GRAVITY_PER_S);
    this.sprite.setMaxVelocity(WALK_SPEED_PER_S * 1.2, 1400);
  }

  update(keys: PlayerKeys): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const goLeft = keys.left.isDown || keys.A.isDown;
    const goRight = keys.right.isDown || keys.D.isDown;
    const jump = keys.SPACE.isDown || keys.W.isDown || keys.up.isDown;

    if (goLeft) {
      this.sprite.setVelocityX(-WALK_SPEED_PER_S);
      this.sprite.setFlipX(true);
    } else if (goRight) {
      this.sprite.setVelocityX(WALK_SPEED_PER_S);
      this.sprite.setFlipX(false);
    } else if (body.blocked.down) {
      // Friction on ground (per-frame multiplier from vanilla -> per-frame at 60fps here)
      this.sprite.setVelocityX(body.velocity.x * FRICTION);
    }

    if (jump && body.blocked.down) {
      this.sprite.setVelocityY(JUMP_SPEED_PER_S);
    }
  }

  setPosition(x: number, y: number): void {
    this.sprite.setPosition(x, y);
    this.sprite.setVelocity(0, 0);
  }

  get x(): number {
    return this.sprite.x;
  }

  get y(): number {
    return this.sprite.y;
  }
}

function generateKidTexture(scene: Phaser.Scene): void {
  const w = PLAYER_W;
  const h = PLAYER_H;
  const g = scene.add.graphics({ x: 0, y: 0 });
  // Pants
  g.fillStyle(0x3a4d6a);
  g.fillRect(8, h * 0.65, w - 16, h * 0.32);
  // Shirt
  g.fillStyle(0x43e97b);
  g.fillRect(6, h * 0.32, w - 12, h * 0.38);
  // Arms (sticks)
  g.fillStyle(0xfce8b8);
  g.fillRect(0, h * 0.35, 8, h * 0.30);
  g.fillRect(w - 8, h * 0.35, 8, h * 0.30);
  // Head
  g.fillStyle(0xfce8b8);
  g.fillCircle(w / 2, h * 0.20, w * 0.32);
  // Hair (top cap)
  g.fillStyle(0xd4a449);
  g.slice(w / 2, h * 0.20, w * 0.32, Math.PI, Math.PI * 2, false);
  g.fillPath();
  // Eyes
  g.fillStyle(0x222222);
  g.fillCircle(w * 0.42, h * 0.22, 2);
  g.fillCircle(w * 0.58, h * 0.22, 2);
  // Smile
  g.lineStyle(2, 0x222222);
  g.beginPath();
  g.arc(w / 2, h * 0.26, w * 0.10, 0.2 * Math.PI, 0.8 * Math.PI);
  g.strokePath();
  g.generateTexture(TEXTURE_KEY, w, h);
  g.destroy();
}
