// The Tetris scene for the Privacy Vault island.
//
// Layout: a light board on the LEFT (fully visible top-to-bottom) and a white panel
// on the RIGHT holding NEXT / progress / status and — swapped by phase — either the
// privacy question (quiz) or the touch controls (play).
//
// Quiz gate: every piece spawns LOCKED and drifts down slowly while a privacy
// question shows on the side. Answer right -> you take control of that piece. Answer
// wrong -> it finishes falling on autopilot. DON'T answer in time -> it just lands on
// the stack and the next question comes (no waiting). Answering just unlocks the
// block so you can place it; clearing LINES_GOAL (5) lines wins the level ->
// Hallucination Tower unlocks, and you can keep going at a faster level. Gentle
// throughout: no lives, no game-over.

import Phaser from 'phaser';
import {
  CANVAS_W,
  CANVAS_H,
  CELL,
  BOARD_X,
  BOARD_Y,
  BOARD_W,
  BOARD_H,
  PANEL_X,
  PANEL_W,
  PANEL_H,
  RENDER_SCALE,
  TEXT_RES,
  COLOR,
  PIECE_COLORS,
  LINES_GOAL,
  BASE_GRAVITY_MS,
  BASE_LOCKED_MS,
  SOFT_DROP_MS,
  LOCK_DELAY_MS,
  DAS_MS,
  ARR_MS,
  SPEEDUP,
  MIN_GRAVITY_MS,
  MIN_LOCKED_MS,
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
import { pickN, markIslandCleared, load, save, newProfile, type Question } from '@gg/shared';

declare const __TEST_SEAM__: boolean;

type KeyName = 'left' | 'right' | 'up' | 'down' | 'A' | 'D' | 'W' | 'S' | 'X' | 'Z' | 'SPACE';
type Keys = Record<KeyName, Phaser.Input.Keyboard.Key>;

// quiz      = locked, drifting, question open, no control (lands on its own if ignored)
// play      = unlocked, full control + normal gravity
// autopilot = wrong answer: locked, finishing its fall, no control
// won       = level cleared, win overlay up, everything frozen
type Phase = 'quiz' | 'play' | 'autopilot' | 'won';

const CXP = PANEL_X + PANEL_W / 2; // panel centre x
const QUIZ_RECT = { x: PANEL_X + 18, y: 332, w: PANEL_W - 36, h: 388 };

export class GameScene extends Phaser.Scene {
  private grid: Grid = emptyGrid();
  private bag = new SevenBag();
  private piece!: Piece;
  private nextId!: PieceId;

  private phase: Phase = 'quiz';
  private qPool: Question[] = [];
  private card!: QuizCard;

  private correctCount = 0;
  private linesCleared = 0;
  private level = 1;
  private clearedOnce = false; // unlock the next island only on the first win

  private gravityMs = BASE_GRAVITY_MS;
  private lockedMs = BASE_LOCKED_MS;

  private timeMs = 0;
  private animFrame = 0;
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
  private lockIcon!: Phaser.GameObjects.Text;
  private securedText!: Phaser.GameObjects.Text;
  private linesText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private controlsGroup!: Phaser.GameObjects.Container;
  private winOverlay: Phaser.GameObjects.Container | null = null;
  private msg: Phaser.GameObjects.Container | null = null;

  // progress-bar geometry (set in buildPanel)
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
    // Ensure a profile exists so a win PERSISTS (and the map lights up) even if the
    // game was opened directly, without going through the app's onboarding first.
    try {
      if (!load()) save(newProfile('Guardian', 'explorer'));
    } catch {
      /* ignore */
    }

    this.cameras.main.setBackgroundColor('#e7edf9');
    this.cameras.main.setZoom(RENDER_SCALE);
    this.cameras.main.centerOn(CANVAS_W / 2, CANVAS_H / 2);

    this.buildBoard();
    this.buildPanel();
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
    this.spawnNext(); // first piece -> first question

    this.redrawStack();
    this.redrawActive();
    this.updateHud();

    if (__TEST_SEAM__) {
      const w = window as unknown as { __GAME_STATE__: () => unknown; __SCENE__: GameScene };
      w.__SCENE__ = this;
      w.__GAME_STATE__ = () => ({
        phase: this.phase,
        correct: this.correctCount,
        goal: LINES_GOAL,
        lines: this.linesCleared,
        level: this.level,
        pieceId: this.piece.id,
        x: this.piece.x,
        y: this.piece.y,
        filled: this.grid.reduce((n, row) => n + row.filter((v) => v !== 0).length, 0),
      });
    }
  }

  update(_time: number, delta: number): void {
    this.animFrame++;
    if (this.phase === 'won') return;
    const dt = Math.min(delta, 100); // clamp load / tab-switch spikes
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
      const iv = soft ? SOFT_DROP_MS : this.gravityMs;
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

    // quiz / autopilot: slow self-drift, no control. NO hold — if it reaches the
    // stack it just lands (the player was too slow / answered wrong).
    this.gravAccum += dt;
    while (this.gravAccum >= this.lockedMs) {
      this.gravAccum -= this.lockedMs;
      const m = move(this.grid, this.piece, 0, 1);
      if (m) {
        this.piece = m;
      } else {
        this.gravAccum = 0;
        if (this.phase === 'quiz') this.flashMessage('⏰ Too slow — it landed!', 'warn');
        this.lockPiece(); // lands, places, next piece + question
        break;
      }
    }
  }

  private lockPiece(): void {
    this.grid = merge(this.grid, this.piece);
    const res = clearLines(this.grid);
    this.grid = res.grid;
    if (res.cleared > 0) {
      this.linesCleared += res.cleared;
      this.flashBoard(0xffffff);
    }
    this.gravAccum = 0;
    this.lockAccum = 0;
    this.redrawStack();
    this.updateHud();
    if (this.linesCleared >= LINES_GOAL) {
      this.winLevel(); // clearing enough lines wins the level
      return;
    }
    this.spawnNext();
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
    this.controlsGroup.setVisible(false);
    this.updateStatus();
    this.card.open(this.nextQuestion(), QUIZ_RECT, (ch) => this.onAnswer(ch));
  }

  private nextQuestion(): Question {
    if (!this.qPool.length) this.qPool = pickN('privacy', 12);
    return this.qPool.pop() as Question;
  }

  private onAnswer(ch: Choice): void {
    this.card.close();
    if (ch.isCorrect) {
      // Answering right just unlocks control of this block — clearing LINES is the
      // goal now, so a correct answer is a (fun) stat, not the win counter.
      this.correctCount++;
      this.phase = 'play';
      this.gravAccum = 0;
      this.lockAccum = 0;
      this.controlsGroup.setVisible(true);
      this.updateHud();
      this.flashMessage('🔓  Your move!', 'good');
      this.flashBoard(0xdaf3e0);
    } else {
      this.phase = 'autopilot';
      this.controlsGroup.setVisible(false);
      this.flashMessage('🤖  Autopilot — answer the next one!', 'warn');
    }
    this.updateStatus();
  }

  // Gentle, no game-over: tidy the vault and carry on (progress is kept).
  private topOut(): void {
    this.grid = emptyGrid();
    this.redrawStack();
    this.flashBoard(0xfff0b8);
  }

  // ---- win + levels --------------------------------------------------------

  private winLevel(): void {
    this.phase = 'won';
    this.card.close();
    this.controlsGroup.setVisible(false);
    this.lockIcon.setVisible(false);
    if (!this.clearedOnce) {
      this.clearedOnce = true;
      try {
        markIslandCleared('privacy-vaults', 3); // unlocks reality-tower (Hallucination Tower)
      } catch {
        /* ignore */
      }
    }
    this.showWinOverlay();
  }

  private nextLevel(): void {
    this.level++;
    this.gravityMs = Math.max(MIN_GRAVITY_MS, BASE_GRAVITY_MS * Math.pow(SPEEDUP, this.level - 1));
    this.lockedMs = Math.max(MIN_LOCKED_MS, BASE_LOCKED_MS * Math.pow(SPEEDUP, this.level - 1));
    this.correctCount = 0;
    this.linesCleared = 0;
    this.grid = emptyGrid();
    this.redrawStack();
    this.winOverlay?.destroy(true);
    this.winOverlay = null;
    this.updateHud();
    this.spawnNext(); // back to quiz with a fresh question
    this.redrawActive();
    this.updateLockIcon();
  }

  // ---- rendering -----------------------------------------------------------

  private tilePx(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number, id: number, alpha = 1): void {
    const tc = PIECE_COLORS[id] ?? PIECE_COLORS[0]!;
    const rad = size * 0.18;
    const i = size * 0.06;
    g.fillStyle(tc.edge, 0.3 * alpha);
    g.fillRoundedRect(x + i, y + i * 1.6, size - 2 * i, size - i * 1.6, rad);
    g.fillStyle(tc.fill, alpha);
    g.fillRoundedRect(x + i, y + i, size - 2 * i, size - 2 * i, rad);
    g.fillStyle(tc.light, 0.85 * alpha);
    g.fillRoundedRect(x + size * 0.16, y + i * 1.7, size * 0.68, size * 0.26, rad * 0.7);
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
    if (this.phase === 'won') return;
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
    if (this.phase === 'play' || this.phase === 'won') {
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
    const ps = 19;
    const boxCx = CXP;
    const boxCy = 122;
    const ox = boxCx - (w * ps) / 2 - minC * ps;
    const oy = boxCy - (h * ps) / 2 - minR * ps;
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
    const accent = kind === 'good' ? COLOR.good : COLOR.warn;
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
    const label =
      this.phase === 'play' ? '🔓 Your move!' : this.phase === 'autopilot' ? '🤖 Autopilot…' : '🔒 Answer to steer';
    this.statusText.setText(label);
  }

  private updateHud(): void {
    // securedText is the big GOAL number = lines cleared / LINES_GOAL.
    // linesText is now a small "answered" stat (answers no longer drive the win).
    this.securedText.setText(`${this.linesCleared} / ${LINES_GOAL}`);
    this.linesText.setText(`✓ Answered: ${this.correctCount}`);
    this.levelText.setText(`⚡ Level ${this.level}`);
    this.gBar.clear();
    this.gBar.fillStyle(COLOR.boardInner, 1);
    this.gBar.fillRoundedRect(this.barX, this.barY, this.barW, this.barH, this.barH / 2);
    const frac = Math.min(1, this.linesCleared / LINES_GOAL);
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

  private buildPanel(): void {
    const g = this.add.graphics().setDepth(2);
    g.fillStyle(COLOR.boardShadow, 0.4);
    g.fillRoundedRect(PANEL_X + 3, BOARD_Y + 3, PANEL_W, PANEL_H + 6, 18);
    g.fillStyle(COLOR.rail, 1);
    g.fillRoundedRect(PANEL_X, BOARD_Y, PANEL_W, PANEL_H, 18);
    g.lineStyle(2, COLOR.railEdge, 1);
    g.strokeRoundedRect(PANEL_X, BOARD_Y, PANEL_W, PANEL_H, 18);

    // level pill
    this.levelText = this.add
      .text(CXP, BOARD_Y + 26, '⚡ Level 1', {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '16px',
        color: '#6f8cff',
        resolution: TEXT_RES,
      })
      .setOrigin(0.5)
      .setDepth(12);

    // NEXT box
    this.add
      .text(CXP, BOARD_Y + 52, 'NEXT', { fontFamily: 'Arial', fontSize: '13px', color: '#8b96b4', resolution: TEXT_RES })
      .setOrigin(0.5)
      .setDepth(12);
    g.fillStyle(COLOR.boardInner, 1);
    g.fillRoundedRect(CXP - 42, 96, 84, 84, 12);
    g.lineStyle(1.5, COLOR.railEdge, 1);
    g.strokeRoundedRect(CXP - 42, 96, 84, 84, 12);
    this.gNext = this.add.graphics().setDepth(11);

    // SECURED goal
    this.add
      .text(CXP, 200, '🧱 LINES CLEARED', { fontFamily: 'Arial', fontSize: '13px', color: '#8b96b4', resolution: TEXT_RES })
      .setOrigin(0.5)
      .setDepth(12);
    this.securedText = this.add
      .text(CXP, 230, '0 / 5', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: '30px',
        color: '#3b456a',
        resolution: TEXT_RES,
      })
      .setOrigin(0.5)
      .setDepth(12);

    this.barX = PANEL_X + 28;
    this.barY = 258;
    this.barW = PANEL_W - 56;
    this.barH = 12;
    this.gBar = this.add.graphics().setDepth(11);

    this.linesText = this.add
      .text(CXP, 286, '✓ Answered: 0', { fontFamily: 'Arial', fontSize: '12px', color: '#8b96b4', resolution: TEXT_RES })
      .setOrigin(0.5)
      .setDepth(12);

    this.statusText = this.add
      .text(CXP, QUIZ_RECT.y - 18, '', { fontFamily: 'Arial Black, sans-serif', fontSize: '14px', color: '#6f8cff', resolution: TEXT_RES })
      .setOrigin(0.5)
      .setDepth(12);
  }

  // ---- touch controls (shown in the panel during the play phase) -----------

  private buildControls(): void {
    this.controlsGroup = this.add.container(0, 0).setDepth(20).setVisible(false);
    const cx = CXP;
    const rotY = 372;
    const rowY = 444;
    const dropY = 516;

    this.softButton(cx, rotY, 70, 52, '⟳', () => (this.pendRotate = true), true);
    this.softButton(cx - 58, rowY, 52, 52, '◄', (v) => (this.dpad.left = v));
    this.softButton(cx, rowY, 52, 52, '▼', (v) => (this.dpad.down = v));
    this.softButton(cx + 58, rowY, 52, 52, '►', (v) => (this.dpad.right = v));
    this.softButton(cx, dropY, 178, 46, '⤓  DROP', () => (this.pendHard = true), true);

    this.controlsGroup.add(
      this.add
        .text(cx, dropY + 48, 'Place the block!', { fontFamily: 'Arial', fontSize: '13px', color: '#8b96b4', resolution: TEXT_RES })
        .setOrigin(0.5),
    );
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
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, 11);
    g.lineStyle(2, COLOR.railEdge, 1);
    g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, 11);
    const txt = this.add
      .text(cx, cy, label, { fontFamily: 'Arial', fontSize: `${Math.round(h * 0.42)}px`, color: '#5b67a6', resolution: TEXT_RES })
      .setOrigin(0.5);
    const zone = this.add.zone(cx, cy, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      if (this.phase === 'play') set(true);
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
    this.controlsGroup.add([g, txt, zone]);
  }

  // ---- win overlay ---------------------------------------------------------

  private showWinOverlay(): void {
    const cont = this.add.container(0, 0).setDepth(400);
    cont.add(this.add.rectangle(CANVAS_W / 2, CANVAS_H / 2, CANVAS_W, CANVAS_H, 0x1b2547, 0.34).setInteractive());

    const cw = 470;
    const ch = 310;
    const cx = CANVAS_W / 2;
    const cy = CANVAS_H / 2;
    const cardX = cx - cw / 2;
    const cardY = cy - ch / 2;

    const g = this.add.graphics();
    g.fillStyle(COLOR.boardShadow, 0.5);
    g.fillRoundedRect(cardX, cardY + 10, cw, ch, 22);
    g.fillStyle(0xffffff, 1);
    g.fillRoundedRect(cardX, cardY, cw, ch, 22);
    g.lineStyle(2, COLOR.railEdge, 1);
    g.strokeRoundedRect(cardX, cardY, cw, ch, 22);
    cont.add(g);

    // confetti
    const confettiColors = [0x7ecbd6, 0xf2cf6b, 0xb69ae0, 0x8fcf9b, 0xef9a9a, 0x8aa9e6, 0xf0b27a];
    for (let i = 0; i < 16; i++) {
      const px = cardX + 24 + ((i * 53) % (cw - 48));
      const col = confettiColors[i % confettiColors.length]!;
      const piece = this.add.rectangle(px, cardY + 6, 9, 13, col).setAngle((i * 37) % 360);
      cont.add(piece);
      this.tweens.add({
        targets: piece,
        y: cardY + ch - 16,
        angle: `+=${180 + i * 18}`,
        duration: 1100 + (i % 5) * 220,
        ease: 'Quad.in',
        repeat: -1,
        delay: i * 40,
      });
    }

    cont.add(
      this.add
        .text(cx, cardY + 56, '🎉  You did it!', {
          fontFamily: 'Arial Black, sans-serif',
          fontSize: '30px',
          color: '#3b456a',
          resolution: TEXT_RES,
        })
        .setOrigin(0.5),
    );
    cont.add(
      this.add
        .text(cx, cardY + 100, `You cleared ${LINES_GOAL} lines!`, {
          fontFamily: 'Arial',
          fontSize: '17px',
          color: '#5b67a6',
          resolution: TEXT_RES,
        })
        .setOrigin(0.5),
    );
    cont.add(
      this.add
        .text(cx, cardY + 134, '🗼 Hallucination Tower unlocked!', {
          fontFamily: 'Arial Black, sans-serif',
          fontSize: '18px',
          color: '#6f8cff',
          resolution: TEXT_RES,
        })
        .setOrigin(0.5),
    );

    this.overlayButton(cont, cx, cardY + 196, 300, 50, `⚡  Keep going — Level ${this.level + 1}`, COLOR.accent, 0xffffff, () =>
      this.nextLevel(),
    );
    this.overlayButton(cont, cx, cardY + 256, 300, 44, '🗺️  Back to Map', 0xffffff, COLOR.accent, () => {
      window.location.href = '../';
    });

    cont.setScale(0.92).setAlpha(0.4);
    this.tweens.add({ targets: cont, scale: 1, alpha: 1, duration: 200, ease: 'Back.out' });
    this.winOverlay = cont;
  }

  private overlayButton(
    parent: Phaser.GameObjects.Container,
    cx: number,
    cy: number,
    w: number,
    h: number,
    label: string,
    fill: number,
    textColor: number,
    onTap: () => void,
  ): void {
    const g = this.add.graphics();
    const drawBtn = (f: number): void => {
      g.clear();
      g.fillStyle(f, 1);
      g.fillRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
      if (f === 0xffffff) {
        g.lineStyle(2, COLOR.accent, 1);
        g.strokeRoundedRect(cx - w / 2, cy - h / 2, w, h, h / 2);
      }
    };
    drawBtn(fill);
    const hex = `#${textColor.toString(16).padStart(6, '0')}`;
    const txt = this.add
      .text(cx, cy, label, { fontFamily: 'Arial Black, sans-serif', fontSize: '17px', color: hex, resolution: TEXT_RES })
      .setOrigin(0.5);
    const zone = this.add.zone(cx, cy, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerover', () => txt.setScale(1.04));
    zone.on('pointerout', () => txt.setScale(1));
    zone.on('pointerdown', () => onTap());
    parent.add([g, txt, zone]);
  }
}
