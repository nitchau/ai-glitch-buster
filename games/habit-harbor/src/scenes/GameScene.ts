// The harbor maze scene. Milestone A = static render (water / docks / gates /
// exit) + a movable boat with per-axis dock collision. Bots, the rescue quiz,
// gate-opening, the HUD and the win flow arrive in later milestones.

import Phaser from 'phaser';
import { CANVAS_W, CANVAS_H, CELL, COLS, ROWS, BOAT_R, RESCUE_TOTAL, COLOR } from '../constants';
import { buildMaze, isWall, type MazeModel, type OpenGates } from '../maze';
import { Boat, type Dir } from '../entities/Boat';

declare const __TEST_SEAM__: boolean;

type KeyName = 'left' | 'right' | 'up' | 'down' | 'A' | 'D' | 'W' | 'S';
type Keys = Record<KeyName, Phaser.Input.Keyboard.Key>;
type DpadDir = 'left' | 'right' | 'up' | 'down';

type GameState = {
  openGates: OpenGates;
  paused: boolean;
  rescued: number;
  timeMs: number;
  animFrame: number;
  won: boolean;
};

export class GameScene extends Phaser.Scene {
  private maze!: MazeModel;
  private boat!: Boat;
  private keys!: Keys;
  private gateGfx!: Phaser.GameObjects.Graphics;
  private dpad: Record<DpadDir, boolean> = { left: false, right: false, up: false, down: false };
  private state!: GameState;

  constructor() {
    super('GameScene');
  }

