// The Tetris scene for the Privacy Vault island. Milestone B adds the quiz gate:
// every piece spawns LOCKED and drifts down slowly (holding above the question tray
// so it stays visible) while a privacy question shows. Answer right -> you take
// control of that piece (normal gravity + move/rotate/drop). Answer wrong -> it
// finishes falling on autopilot, no control, and the next piece brings a new
// question. Gentle: no lives, no game-over. The win flow + celebration land in C.

import Phaser from 'phaser';
import {
  CANVAS_W,
  CANVAS_H,
  CELL,
  BOARD_X,
  BOARD_Y,
  BOARD_W,
  BOARD_H,
  RAIL_X,
  RAIL_W,
  RENDER_SCALE,
  TEXT_RES,
  COLOR,
  PIECE_COLORS,
  LINES_TO_WIN,
  GRAVITY_MS,
  LOCKED_GRAVITY_MS,
  SOFT_DROP_MS,
  LOCK_DELAY_MS,
  DAS_MS,
  ARR_MS,
} from '../constants';
import {
  COLS,
  ROWS,
  COLOR_INDEX,
  emptyGrid,
  spawn,
  cells,
  collides,
  merge,
  clearLines,
  move,
  rotate,
  dropPosition,
  SevenBag,
  type Grid,
  type Piece,
  type PieceId,
} from '../tetris';
import { QuizCard, type Choice } from '../ui/QuizCard';
import { pickN, type Question } from '@gg/shared';

declare const __TEST_SEAM__: boolean;

type KeyName = 'left' | 'right' | 'up' | 'down' | 'A' | 'D' | 'W' | 'S' | 'X' | 'Z' | 'SPACE';
type Keys = Record<KeyName, Phaser.Input.Keyboard.Key>;

// 'quiz'      = locked, drifting + holding above the tray, question open, no control
// 'play'      = unlocked, full control + normal gravity
// 'autopilot' = wrong answer: locked, finishing its fall on its own, no control
type Phase = 'quiz' | 'play' | 'autopilot';

// While a question is open the locked piece holds at this row so it never slides
// behind the bottom tray (tray top = y 360; row 9 bottom = y 348).
const QUIZ_HOLD_ROW = 9;

export class GameScene extends Phaser.Scene {
  private grid: Grid = emptyGrid();
  private bag = new SevenBag();
  private piece!: Piece;
  private nextId!: PieceId;

  private phase: Phase = 'quiz';
  private qPool: Question[] = [];
  private card!: QuizCard;

  private lines = 0;
  private timeMs = 0;
  private animFrame = 0;
  private won = false;

  private gravAccum = 0;
  private lockAccum = 0;
  private hDir = 0;
  private moveCd = 0;

  private keys!: Keys;
  private dpad = { left: false, right: false, down: false };
  private pendRotate = false;
  private pendHard = false;

  private gStack!: Phaser.GameObjects.Graphics;
  private gActive!: Phaser.GameObjects.Graphics;
  private gNext!: Phaser.GameObjects.Graphics;
  private gBar!: Phaser.GameObjects.Graphics;
  private linesText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private lockIcon!: Phaser.GameObjects.Text;
  private msg: Phaser.GameObjects.Container | null = null;

  // rail sub-layout (set in buildRail)
  private cxR = 0;
  private nbX = 0;
  private nbY = 0;
  private nbW = 0;
  private nbH = 0;
  private barX = 0;
  private barY = 0;
  private barW = 0;
  private barH = 0;

  constructor() {
    super('GameScene');
  }

