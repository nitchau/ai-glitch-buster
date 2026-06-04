// The vault scene. Milestone A = static render (floor/walls/cover/leaks/exit/entry)
// + the Guardian with per-axis wall collision + the supersampled camera. Patrol
// bots + vision cones (B), leak-seal quiz + win (C) arrive next.

import Phaser from 'phaser';
import {
  CANVAS_W,
  CANVAS_H,
  CELL,
  COLS,
  ROWS,
  GUARDIAN_R,
  SEAL_TOTAL,
  COLOR,
  RENDER_SCALE,
  TEXT_RES,
} from '../constants';
import { buildVault, isWall, type VaultModel } from '../vault';
import { Guardian, type Dir } from '../entities/Guardian';

declare const __TEST_SEAM__: boolean;

type KeyName = 'left' | 'right' | 'up' | 'down' | 'A' | 'D' | 'W' | 'S';
type Keys = Record<KeyName, Phaser.Input.Keyboard.Key>;
type DpadDir = 'left' | 'right' | 'up' | 'down';

type GameState = {
  sealed: number;
  busted: boolean;
  won: boolean;
  timeMs: number;
  lastSec: number;
  animFrame: number;
};

export class GameScene extends Phaser.Scene {
  private vault!: VaultModel;
  private guardian!: Guardian;
  private keys!: Keys;
  private dpad: Record<DpadDir, boolean> = { left: false, right: false, up: false, down: false };
  private state!: GameState;

  constructor() {
    super('GameScene');
  }