  create(): void {
    try {
      localStorage.setItem('gg.activeIsland', 'habit-harbor');
    } catch {
      /* ignore */
    }

    this.maze = buildMaze();
    this.state = { openGates: {}, paused: false, rescued: 0, timeMs: 0, animFrame: 0, won: false };

    this.cameras.main.setBounds(0, 0, CANVAS_W, CANVAS_H);
    this.cameras.main.setBackgroundColor('#0a2738');

    this.drawWater();
    this.drawDocks();
    this.gateGfx = this.add.graphics().setDepth(20);
    this.drawGates();
    this.drawExit();

    const sx = this.maze.spawn.c * CELL + CELL / 2;
    const sy = this.maze.spawn.r * CELL + CELL / 2;
    this.boat = new Boat(this, sx, sy);

    this.keys = this.input.keyboard!.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      W: Phaser.Input.Keyboard.KeyCodes.W,
      S: Phaser.Input.Keyboard.KeyCodes.S,
    }) as Keys;
    this.buildDpad();

    if (__TEST_SEAM__) {
      (window as unknown as { __GAME_STATE__: () => unknown }).__GAME_STATE__ = () => ({
        rescued: this.state.rescued,
        total: RESCUE_TOTAL,
        timeMs: this.state.timeMs,
        paused: this.state.paused,
        won: this.state.won,
        px: this.boat.px,
        py: this.boat.py,
      });
    }
  }

  update(_time: number, delta: number): void {
    if (this.state.paused || this.state.won) return;
    this.state.animFrame++;
    this.state.timeMs += delta;

    const dir: Dir = {
      left: this.keys.left.isDown || this.keys.A.isDown || this.dpad.left,
      right: this.keys.right.isDown || this.keys.D.isDown || this.dpad.right,
      up: this.keys.up.isDown || this.keys.W.isDown || this.dpad.up,
      down: this.keys.down.isDown || this.keys.S.isDown || this.dpad.down,
    };
    this.boat.update(dir, delta / 1000, (px, py) => this.hitsWall(px, py));
  }

  // The boat's bounding box (±BOAT_R) overlaps up to four cells — block if ANY is
  // solid. Ported from legacy hitsWall (habit-harbor.js:112).
  private hitsWall(px: number, py: number): boolean {
    const c0 = Math.floor((px - BOAT_R) / CELL);
    const c1 = Math.floor((px + BOAT_R) / CELL);
    const r0 = Math.floor((py - BOAT_R) / CELL);
    const r1 = Math.floor((py + BOAT_R) / CELL);
    for (let rr = r0; rr <= r1; rr++) {
      for (let cc = c0; cc <= c1; cc++) {
        if (isWall(this.maze, cc, rr, this.state.openGates)) return true;
      }
    }
    return false;
  }

  // ---- static rendering ----------------------------------------------------

  private drawWater(): void {
    const g = this.add.graphics().setDepth(0);
    g.fillGradientStyle(COLOR.waterTop, COLOR.waterTop, COLOR.waterBot, COLOR.waterBot, 1);
    g.fillRect(0, 0, CANVAS_W, CANVAS_H);
    g.lineStyle(2, COLOR.ripple, 0.06);
    for (let y = 14; y < CANVAS_H; y += 24) {
      g.beginPath();
      for (let x = 0; x <= CANVAS_W; x += 14) {
        const yy = y + Math.sin(x * 0.045 + y * 0.12) * 3;
        if (x === 0) g.moveTo(x, yy);
        else g.lineTo(x, yy);
      }
      g.strokePath();
    }
  }

  private drawDocks(): void {
    const g = this.add.graphics().setDepth(10);
    const isDock = (c: number, r: number): boolean =>
      r < 0 || r >= ROWS || c < 0 || c >= COLS ? false : this.maze.grid[r]?.[c] === '#';
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.maze.grid[r]?.[c] !== '#') continue;
        const x = c * CELL;
        const y = r * CELL;
        g.fillGradientStyle(COLOR.dockTop, COLOR.dockTop, COLOR.dockBot, COLOR.dockBot, 1);
        g.fillRect(x, y, CELL, CELL);
        // plank seam
        g.lineStyle(1, COLOR.dockSeam, 0.3);
        g.beginPath();
        g.moveTo(x, y + CELL / 2);
        g.lineTo(x + CELL, y + CELL / 2);
        g.strokePath();
        // light rims where the dock meets water (top/left), dark rims (bottom/right)
        if (!isDock(c, r - 1)) this.rim(g, x, y + 1, x + CELL, y + 1, COLOR.dockRimLight, 0.45);
        if (!isDock(c - 1, r)) this.rim(g, x + 1, y, x + 1, y + CELL, COLOR.dockRimLight, 0.22);
        if (!isDock(c, r + 1)) this.rim(g, x, y + CELL - 1, x + CELL, y + CELL - 1, COLOR.dockRimDark, 0.55);
        if (!isDock(c + 1, r)) this.rim(g, x + CELL - 1, y, x + CELL - 1, y + CELL, COLOR.dockRimDark, 0.45);
      }
    }
  }

  private rim(
    g: Phaser.GameObjects.Graphics,
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    color: number,
    alpha: number
  ): void {
    g.lineStyle(2, color, alpha);
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.strokePath();
  }

  // Re-rendered whenever a gate opens (called again from the rescue flow later).
  private drawGates(): void {
    const g = this.gateGfx;
    g.clear();
    for (const gate of this.maze.gates) {
      const x = gate.c * CELL;
      const y = gate.r * CELL;
      const my = y + CELL / 2;
      if (this.state.openGates[gate.id]) {
        // open: two faded posts
        g.fillStyle(COLOR.gatePost, 0.5);
        g.fillRect(x + 4, my - 12, 6, 24);
        g.fillRect(x + CELL - 10, my - 12, 6, 24);
      } else {
        // closed: dark bar with yellow hazard stripes
        g.fillStyle(COLOR.gateBody, 1);
        g.fillRoundedRect(x + 6, my - 9, CELL - 12, 18, 5);
        g.fillStyle(COLOR.gateStripe, 1);
        const span = CELL - 16;
        for (let i = 0; i < 5; i++) {
          const sx = x + 8 + (i * span) / 5;
          g.fillPoints(
            [
              new Phaser.Geom.Point(sx, my - 8),
              new Phaser.Geom.Point(sx + 7, my - 8),
              new Phaser.Geom.Point(sx + 2, my + 8),
              new Phaser.Geom.Point(sx - 5, my + 8),
            ],
            true
          );
        }
      }
    }
  }

  private drawExit(): void {
    const x = this.maze.exit.c * CELL;
    const y = this.maze.exit.r * CELL;
    const g = this.add.graphics().setDepth(15);
    for (let i = 3; i >= 1; i--) {
      g.fillStyle(COLOR.exit, (0.12 * i) / 3);
      g.fillRoundedRect(x + 6 - i * 3, y + 6 - i * 3, CELL - 12 + i * 6, CELL - 12 + i * 6, 10 + i * 2);
    }
    g.fillStyle(COLOR.exit, 0.85);
    g.fillRoundedRect(x + 6, y + 6, CELL - 12, CELL - 12, 10);
    this.add
      .text(x + CELL / 2, y + CELL / 2, '⛵', { fontFamily: 'sans-serif', fontSize: `${Math.round(CELL * 0.42)}px` })
      .setOrigin(0.5)
      .setDepth(16);
    this.tweens.add({ targets: g, alpha: { from: 0.75, to: 1 }, duration: 900, yoyo: true, repeat: -1 });
  }

  // ---- touch D-pad (booth tablets) ----------------------------------------

  private buildDpad(): void {
    const cx = 82;
    const cy = CANVAS_H - 86;
    const make = (x: number, y: number, label: string, key: DpadDir): void => {
      const btn = this.add
        .rectangle(x, y, 46, 46, 0x14224a, 0.82)
        .setStrokeStyle(2, 0x43e97b)
        .setScrollFactor(0)
        .setDepth(200)
        .setInteractive({ useHandCursor: true });
      this.add
        .text(x, y, label, { fontFamily: 'Arial', fontSize: '22px', color: '#cfeefe' })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(201);
      const set = (v: boolean) => () => {
        this.dpad[key] = v;
      };
      btn.on('pointerdown', set(true));
      btn.on('pointerup', set(false));
      btn.on('pointerout', set(false));
    };
    make(cx, cy - 46, '▲', 'up');
    make(cx, cy + 46, '▼', 'down');
    make(cx - 50, cy, '◄', 'left');
    make(cx + 50, cy, '►', 'right');
  }
}
