// The player's rowboat — a procedural top-down sprite with MANUAL movement.
// No Arcade body: GameScene passes a `hitsWall(px,py)` probe and we resolve each
// axis separately (legacy updateBoat) so the boat slides along docks instead of
// sticking. Speed is frame-rate-independent: BOAT_SPEED_PER_S * dtSec.

import Phaser from 'phaser';
import { CELL, BOAT_SPEED_PER_S, COLOR } from '../constants';

const TEX = 'boat';

export type Dir = { left: boolean; right: boolean; up: boolean; down: boolean };

export class Boat {
  readonly sprite: Phaser.GameObjects.Sprite;
  px: number;
  py: number;
  angle = 0;
  private bobT = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    if (!scene.textures.exists(TEX)) generateBoatTexture(scene);
    this.px = x;
    this.py = y;
    this.sprite = scene.add.sprite(x, y, TEX).setDepth(50);
  }

  // dir = combined keyboard + D-pad; dtSec = delta/1000; hitsWall probes the maze.
  update(dir: Dir, dtSec: number, hitsWall: (px: number, py: number) => boolean): void {
    this.bobT += 1;
    const dx = (dir.right ? 1 : 0) - (dir.left ? 1 : 0);
    const dy = (dir.down ? 1 : 0) - (dir.up ? 1 : 0);
    const step = BOAT_SPEED_PER_S * dtSec;

    // Resolve X then Y independently so a blocked axis still lets the other slide.
    if (dx !== 0) {
      const nx = this.px + dx * step;
      if (!hitsWall(nx, this.py)) this.px = nx;
    }
    if (dy !== 0) {
      const ny = this.py + dy * step;
      if (!hitsWall(this.px, ny)) this.py = ny;
    }

    // Face the last direction of travel (texture is drawn bow-right = angle 0).
    if (dx > 0) this.angle = 0;
    else if (dx < 0) this.angle = Math.PI;
    else if (dy > 0) this.angle = Math.PI / 2;
    else if (dy < 0) this.angle = -Math.PI / 2;

    const bob = Math.sin(this.bobT * 0.06) * 1.5;
    this.sprite.setPosition(this.px, this.py + bob).setRotation(this.angle);
  }
}

// Draw the rowboat once into a cached texture, bow pointing +x, centred in 96×96.
function generateBoatTexture(scene: Phaser.Scene): void {
  const S = 96;
  const cx = S / 2;
  const cy = S / 2;
  const hl = CELL * 0.58; // hull half-length
  const hw = CELL * 0.3; // hull half-width
  const g = scene.add.graphics({ x: 0, y: 0 });

  const pt = (x: number, y: number): Phaser.Geom.Point => new Phaser.Geom.Point(cx + x, cy + y);

  // Hull — pointed bow (+x), rounded stern (-x), as an 8-point polygon.
  const hull = [
    pt(hl, 0),
    pt(hl * 0.5, -hw * 1.05),
    pt(-hl * 0.5, -hw),
    pt(-hl * 0.85, -hw * 0.7),
    pt(-hl * 1.08, 0),
    pt(-hl * 0.85, hw * 0.7),
    pt(-hl * 0.5, hw),
    pt(hl * 0.5, hw * 1.05),
  ];
  g.fillStyle(COLOR.boatHull, 1);
  g.fillPoints(hull, true);
  g.lineStyle(3, COLOR.boatHullDark, 1);
  g.strokePoints(hull, true);

  // Deck — a lighter inset so the hull reads as having depth.
  const deck = [
    pt(hl * 0.8, 0),
    pt(hl * 0.35, -hw * 0.72),
    pt(-hl * 0.45, -hw * 0.66),
    pt(-hl * 0.85, 0),
    pt(-hl * 0.45, hw * 0.66),
    pt(hl * 0.35, hw * 0.72),
  ];
  g.fillStyle(COLOR.boatDeck, 1);
  g.fillPoints(deck, true);

  // Bench seat across the middle.
  g.fillStyle(COLOR.boatSeat, 1);
  g.fillRect(cx - hl * 0.22, cy - hw * 0.85, hl * 0.22, hw * 1.7);

  // Oars (behind the kid), angled back toward the stern.
  g.lineStyle(3, COLOR.oar, 1);
  g.beginPath();
  g.moveTo(cx - hl * 0.1, cy - hw * 0.5);
  g.lineTo(cx - hl * 0.55, cy - hw * 1.75);
  g.strokePath();
  g.beginPath();
  g.moveTo(cx - hl * 0.1, cy + hw * 0.5);
  g.lineTo(cx - hl * 0.55, cy + hw * 1.75);
  g.strokePath();
  g.fillStyle(COLOR.oarBlade, 1);
  g.fillEllipse(cx - hl * 0.6, cy - hw * 1.95, 14, 8);
  g.fillEllipse(cx - hl * 0.6, cy + hw * 1.95, 14, 8);

  // Kid rower, facing the bow (+x): shirt, hair, face.
  g.fillStyle(COLOR.kidShirt, 1);
  g.fillRoundedRect(cx - hl * 0.3, cy - hw * 0.45, hl * 0.36, hw * 0.9, 6);
  g.fillStyle(COLOR.kidHair, 1);
  g.fillCircle(cx + hl * 0.04, cy, hw * 0.5);
  g.fillStyle(COLOR.kidFace, 1);
  g.fillCircle(cx + hl * 0.08, cy, hw * 0.36);

  g.generateTexture(TEX, S, S);
  g.destroy();
}
