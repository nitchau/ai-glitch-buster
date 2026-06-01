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
  private carrySwing = 0; // 0 = on top, 1 = fully hanging below (hang carry only)
  private rotor: Phaser.GameObjects.Rectangle | null = null; // helicopter spinning blade
  private rotorPhase = 0;
  private carryStarted = false;
  private carryStartX = 0;
  private carryStartY = 0;

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

    // Helicopter: a separate main-rotor blade that spins (foreshortens) on top.
    if (data.type === 'helicopter') {
      this.rotor = scene.add
        .rectangle(data.x + data.w / 2, data.y + 3, data.w * 0.84, 5, 0xdfeaff)
        .setDepth(6);
    }

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

  // Per-frame sine drift while live (mirrors legacy lines 484-493). `animFrame`
  // is the scene's integer frame counter — the SAME clock the vanilla rAF loop
  // used, so the drift speed matches (keying it off elapsed ms ran ~60x slow).
  updateDrift(animFrame: number): void {
    if (this.data.state !== 'live') return;
    const t = (Math.sin(animFrame * this.data.driftSpeed + this.data.phase) + 1) * 0.5;
    const newX = this.data.travelLeft + t * (this.data.travelRight - this.data.travelLeft);
    this.data.vx = newX - this.data.x;
    this.data.x = newX;
    this.data.y =
      this.data.baseY + Math.cos(animFrame * this.data.driftSpeed * 0.7 + this.data.phase) * 6;
    this.sprite.setPosition(this.data.x, this.data.y);
    this.label.setPosition(this.data.x + this.data.w / 2, this.data.y - 18);
    this.updateRotor();
  }

  // Carrier transit toward the next platform. `mode` picks the ride:
  //   'top'  — stand on top (cloud / bird), straight brisk lerp.
  //   'hang' — dangle underneath (kite / quadcopter); the flyer rides higher.
  //   'ride' — helicopter: stand on top and fly across in a little up-and-over
  //            arc instead of a straight line.
  // Returns true when arrived. Includes the v13.3 snap-when-close fix.
  updateCarrier(
    player: Phaser.Physics.Arcade.Sprite,
    nextSolid: Solid,
    mode: 'top' | 'hang' | 'ride' = 'top'
  ): boolean {
    const hang = mode === 'hang';
    const ride = mode === 'ride';
    const targetX = nextSolid.x + 30;
    // When hanging the flyer rides higher so the dangling player lands feet-first.
    const targetY = hang ? nextSolid.y - PLAYER_H - this.data.h : nextSolid.y;

    if (!this.carryStarted) {
      this.carryStarted = true;
      this.carryStartX = this.data.x;
      this.carryStartY = this.data.y;
    }

    if (ride) {
      // Fly-up arc: glide across at a steady pace with an ease-in (t^2) descent,
      // so the sine bump reads as a clear up-and-over hop no matter the heights
      // (a plain linear descent buried the lift when starting high).
      const span = targetX - this.carryStartX;
      const step = Math.max(4, Math.abs(span) * 0.05);
      this.data.x =
        span >= 0
          ? Math.min(targetX, this.data.x + step)
          : Math.max(targetX, this.data.x - step);
      const t = span !== 0 ? Math.min(1, Math.max(0, (this.data.x - this.carryStartX) / span)) : 1;
      const baseY = this.carryStartY + (targetY - this.carryStartY) * t * t;
      this.data.y = baseY - 140 * Math.sin(Math.PI * t);
    } else {
      const remX = targetX - this.data.x;
      const remY = targetY - this.data.y;
      if (Math.hypot(remX, remY) < 20) {
        this.data.x = targetX;
        this.data.y = targetY;
      } else {
        this.data.x += remX * 0.18;
        this.data.y += remY * 0.18;
      }
    }

    this.sprite.setPosition(this.data.x, this.data.y);
    this.label.setPosition(this.data.x + this.data.w / 2, this.data.y - 18);
    this.updateRotor();

    // Lock player to flyer during transit.
    const playerBody = player.body as Phaser.Physics.Arcade.Body;
    playerBody.setAllowGravity(false);
    player.setVelocity(0, 0);
    if (hang) {
      // Swing smoothly from on-top to hanging-below over the first frames.
      this.carrySwing = Math.min(1, this.carrySwing + 0.1);
      const topFeet = this.data.y;
      const hangFeet = this.data.y + this.data.h + PLAYER_H;
      const feet = topFeet + (hangFeet - topFeet) * this.carrySwing;
      player.setPosition(this.data.x + this.data.w / 2, feet);
    } else {
      player.setPosition(this.data.x + this.data.w / 2, this.data.y);
    }

    // Arrival (ride matches on x — the arc lands y at the platform when t hits 1).
    const arrivedX = Math.abs(this.data.x - targetX) < 4;
    return ride ? arrivedX : arrivedX && Math.abs(this.data.y - targetY) < 4;
  }

  // Helicopter main rotor: the blade foreshortens (scaleX) as it spins, fast.
  private updateRotor(): void {
    if (!this.rotor) return;
    this.rotorPhase += 0.8;
    this.rotor.setPosition(this.data.x + this.data.w / 2, this.data.y + 3);
    this.rotor.setScale(Math.max(0.08, Math.abs(Math.cos(this.rotorPhase))), 1);
  }

  // Crashing flyer falls and dissolves (the "becomes rain" effect on a wrong
  // answer). Fades out as it drops; the GameScene spawns the rain droplets.
  updateCrashing(): void {
    if (this.data.state !== 'crashing') return;
    this.data.y += 8;
    this.sprite.setPosition(this.data.x, this.data.y);
    this.sprite.setAlpha(Math.max(0, this.sprite.alpha - 0.05));
    this.label.setAlpha(Math.max(0, this.label.alpha - 0.08));
    this.label.setPosition(this.data.x + this.data.w / 2, this.data.y - 18);
    if (this.rotor) {
      this.rotor.setPosition(this.data.x + this.data.w / 2, this.data.y + 3);
      this.rotor.setAlpha(Math.max(0, this.rotor.alpha - 0.05));
    }
    if (this.data.y > 900 || this.sprite.alpha <= 0) {
      this.data.state = 'gone';
      this.destroy();
    }
  }

  destroy(): void {
    this.label.destroy();
    this.sprite.destroy();
    this.rotor?.destroy();
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
  const DARK = 0x12233f;
  if (type === 'cloud') {
    g.fillStyle(0xffffff);
    g.fillCircle(w * 0.25, h * 0.55, h * 0.4);
    g.fillCircle(w * 0.45, h * 0.4, h * 0.5);
    g.fillCircle(w * 0.65, h * 0.5, h * 0.45);
    g.fillCircle(w * 0.82, h * 0.6, h * 0.35);
    g.fillStyle(tint, 0.4);
    g.fillRect(0, h * 0.7, w, h * 0.2);
  } else if (type === 'bird') {
    // Seagull silhouette: two wings up (an "M"), a body, head + beak.
    g.fillStyle(tint);
    g.fillTriangle(w * 0.5, h * 0.74, w * 0.03, h * 0.1, w * 0.44, h * 0.5);
    g.fillTriangle(w * 0.5, h * 0.74, w * 0.97, h * 0.1, w * 0.56, h * 0.5);
    g.fillEllipse(w * 0.5, h * 0.6, w * 0.2, h * 0.55);
    g.fillCircle(w * 0.5, h * 0.4, h * 0.16);
    g.fillStyle(0xffb000); // beak
    g.fillTriangle(w * 0.5, h * 0.24, w * 0.45, h * 0.4, w * 0.55, h * 0.4);
    g.fillStyle(DARK); // eyes
    g.fillCircle(w * 0.46, h * 0.4, 1.8);
    g.fillCircle(w * 0.54, h * 0.4, 1.8);
  } else if (type === 'kite') {
    // Diamond with cross-struts and a little bow tail.
    const kb = h * 0.7;
    g.fillStyle(tint);
    g.beginPath();
    g.moveTo(w * 0.5, 0);
    g.lineTo(w * 0.88, kb * 0.45);
    g.lineTo(w * 0.5, kb);
    g.lineTo(w * 0.12, kb * 0.45);
    g.closePath();
    g.fillPath();
    g.lineStyle(2, 0xffffff, 0.6);
    g.beginPath();
    g.moveTo(w * 0.5, 0);
    g.lineTo(w * 0.5, kb);
    g.strokePath();
    g.beginPath();
    g.moveTo(w * 0.12, kb * 0.45);
    g.lineTo(w * 0.88, kb * 0.45);
    g.strokePath();
    g.lineStyle(2, 0xffffff, 0.8); // tail
    g.beginPath();
    g.moveTo(w * 0.5, kb);
    g.lineTo(w * 0.42, h * 0.86);
    g.lineTo(w * 0.58, h);
    g.strokePath();
    g.fillStyle(0xff6b9d); // tail bows
    g.fillTriangle(w * 0.47, kb + 3, w * 0.4, kb - 1, w * 0.4, kb + 7);
    g.fillTriangle(w * 0.5, kb + 6, w * 0.57, kb + 2, w * 0.57, kb + 10);
  } else if (type === 'helicopter') {
    // Main rotor is a separate spinning overlay (see the Flyer constructor).
    g.fillStyle(DARK);
    g.fillRect(w * 0.5, 6, 4, h * 0.22); // mast
    g.fillStyle(tint);
    g.fillRect(w * 0.1, h * 0.46, w * 0.42, h * 0.13); // tail boom
    g.fillTriangle(w * 0.12, h * 0.32, w * 0.12, h * 0.62, w * 0.02, h * 0.47); // tail fin
    g.fillStyle(DARK);
    g.fillRect(w * 0.04, h * 0.28, 3, h * 0.42); // tail rotor
    g.fillStyle(tint);
    g.fillEllipse(w * 0.64, h * 0.56, w * 0.46, h * 0.62); // cabin
    g.fillStyle(0xbfe9ff); // cockpit window
    g.fillEllipse(w * 0.76, h * 0.52, w * 0.16, h * 0.34);
    g.lineStyle(3, DARK, 1); // skids
    g.beginPath();
    g.moveTo(w * 0.46, h * 0.96);
    g.lineTo(w * 0.82, h * 0.96);
    g.strokePath();
    g.beginPath();
    g.moveTo(w * 0.56, h * 0.84);
    g.lineTo(w * 0.56, h * 0.96);
    g.strokePath();
    g.beginPath();
    g.moveTo(w * 0.72, h * 0.84);
    g.lineTo(w * 0.72, h * 0.96);
    g.strokePath();
  } else if (type === 'quadcopter') {
    g.lineStyle(4, DARK, 1); // X arms
    const arms: ReadonlyArray<readonly [number, number]> = [
      [0.13, 0.26],
      [0.87, 0.26],
      [0.13, 0.86],
      [0.87, 0.86],
    ];
    for (const [ex, ey] of arms) {
      g.beginPath();
      g.moveTo(w * 0.5, h * 0.55);
      g.lineTo(w * ex, h * ey);
      g.strokePath();
    }
    g.fillStyle(tint, 0.5); // spinning rotor discs
    g.fillEllipse(w * 0.13, h * 0.26, w * 0.24, h * 0.32);
    g.fillEllipse(w * 0.87, h * 0.26, w * 0.24, h * 0.32);
    g.fillEllipse(w * 0.13, h * 0.86, w * 0.24, h * 0.32);
    g.fillEllipse(w * 0.87, h * 0.86, w * 0.24, h * 0.32);
    g.fillStyle(DARK); // hubs
    g.fillCircle(w * 0.13, h * 0.26, 3);
    g.fillCircle(w * 0.87, h * 0.26, 3);
    g.fillCircle(w * 0.13, h * 0.86, 3);
    g.fillCircle(w * 0.87, h * 0.86, 3);
    g.fillStyle(tint); // body
    g.fillRoundedRect(w * 0.4, h * 0.34, w * 0.2, h * 0.46, 5);
    g.fillStyle(DARK); // camera
    g.fillCircle(w * 0.5, h * 0.82, 3.5);
  }
  g.generateTexture(key, w, h);
  g.destroy();
}
