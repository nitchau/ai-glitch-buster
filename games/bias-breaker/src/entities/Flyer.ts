// Flyer entity — port of legacy/GAME/screens/bias-breaker.js:419-495
// (drift animation) + 430-481 (carrier behavior with the v13.3 snap-when-close fix).

import Phaser from 'phaser';
import type { Flyer as FlyerData } from '../level/types';
import type { Solid } from '../level/types';
import { PLAYER_W, PLAYER_H } from '../constants';

export class Flyer {
  readonly data: FlyerData;
  readonly sprite: Phaser.Physics.Arcade.Image;
  readonly label: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, data: FlyerData) {
    this.data = data;
    ensureFlyerTexture(scene, data.type, data.w, data.h, data.color);
    const key = textureKeyFor(data.type, data.color);
    this.sprite = scene.physics.add.image(data.x, data.y, key);
    this.sprite.setOrigin(0, 0);
    this.sprite.setSize(data.w, data.h);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(false);
    body.setImmovable(true);
    // One-way platform: player can only collide from above (lands on top).
    body.checkCollision.down = false;
    body.checkCollision.left = false;
    body.checkCollision.right = false;
    body.checkCollision.up = true;

    this.label = scene.add.text(data.x + data.w / 2, data.y - 28, data.optionText, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '16px',
      color: '#15234a',
      backgroundColor: '#ffffffcc',
      padding: { x: 8, y: 4 },
    });
    this.label.setOrigin(0.5, 0.5);
    this.label.setDepth(50);
  }

  // Per-frame sine drift while live (mirrors legacy lines 484-493).
  // `timeMs` is the cumulative scene time in milliseconds.
  updateDrift(timeMs: number): void {
    if (this.data.state !== 'live') return;
    const t = (Math.sin(timeMs * 0.001 * this.data.driftSpeed + this.data.phase) + 1) * 0.5;
    const newX = this.data.travelLeft + t * (this.data.travelRight - this.data.travelLeft);
    this.data.vx = newX - this.data.x;
    this.data.x = newX;
    this.data.y =
      this.data.baseY +
      Math.cos(timeMs * 0.001 * this.data.driftSpeed * 0.7 + this.data.phase) * 6;
    this.sprite.setPosition(this.data.x, this.data.y);
    this.label.setPosition(this.data.x + this.data.w / 2, this.data.y - 18);
  }

  // Carrier transit toward the next platform. Returns true when arrived.
  // INCLUDES the v13.3 snap-when-close fix (otherwise the lerp tail makes
  // the player visibly hang in the air for ~1.3s).
  updateCarrier(player: Phaser.Physics.Arcade.Sprite, nextSolid: Solid): boolean {
    const targetX = nextSolid.x + 30;
    const targetY = nextSolid.y;
    const remX = targetX - this.data.x;
    const remY = targetY - this.data.y;
    const dist = Math.hypot(remX, remY);

    if (dist < 20) {
      // SNAP — closes the asymptote tail
      this.data.x = targetX;
      this.data.y = targetY;
    } else {
      // Brisk lerp (decay 0.18 vs legacy's original 0.06)
      this.data.x += remX * 0.18;
      this.data.y += remY * 0.18;
    }
    this.sprite.setPosition(this.data.x, this.data.y);
    this.label.setPosition(this.data.x + this.data.w / 2, this.data.y - 18);

    // Lock player to flyer during transit
    const playerBody = player.body as Phaser.Physics.Arcade.Body;
    playerBody.setAllowGravity(false);
    player.setVelocity(0, 0);
    player.setPosition(this.data.x + this.data.w / 2, this.data.y);

    // Arrival
    const arrived = Math.abs(this.data.x - targetX) < 4 && Math.abs(this.data.y - targetY) < 4;
    return arrived;
  }

  // Crashing flyer falls straight down.
  updateCrashing(): void {
    if (this.data.state !== 'crashing') return;
    this.data.y += 5;
    this.sprite.setPosition(this.data.x, this.data.y);
    this.label.setPosition(this.data.x + this.data.w / 2, this.data.y - 18);
    if (this.data.y > 900) {
      this.data.state = 'gone';
      this.destroy();
    }
  }

  destroy(): void {
    this.label.destroy();
    this.sprite.destroy();
  }
}

function textureKeyFor(type: string, color: string): string {
  return 'flyer-' + type + '-' + color.replace('#', '');
}

// Generate a recognizable per-type flyer texture once. Phaser caches it.
function ensureFlyerTexture(
  scene: Phaser.Scene,
  type: string,
  w: number,
  h: number,
  color: string
): void {
  const key = textureKeyFor(type, color);
  if (scene.textures.exists(key)) return;
  const g = scene.add.graphics({ x: 0, y: 0 });
  const tint = Phaser.Display.Color.HexStringToColor(color).color;
  if (type === 'cloud') {
    g.fillStyle(0xffffff);
    g.fillCircle(w * 0.25, h * 0.55, h * 0.4);
    g.fillCircle(w * 0.45, h * 0.4, h * 0.5);
    g.fillCircle(w * 0.65, h * 0.5, h * 0.45);
    g.fillCircle(w * 0.82, h * 0.6, h * 0.35);
    g.fillStyle(tint, 0.4);
    g.fillRect(0, h * 0.7, w, h * 0.2);
  } else if (type === 'bird') {
    g.fillStyle(tint);
    g.fillEllipse(w / 2, h / 2, w, h * 0.6);
    g.fillTriangle(w * 0.1, h * 0.3, w * 0.3, h * 0.5, w * 0.1, h * 0.7);
    g.fillTriangle(w * 0.9, h * 0.3, w * 0.7, h * 0.5, w * 0.9, h * 0.7);
  } else if (type === 'kite') {
    g.fillStyle(tint);
    g.beginPath();
    g.moveTo(w / 2, 0);
    g.lineTo(w, h / 2);
    g.lineTo(w / 2, h);
    g.lineTo(0, h / 2);
    g.closePath();
    g.fillPath();
  } else if (type === 'helicopter') {
    g.fillStyle(tint);
    g.fillRoundedRect(w * 0.15, h * 0.3, w * 0.7, h * 0.5, 10);
    g.fillStyle(0x444444);
    g.fillRect(0, h * 0.1, w, 4);
  } else if (type === 'quadcopter') {
    g.fillStyle(tint);
    g.fillRect(w * 0.4, h * 0.4, w * 0.2, h * 0.2);
    g.fillCircle(w * 0.1, h * 0.2, 8);
    g.fillCircle(w * 0.9, h * 0.2, 8);
    g.fillCircle(w * 0.1, h * 0.8, 8);
    g.fillCircle(w * 0.9, h * 0.8, 8);
  }
  g.generateTexture(key, w, h);
  g.destroy();
}
