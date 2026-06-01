// Player — vanilla-feel platformer physics + a proper procedural kid avatar.
// The avatar has a head (hair + face), a shirt torso, two arms ending in hands,
// and two separate legs ending in shoes. A 2-frame walk cycle swaps the stride
// while moving on the ground; an idle frame is used when still or airborne.
// Mirrors legacy/GAME/screens/bias-breaker.js movement + the SVG kid look.

import Phaser from 'phaser';
import {
  PLAYER_W,
  PLAYER_H,
  GRAVITY_PER_S,
  JUMP_SPEED_PER_S,
  WALK_SPEED_PER_S,
  FRICTION,
} from '../constants';

const TEX_IDLE = 'player-idle';
const TEX_WALK0 = 'player-walk0';
const TEX_WALK1 = 'player-walk1';
const STEP_INTERVAL = 7; // frames between walk-cycle swaps

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
  private stepTimer = 0;
  private walkFrame = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    ensureKidTextures(scene);
    this.sprite = scene.physics.add.sprite(x, y, TEX_IDLE);
    this.sprite.setOrigin(0.5, 1); // anchor at feet so y = ground line
    this.sprite.setSize(PLAYER_W * 0.6, PLAYER_H * 0.95); // tighter body box than art
    this.sprite.setDepth(60);
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
      this.sprite.setVelocityX(body.velocity.x * FRICTION);
    }

    if (jump && body.blocked.down) {
      this.sprite.setVelocityY(JUMP_SPEED_PER_S);
    }

    this.animate(body, goLeft || goRight);
  }

  // Walk-cycle: while moving on the ground, alternate the two stride frames;
  // otherwise show the idle frame.
  private animate(body: Phaser.Physics.Arcade.Body, moving: boolean): void {
    const onGround = body.blocked.down;
    if (moving && onGround) {
      this.stepTimer++;
      if (this.stepTimer >= STEP_INTERVAL) {
        this.stepTimer = 0;
        this.walkFrame = this.walkFrame === 0 ? 1 : 0;
      }
      this.sprite.setTexture(this.walkFrame === 0 ? TEX_WALK0 : TEX_WALK1);
    } else {
      this.stepTimer = STEP_INTERVAL; // next step swaps immediately
      this.sprite.setTexture(TEX_IDLE);
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

// ---- Procedural kid avatar ----------------------------------------------
// Three frames: idle (legs together), walk0 (left foot fwd), walk1 (right fwd).
// Drawn facing right; the sprite flips horizontally for leftward travel.

function ensureKidTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEX_IDLE)) return;
  drawKid(scene, TEX_IDLE, 0);
  drawKid(scene, TEX_WALK0, 1);
  drawKid(scene, TEX_WALK1, -1);
}

function drawKid(scene: Phaser.Scene, key: string, stride: number): void {
  const w = PLAYER_W;
  const h = PLAYER_H;
  const g = scene.add.graphics({ x: 0, y: 0 });

  const SKIN = 0xfcd9a8;
  const SHIRT = 0x43e97b;
  const SHIRT_DK = 0x2bc063;
  const PANTS = 0x3a4d6a;
  const SHOE = 0x26334d;
  const HAIR = 0x6b4a2b;

  const cx = w / 2;
  const hipY = h * 0.6;
  const shoulderY = h * 0.36;
  const footY = h - 4;
  const s = stride * 7; // horizontal foot offset for the stride

  // ---- Legs (drawn first, behind the torso) ----
  drawLimb(g, PANTS, cx - 7, hipY, cx - 7 + s, footY, 9);
  drawLimb(g, PANTS, cx + 7, hipY, cx + 7 - s, footY, 9);
  // Shoes
  g.fillStyle(SHOE);
  g.fillEllipse(cx - 7 + s + 3, footY, 16, 9);
  g.fillEllipse(cx + 7 - s + 3, footY, 16, 9);

  // ---- Arms (swing opposite the legs) ----
  drawLimb(g, SHIRT_DK, cx - 13, shoulderY + 2, cx - 14 - s, hipY + 6, 7);
  drawLimb(g, SHIRT_DK, cx + 13, shoulderY + 2, cx + 14 + s, hipY + 6, 7);
  // Hands
  g.fillStyle(SKIN);
  g.fillCircle(cx - 14 - s, hipY + 7, 5);
  g.fillCircle(cx + 14 + s, hipY + 7, 5);

  // ---- Torso (shirt) ----
  g.fillStyle(SHIRT);
  g.fillRoundedRect(cx - 14, shoulderY, 28, hipY - shoulderY + 6, 7);
  // Collar accent
  g.fillStyle(SHIRT_DK);
  g.fillRoundedRect(cx - 14, shoulderY, 28, 8, 4);

  // ---- Head ----
  const headR = w * 0.3;
  const headY = h * 0.2;
  g.fillStyle(SKIN);
  g.fillCircle(cx, headY, headR);
  // Hair (top cap)
  g.fillStyle(HAIR);
  g.slice(cx, headY, headR + 1, Math.PI * 1.05, Math.PI * 1.95, false);
  g.fillPath();
  g.fillRect(cx - headR, headY - 4, headR * 2, 5);
  // Eyes (facing right)
  g.fillStyle(0x1a1a1a);
  g.fillCircle(cx + 2, headY - 1, 2.4);
  g.fillCircle(cx + 11, headY - 1, 2.4);
  // Smile
  g.lineStyle(2, 0x1a1a1a, 1);
  g.beginPath();
  g.arc(cx + 5, headY + 5, 6, 0.15 * Math.PI, 0.85 * Math.PI);
  g.strokePath();

  g.generateTexture(key, w, h);
  g.destroy();
}

// A simple limb: a quad from a fixed top (joint) to an offset bottom (extremity).
function drawLimb(
  g: Phaser.GameObjects.Graphics,
  color: number,
  topX: number,
  topY: number,
  botX: number,
  botY: number,
  width: number
): void {
  const hw = width / 2;
  g.fillStyle(color);
  g.fillPoints(
    [
      new Phaser.Geom.Point(topX - hw, topY),
      new Phaser.Geom.Point(topX + hw, topY),
      new Phaser.Geom.Point(botX + hw, botY),
      new Phaser.Geom.Point(botX - hw, botY),
    ],
    true
  );
}
