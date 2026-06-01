// Player — vanilla-feel platformer physics + the chosen kid avatar.
// The avatar art lives in ../avatar (shared with the select screen). The player
// reads the saved boy/girl + light/dark choice and animates a 2-frame walk
// cycle on the ground, idle otherwise.

import Phaser from 'phaser';
import {
  PLAYER_W,
  PLAYER_H,
  GRAVITY_PER_S,
  JUMP_SPEED_PER_S,
  WALK_SPEED_PER_S,
  FRICTION,
} from '../constants';
import { loadAvatarChoice, ensureAvatarTextures, avatarTextureKey } from '../avatar';

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
  private readonly texIdle: string;
  private readonly texWalk0: string;
  private readonly texWalk1: string;
  private stepTimer = 0;
  private walkFrame = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    const choice = loadAvatarChoice();
    ensureAvatarTextures(scene, choice.gender, choice.skin);
    this.texIdle = avatarTextureKey(choice.gender, choice.skin, 'idle');
    this.texWalk0 = avatarTextureKey(choice.gender, choice.skin, 'walk0');
    this.texWalk1 = avatarTextureKey(choice.gender, choice.skin, 'walk1');

    this.sprite = scene.physics.add.sprite(x, y, this.texIdle);
    this.sprite.setOrigin(0.5, 1); // anchor at feet so y = ground line
    this.sprite.setSize(PLAYER_W * 0.6, PLAYER_H * 0.95);
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

  private animate(body: Phaser.Physics.Arcade.Body, moving: boolean): void {
    if (moving && body.blocked.down) {
      this.stepTimer++;
      if (this.stepTimer >= STEP_INTERVAL) {
        this.stepTimer = 0;
        this.walkFrame = this.walkFrame === 0 ? 1 : 0;
      }
      this.sprite.setTexture(this.walkFrame === 0 ? this.texWalk0 : this.texWalk1);
    } else {
      this.stepTimer = STEP_INTERVAL;
      this.sprite.setTexture(this.texIdle);
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