  create(): void {
    try {
      localStorage.setItem('gg.activeIsland', 'privacy-vaults');
    } catch {
      /* ignore */
    }

    this.cameras.main.setBackgroundColor('#e7edf9');
    this.cameras.main.setZoom(RENDER_SCALE);
    this.cameras.main.centerOn(CANVAS_W / 2, CANVAS_H / 2);

    this.buildBoard();
    this.buildRail();
    this.buildControls();

    this.gStack = this.add.graphics().setDepth(5);
    this.gActive = this.add.graphics().setDepth(6);
    this.lockIcon = this.add.text(0, 0, '🔒', { fontSize: '20px', resolution: TEXT_RES }).setOrigin(0.5).setDepth(7).setVisible(false);
    this.card = new QuizCard(this);

    this.keys = this.input.keyboard!.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      W: Phaser.Input.Keyboard.KeyCodes.W,
      S: Phaser.Input.Keyboard.KeyCodes.S,
      X: Phaser.Input.Keyboard.KeyCodes.X,
      Z: Phaser.Input.Keyboard.KeyCodes.Z,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
    }) as Keys;

    this.nextId = this.bag.next();
    this.spawnNext(); // first piece -> opens the first question

    this.redrawStack();
    this.redrawActive();
    this.updateHud();

    if (__TEST_SEAM__) {
      const w = window as unknown as { __GAME_STATE__: () => unknown; __SCENE__: GameScene };
      w.__SCENE__ = this;
      w.__GAME_STATE__ = () => ({
        lines: this.lines,
        phase: this.phase,
        pieceId: this.piece.id,
        x: this.piece.x,
        y: this.piece.y,
        won: this.won,
        filled: this.grid.reduce((n, row) => n + row.filter((v) => v !== 0).length, 0),
      });
    }
  }

  update(_time: number, delta: number): void {
    this.animFrame++;
    if (this.won) return;
    // Clamp first-frame / tab-switch delta spikes so a piece can never slam several
    // cells in one frame (keeps the drop calm and deterministic).
    const dt = Math.min(delta, 100);
    this.timeMs += dt;

    const playing = this.phase === 'play';
    const left = this.keys.left.isDown || this.keys.A.isDown || this.dpad.left;
    const right = this.keys.right.isDown || this.keys.D.isDown || this.dpad.right;
    const down = this.keys.down.isDown || this.keys.S.isDown || this.dpad.down;

    const JD = Phaser.Input.Keyboard.JustDown;
    const rotCW = JD(this.keys.up) || JD(this.keys.W) || JD(this.keys.X) || this.pendRotate;
    const rotCCW = JD(this.keys.Z);
    const hard = JD(this.keys.SPACE) || this.pendHard;
    this.pendRotate = false;
    this.pendHard = false;

    // Controls only respond once the piece is unlocked.
    if (playing) {
      if (rotCW) this.tryRotate(1);
      if (rotCCW) this.tryRotate(-1);
      this.moveHoriz(dt, left, right);
      if (hard) {
        this.piece = dropPosition(this.grid, this.piece);
        this.lockPiece();
        return;
      }
    } else {
      this.hDir = 0;
    }

    this.stepGravity(dt, playing && down);
    this.redrawActive();
    this.updateLockIcon();
  }

  // ---- piece logic ---------------------------------------------------------

  private tryMove(dir: number): void {
    const m = move(this.grid, this.piece, dir, 0);
    if (m) this.piece = m;
  }

  private tryRotate(dir: 1 | -1): void {
    const r = rotate(this.grid, this.piece, dir);
    if (r) this.piece = r;
  }

  private moveHoriz(dt: number, left: boolean, right: boolean): void {
    const dir = left && !right ? -1 : right && !left ? 1 : 0;
    if (dir === 0) {
      this.hDir = 0;
      this.moveCd = 0;
      return;
    }
    if (dir !== this.hDir) {
      this.hDir = dir;
      this.tryMove(dir);
      this.moveCd = DAS_MS;
    } else {
      this.moveCd -= dt;
      if (this.moveCd <= 0) {
        this.tryMove(dir);
        this.moveCd = ARR_MS;
      }
    }
  }

  private pieceMaxRow(): number {
    let mx = -99;
    for (const { r } of cells(this.piece)) if (r > mx) mx = r;
    return mx;
  }

  private stepGravity(dt: number, soft: boolean): void {
    if (this.phase === 'play') {
      const grounded = move(this.grid, this.piece, 0, 1) === null;
      if (grounded) {
        this.lockAccum += dt;
        if (this.lockAccum >= LOCK_DELAY_MS) this.lockPiece();
        return;
      }
      this.lockAccum = 0;
      this.gravAccum += dt;
      const iv = soft ? SOFT_DROP_MS : GRAVITY_MS;
      while (this.gravAccum >= iv) {
        this.gravAccum -= iv;
        const m = move(this.grid, this.piece, 0, 1);
        if (m) this.piece = m;
        else {
          this.gravAccum = 0;
          break;
        }
      }
      return;
    }

    // quiz / autopilot: slow self-drift, no control.
    this.gravAccum += dt;
    while (this.gravAccum >= LOCKED_GRAVITY_MS) {
      this.gravAccum -= LOCKED_GRAVITY_MS;
      if (this.phase === 'quiz' && this.pieceMaxRow() >= QUIZ_HOLD_ROW) {
        this.gravAccum = 0; // hold above the tray until the question is answered
        break;
      }
      const m = move(this.grid, this.piece, 0, 1);
      if (m) {
        this.piece = m;
      } else {
        this.gravAccum = 0;
        if (this.phase === 'autopilot') this.lockPiece(); // it landed on its own
        break;
      }
    }
  }

  private lockPiece(): void {
    this.grid = merge(this.grid, this.piece);
    const res = clearLines(this.grid);
    this.grid = res.grid;
    if (res.cleared > 0) {
      this.lines += res.cleared;
      this.flashBoard(0xffffff);
    }
    this.gravAccum = 0;
    this.lockAccum = 0;
    this.spawnNext();
    this.redrawStack();
    this.updateHud();
    this.redrawActive();
    this.updateLockIcon();
  }

  private spawnNext(): void {
    this.piece = spawn(this.nextId);
    this.nextId = this.bag.next();
    this.gravAccum = 0;
    this.lockAccum = 0;
    this.drawNext();
    if (collides(this.grid, this.piece)) this.topOut();
    this.beginQuiz();
  }

  private beginQuiz(): void {
    this.phase = 'quiz';
    this.updateStatus();
    this.card.open(this.nextQuestion(), (ch) => this.onAnswer(ch));
  }

  private nextQuestion(): Question {
    if (!this.qPool.length) this.qPool = pickN('privacy', 8);
    return this.qPool.pop() as Question;
  }

  private onAnswer(ch: Choice): void {
    this.card.close();
    if (ch.isCorrect) {
      this.phase = 'play';
      this.gravAccum = 0;
      this.lockAccum = 0;
      this.flashMessage('🔓  Your move!', 'good');
      this.flashBoard(0xdaf3e0);
    } else {
      this.phase = 'autopilot';
      this.flashMessage('🤖  Autopilot — answer the next one!', 'warn');
    }
    this.updateStatus();
  }

  // Gentle, no game-over: tidy the vault and carry on (line progress is kept).
  private topOut(): void {
    this.grid = emptyGrid();
    this.redrawStack();
    this.flashBoard(0xfff0b8);
  }

  // ---- rendering -----------------------------------------------------------

  private tilePx(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number, id: number, alpha = 1): void {
    const tc = PIECE_COLORS[id] ?? PIECE_COLORS[0]!;
    const rad = size * 0.18;
    const i = size * 0.06;
    g.fillStyle(tc.edge, 0.3 * alpha);
    g.fillRoundedRect(x + i, y + i * 1.6, size - 2 * i, size - i * 1.6, rad); // soft drop shadow
    g.fillStyle(tc.fill, alpha);
    g.fillRoundedRect(x + i, y + i, size - 2 * i, size - 2 * i, rad);
    g.fillStyle(tc.light, 0.85 * alpha);
    g.fillRoundedRect(x + size * 0.16, y + i * 1.7, size * 0.68, size * 0.26, rad * 0.7); // top highlight
  }

  private ghostTile(g: Phaser.GameObjects.Graphics, c: number, r: number, id: number): void {
    const tc = PIECE_COLORS[id] ?? PIECE_COLORS[0]!;
    const x = BOARD_X + c * CELL;
    const y = BOARD_Y + r * CELL;
    const rad = CELL * 0.18;
    g.fillStyle(tc.fill, 0.1);
    g.fillRoundedRect(x + 3, y + 3, CELL - 6, CELL - 6, rad);
    g.lineStyle(2, tc.edge, 0.45);
    g.strokeRoundedRect(x + 3, y + 3, CELL - 6, CELL - 6, rad);
  }

  private redrawStack(): void {
    this.gStack.clear();
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const v = this.grid[r]?.[c] ?? 0;
        if (v !== 0) this.tilePx(this.gStack, BOARD_X + c * CELL, BOARD_Y + r * CELL, CELL, v);
      }
    }
  }

  private redrawActive(): void {
    this.gActive.clear();
    const id = COLOR_INDEX[this.piece.id];
    if (this.phase === 'play') {
      for (const { c, r } of cells(dropPosition(this.grid, this.piece))) {
        if (r >= 0) this.ghostTile(this.gActive, c, r, id);
      }
    }
    for (const { c, r } of cells(this.piece)) {
      if (r >= 0) this.tilePx(this.gActive, BOARD_X + c * CELL, BOARD_Y + r * CELL, CELL, id);
    }
  }

  private updateLockIcon(): void {
    if (this.phase === 'play') {
      this.lockIcon.setVisible(false);
      return;
    }
    const cs = cells(this.piece);
    let sc = 0;
    let sr = 0;
    for (const { c, r } of cs) {
      sc += c;
      sr += r;
    }
    const n = cs.length || 1;
    const x = BOARD_X + (sc / n + 0.5) * CELL;
    const y = BOARD_Y + (sr / n + 0.5) * CELL;
    this.lockIcon
      .setText(this.phase === 'autopilot' ? '🤖' : '🔒')
      .setPosition(x, Math.max(y, BOARD_Y + 18))
      .setVisible(true);
  }

  private drawNext(): void {
    this.gNext.clear();
    const p = spawn(this.nextId);
    const cs = cells(p);
    const csC = cs.map((k) => k.c);
    const csR = cs.map((k) => k.r);
    const minC = Math.min(...csC);
    const maxC = Math.max(...csC);
    const minR = Math.min(...csR);
    const maxR = Math.max(...csR);
    const w = maxC - minC + 1;
    const h = maxR - minR + 1;
    const ps = 22;
    const ox = this.nbX + (this.nbW - w * ps) / 2 - minC * ps;
    const oy = this.nbY + (this.nbH - h * ps) / 2 - minR * ps;
    const id = COLOR_INDEX[this.nextId];
    for (const { c, r } of cs) this.tilePx(this.gNext, ox + c * ps, oy + r * ps, ps, id);
  }

  private flashBoard(tint: number): void {
    const f = this.add.graphics().setDepth(8);
    f.fillStyle(tint, 0.5);
    f.fillRoundedRect(BOARD_X - 2, BOARD_Y - 2, BOARD_W + 4, BOARD_H + 4, 10);
    this.tweens.add({ targets: f, alpha: 0, duration: 260, onComplete: () => f.destroy() });
  }

  private flashMessage(text: string, kind: 'good' | 'warn'): void {
    this.msg?.destroy(true);
    const x = BOARD_X + BOARD_W / 2;
    const y = BOARD_Y + 26;
    const accent = kind === 'good' ? 0x43c06d : 0xef9a6a;
    const t = this.add
      .text(0, 0, text, { fontFamily: 'Arial Black, sans-serif', fontSize: '16px', color: '#3b456a', resolution: TEXT_RES })
      .setOrigin(0.5);
    const w = t.width + 30;
    const h = t.height + 16;
    const g = this.add.graphics();
    g.fillStyle(COLOR.boardShadow, 0.4);
    g.fillRoundedRect(x - w / 2, y - h / 2 + 3, w, h, h / 2);
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);
    g.lineStyle(2, accent, 1);
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);
    t.setPosition(x, y);
    const cont = this.add.container(0, 0, [g, t]).setDepth(120);
    this.msg = cont;
    this.tweens.add({
      targets: cont,
      alpha: { from: 1, to: 0 },
      y: { from: 0, to: -10 },
      delay: 1100,
      duration: 420,
      onComplete: () => {
        cont.destroy(true);
        if (this.msg === cont) this.msg = null;
      },
    });
  }

  private updateStatus(): void {
    const label = this.phase === 'play' ? '🔓 Your move!' : this.phase === 'autopilot' ? '🤖 Autopilot…' : '🔒 Answer to steer';
    this.statusText.setText(label);
  }

  private updateHud(): void {
    this.linesText.setText(`${this.lines} / ${LINES_TO_WIN}`);
    this.gBar.clear();
    this.gBar.fillStyle(COLOR.boardInner, 1);
    this.gBar.fillRoundedRect(this.barX, this.barY, this.barW, this.barH, this.barH / 2);
    const frac = Math.min(1, this.lines / LINES_TO_WIN);
    if (frac > 0) {
      this.gBar.fillStyle(COLOR.accent, 1);
      this.gBar.fillRoundedRect(this.barX, this.barY, Math.max(this.barH, this.barW * frac), this.barH, this.barH / 2);
    }
  }

  // ---- static chrome -------------------------------------------------------

  private buildBoard(): void {
    const g = this.add.graphics().setDepth(1);
    g.fillGradientStyle(COLOR.pageTop, COLOR.pageTop, COLOR.pageBottom, COLOR.pageBottom, 1);
    g.fillRect(0, 0, CANVAS_W, CANVAS_H);

    g.fillStyle(COLOR.boardShadow, 0.55);
    g.fillRoundedRect(BOARD_X - 8, BOARD_Y - 4, BOARD_W + 16, BOARD_H + 20, 20);
    g.fillStyle(COLOR.boardPanel, 1);
    g.fillRoundedRect(BOARD_X - 8, BOARD_Y - 8, BOARD_W + 16, BOARD_H + 16, 18);
    g.fillStyle(COLOR.boardInner, 1);
    g.fillRoundedRect(BOARD_X - 2, BOARD_Y - 2, BOARD_W + 4, BOARD_H + 4, 10);

    g.lineStyle(1, COLOR.grid, 1);
    for (let c = 0; c <= COLS; c++) g.lineBetween(BOARD_X + c * CELL, BOARD_Y, BOARD_X + c * CELL, BOARD_Y + BOARD_H);
    for (let r = 0; r <= ROWS; r++) g.lineBetween(BOARD_X, BOARD_Y + r * CELL, BOARD_X + BOARD_W, BOARD_Y + r * CELL);
  }

  private buildRail(): void {
    this.cxR = RAIL_X + (RAIL_W - 4) / 2;
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(COLOR.boardShadow, 0.4);
    g.fillRoundedRect(RAIL_X + 2, BOARD_Y + 2, RAIL_W - 4, BOARD_H + 12, 16);
    g.fillStyle(COLOR.rail, 1);
    g.fillRoundedRect(RAIL_X, BOARD_Y - 8, RAIL_W - 4, BOARD_H + 16, 16);
    g.lineStyle(2, COLOR.railEdge, 1);
    g.strokeRoundedRect(RAIL_X, BOARD_Y - 8, RAIL_W - 4, BOARD_H + 16, 16);

    this.nbW = 132;
    this.nbH = 100;
    this.nbX = this.cxR - this.nbW / 2;
    this.nbY = BOARD_Y + 34;
    g.fillStyle(COLOR.boardInner, 1);
    g.fillRoundedRect(this.nbX, this.nbY, this.nbW, this.nbH, 12);
    g.lineStyle(1.5, COLOR.railEdge, 1);
    g.strokeRoundedRect(this.nbX, this.nbY, this.nbW, this.nbH, 12);

    this.add
      .text(this.cxR, this.nbY - 6, 'NEXT', { fontFamily: 'Arial', fontSize: '14px', color: '#8b96b4', resolution: TEXT_RES })
      .setOrigin(0.5, 1)
      .setDepth(12);

    const linesY = this.nbY + this.nbH + 26;
    this.add
      .text(this.cxR, linesY, 'LINES CLEARED', { fontFamily: 'Arial', fontSize: '13px', color: '#8b96b4', resolution: TEXT_RES })
      .setOrigin(0.5)
      .setDepth(12);
    this.linesText = this.add
      .text(this.cxR, linesY + 30, '0 / 8', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '30px',
        color: '#3b456a',
        resolution: TEXT_RES,
      })
      .setOrigin(0.5)
      .setDepth(12);

    this.barX = this.nbX;
    this.barY = linesY + 56;
    this.barW = this.nbW;
    this.barH = 12;
    this.gNext = this.add.graphics().setDepth(11);
    this.gBar = this.add.graphics().setDepth(11);

    this.statusText = this.add
      .text(this.cxR, this.barY + 34, '', { fontFamily: 'Arial Black, sans-serif', fontSize: '14px', color: '#6f8cff', resolution: TEXT_RES })
      .setOrigin(0.5)
      .setDepth(12);
  }

  // ---- touch controls ------------------------------------------------------

  private buildControls(): void {
    const cx = this.cxR;
    const rotY = CANVAS_H - 214;
    const rowY = CANVAS_H - 152;
    const dropY = CANVAS_H - 92;

    this.softButton(cx, rotY, 64, 48, '⟳', () => (this.pendRotate = true), true);
    this.softButton(cx - 50, rowY, 48, 48, '◄', (v) => (this.dpad.left = v));
    this.softButton(cx, rowY, 48, 48, '▼', (v) => (this.dpad.down = v));
    this.softButton(cx + 50, rowY, 48, 48, '►', (v) => (this.dpad.right = v));
    this.softButton(cx, dropY, 148, 44, '⤓  DROP', () => (this.pendHard = true), true);
  }

  private softButton(
    cx: number,
    cy: number,
    w: number,
    h: number,
    label: string,
    set: (v: boolean) => void,
    oneShot = false,
  ): void {
    const g = this.add.graphics().setDepth(20);
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 11);
    g.lineStyle(2, COLOR.railEdge, 1);
    g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 11);
    const txt = this.add
      .text(cx, cy, label, { fontFamily: 'Arial', fontSize: `${Math.round(h * 0.42)}px`, color: '#5b67a6', resolution: TEXT_RES })
      .setOrigin(0.5)
      .setDepth(21);
    const zone = this.add.zone(cx, cy, w, h).setInteractive({ useHandCursor: true }).setDepth(22);
    zone.on('pointerdown', () => {
      set(true);
      txt.setScale(0.9);
    });
    zone.on('pointerup', () => {
      if (!oneShot) set(false);
      txt.setScale(1);
    });
    zone.on('pointerout', () => {
      if (!oneShot) set(false);
      txt.setScale(1);
    });
  }
}