  create(): void {
    try {
      localStorage.setItem('gg.activeIsland', 'privacy-vaults');
    } catch {
      /* ignore */
    }

    this.vault = buildVault();
    this.state = { sealed: 0, busted: false, won: false, timeMs: 0, lastSec: -1, animFrame: 0 };

    this.cameras.main.setBackgroundColor('#0a1226');
    this.cameras.main.setZoom(RENDER_SCALE);
    this.cameras.main.centerOn(CANVAS_W / 2, CANVAS_H / 2);

    this.drawFloor();
    this.drawWalls();
    this.drawEntry();
    this.drawLeaks();
    this.drawExit();

    const sx = this.vault.spawn.c * CELL + CELL / 2;
    const sy = this.vault.spawn.r * CELL + CELL / 2;
    this.guardian = new Guardian(this, sx, sy);

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
        px: this.guardian.px,
        py: this.guardian.py,
        sealed: this.state.sealed,
        total: SEAL_TOTAL,
        busted: this.state.busted,
        won: this.state.won,
        timeMs: this.state.timeMs,
      });
    }
  }

  update(_time: number, delta: number): void {
    if (this.state.won) return;
    this.state.animFrame++;
    if (this.state.busted) return; // (B) freeze during the "Caught!" reset
    this.state.timeMs += delta;

    const dir: Dir = {
      left: this.keys.left.isDown || this.keys.A.isDown || this.dpad.left,
      right: this.keys.right.isDown || this.keys.D.isDown || this.dpad.right,
      up: this.keys.up.isDown || this.keys.W.isDown || this.dpad.up,
      down: this.keys.down.isDown || this.keys.S.isDown || this.dpad.down,
    };
    this.guardian.update(dir, delta / 1000, (px, py) => this.hitsWall(px, py));
  }

  // The Guardian's bounding box (±GUARDIAN_R) overlaps up to four cells; block if
  // ANY is a wall. (Mirrors habit-harbor's boat collision.)
  private hitsWall(px: number, py: number): boolean {
    const c0 = Math.floor((px - GUARDIAN_R) / CELL);
    const c1 = Math.floor((px + GUARDIAN_R) / CELL);
    const r0 = Math.floor((py - GUARDIAN_R) / CELL);
    const r1 = Math.floor((py + GUARDIAN_R) / CELL);
    for (let rr = r0; rr <= r1; rr++) {
      for (let cc = c0; cc <= c1; cc++) {
        if (isWall(this.vault, cc, rr)) return true;
      }
    }
    return false;
  }

  // ---- static rendering ----------------------------------------------------

  private drawFloor(): void {
    const g = this.add.graphics().setDepth(0);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.vault.grid[r]?.[c] === '#') continue;
        const x = c * CELL;
        const y = r * CELL;
        g.fillStyle((c + r) % 2 === 0 ? COLOR.floor : COLOR.floorAlt, 1);
        g.fillRect(x, y, CELL, CELL);
      }
    }
    g.lineStyle(1, COLOR.grid, 0.22);
    for (let c = 0; c <= COLS; c++) {
      g.beginPath();
      g.moveTo(c * CELL, 0);
      g.lineTo(c * CELL, CANVAS_H);
      g.strokePath();
    }
    for (let r = 0; r <= ROWS; r++) {
      g.beginPath();
      g.moveTo(0, r * CELL);
      g.lineTo(CANVAS_W, r * CELL);
      g.strokePath();
    }
  }

  private drawWalls(): void {
    const g = this.add.graphics().setDepth(10);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.vault.grid[r]?.[c] !== '#') continue;
        const x = c * CELL;
        const y = r * CELL;
        g.fillStyle(COLOR.wallDark, 1);
        g.fillRect(x, y, CELL, CELL);
        g.fillStyle(COLOR.wall, 1);
        g.fillRect(x + 2, y + 3, CELL - 4, CELL - 6);
        g.fillStyle(COLOR.wallTop, 1);
        g.fillRect(x + 2, y + 3, CELL - 4, 6); // top highlight
        g.fillStyle(COLOR.bolt, 1);
        const bolts: Array<[number, number]> = [
          [x + 9, y + 10],
          [x + CELL - 9, y + 10],
          [x + 9, y + CELL - 9],
          [x + CELL - 9, y + CELL - 9],
        ];
        for (const [bx, by] of bolts) g.fillCircle(bx, by, 2);
      }
    }
  }

  private drawEntry(): void {
    const x = this.vault.spawn.c * CELL;
    const y = this.vault.spawn.r * CELL;
    const g = this.add.graphics().setDepth(5);
    g.fillStyle(COLOR.entry, 0.16);
    g.fillCircle(x + CELL / 2, y + CELL / 2, CELL * 0.42);
    g.lineStyle(2, COLOR.entry, 0.7);
    g.strokeCircle(x + CELL / 2, y + CELL / 2, CELL * 0.4);
    this.add
      .text(x + CELL / 2, y + CELL / 2, '⬆', {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#8fd0ff',
        resolution: TEXT_RES,
      })
      .setOrigin(0.5)
      .setDepth(6);
  }

  // Static glowing leaks for now; Milestone C swaps these for the Leak entity + seal.
  private drawLeaks(): void {
    for (const leak of this.vault.leaks) {
      const cx = leak.c * CELL + CELL / 2;
      const cy = leak.r * CELL + CELL / 2;
      const g = this.add.graphics({ x: cx, y: cy }).setDepth(20);
      for (let i = 3; i >= 1; i--) {
        g.fillStyle(COLOR.leak, (0.13 * i) / 3 + 0.04);
        g.fillCircle(0, 0, 11 + i * 5);
      }
      g.fillStyle(COLOR.leak, 0.9);
      g.fillCircle(0, 0, 13);
      g.fillStyle(COLOR.leakGlow, 1);
      g.fillCircle(-3, -3, 5);
      this.add
        .text(cx, cy, '📄', {
          fontFamily: 'sans-serif',
          fontSize: `${Math.round(CELL * 0.4)}px`,
          resolution: TEXT_RES,
        })
        .setOrigin(0.5)
        .setDepth(21);
      this.tweens.add({
        targets: g,
        scale: { from: 0.85, to: 1.12 },
        alpha: { from: 0.7, to: 1 },
        duration: 820,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  private drawExit(): void {
    const x = this.vault.exit.c * CELL;
    const y = this.vault.exit.r * CELL;
    const cx = x + CELL / 2;
    const cy = y + CELL / 2;
    const g = this.add.graphics().setDepth(15);
    // Closed vault door (opens in Milestone C once all leaks are sealed).
    g.fillStyle(COLOR.wallDark, 1);
    g.fillRoundedRect(x + 3, y + 3, CELL - 6, CELL - 6, 9);
    g.fillStyle(COLOR.exitClosed, 1);
    g.fillRoundedRect(x + 6, y + 6, CELL - 12, CELL - 12, 7);
    g.lineStyle(3, 0x90a0d0, 1);
    g.strokeCircle(cx, cy - 2, 11);
    g.beginPath();
    g.moveTo(cx - 11, cy - 2);
    g.lineTo(cx + 11, cy - 2);
    g.moveTo(cx, cy - 13);
    g.lineTo(cx, cy + 9);
    g.strokePath();
    this.add
      .text(cx, y + CELL - 5, 'EXIT', {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '11px',
        color: '#9fb4d8',
        resolution: TEXT_RES,
      })
      .setOrigin(0.5, 1)
      .setDepth(16);
  }

  // ---- touch D-pad ---------------------------------------------------------

  private buildDpad(): void {
    const cx = 82;
    const cy = CANVAS_H - 86;
    const make = (x: number, y: number, label: string, key: DpadDir): void => {
      const btn = this.add
        .rectangle(x, y, 46, 46, 0x14224a, 0.82)
        .setStrokeStyle(2, 0x38a8f9)
        .setDepth(110)
        .setInteractive({ useHandCursor: true });
      this.add
        .text(x, y, label, { fontFamily: 'Arial', fontSize: '22px', color: '#cfeefe', resolution: TEXT_RES })
        .setOrigin(0.5)
        .setDepth(111);
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
