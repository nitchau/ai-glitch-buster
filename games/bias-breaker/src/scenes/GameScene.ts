// GameScene — the playable Bias Breaker level.
// Milestone A: static world (platforms, lava, doors, background) + player + camera + keyboard.
// Milestone B: drifting answer flyers + question banner + dwell-to-confirm + carrier-flyer transit.
// Milestone C (next session): lava respawn (v13.2 NaN-free reset) + tortoise enemy.
// Milestone D (next session): final door win flow → CelebrationScene.

import Phaser from 'phaser';
import { pickN, type Question } from '@gg/shared';
import {
  CANVAS_W,
  CANVAS_H,
  LAVA_Y,
  COMMIT_FRAMES,
  WALK_SPEED_PER_S,
} from '../constants';
import { buildLevel } from '../level/buildLevel';
import type { Level, Section } from '../level/types';
import { Player, type PlayerKeys } from '../entities/Player';
import { Flyer } from '../entities/Flyer';
import { Banner } from '../ui/Banner';

declare const __TEST_SEAM__: boolean;

type GameState = {
  currentSection: number;
  dwellTicks: number;
  onFlyer: Flyer | null;
  carryingFlyer: Flyer | null;
  timeMs: number;
  score: number;
  doorEntered: boolean;
};

// Suppress unused-import warning during Milestone A/B (CANVAS_W used by future tasks).
void CANVAS_W;

export class GameScene extends Phaser.Scene {
  private level!: Level;
  private player!: Player;
  private keys!: PlayerKeys;
  private flyers: Flyer[] = [];
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private banner!: Banner;
  private state!: GameState;

  constructor() {
    super('GameScene');
  }

  create(): void {
    // Persist that we are inside Bias Breaker for refresh-resume (Phase 4 will wire the resume).
    try {
      localStorage.setItem('gg.activeIsland', 'bias-breaker');
    } catch {
      /* ignore */
    }

    // Pick 5 random questions from the bias bank.
    const questions: Question[] = pickN('bias', 5);
    this.level = buildLevel(questions);

    // World bounds match the full level width so the camera can scroll.
    this.physics.world.setBounds(0, 0, this.level.totalWidth, CANVAS_H);
    this.cameras.main.setBounds(0, 0, this.level.totalWidth, CANVAS_H);

    // ---- Background: dark navy + parallax gradient sky ----
    this.cameras.main.setBackgroundColor('#0a0820');
    const skyGrad = this.add.graphics();
    skyGrad.fillGradientStyle(0x1a1247, 0x1a1247, 0x0a0820, 0x0a0820, 1);
    skyGrad.fillRect(0, 0, this.level.totalWidth, CANVAS_H);
    skyGrad.setScrollFactor(0.4);

    // ---- Lava strip ----
    const lavaGrad = this.add.graphics();
    lavaGrad.fillGradientStyle(0xff7a30, 0xff7a30, 0xc23a0e, 0xc23a0e, 1);
    lavaGrad.fillRect(0, LAVA_Y, this.level.totalWidth, CANVAS_H - LAVA_Y);

    // ---- Platforms (static physics group) ----
    this.platforms = this.physics.add.staticGroup();
    for (const sec of this.level.sections) {
      this.addPlatform(sec.solid.x, sec.solid.y, sec.solid.w, sec.solid.h);
    }
    this.addPlatform(
      this.level.finalSolid.x,
      this.level.finalSolid.y,
      this.level.finalSolid.w,
      this.level.finalSolid.h,
      true
    );

    // ---- Entry & final doors (visual placeholders for Milestones A/B) ----
    this.add
      .rectangle(
        this.level.entryDoor.x,
        this.level.entryDoor.y,
        this.level.entryDoor.w,
        this.level.entryDoor.h,
        0x8b5a2b
      )
      .setOrigin(0, 0)
      .setStrokeStyle(3, 0x4a2f15);
    this.add
      .rectangle(
        this.level.door.x,
        this.level.door.y,
        this.level.door.w,
        this.level.door.h,
        0xffd700
      )
      .setOrigin(0, 0)
      .setStrokeStyle(3, 0xb38600);

    // ---- Player ----
    const spawnX = this.level.sections[0]!.solid.x + 160;
    const spawnY = this.level.sections[0]!.solid.y;
    this.player = new Player(this, spawnX, spawnY);
    this.physics.add.collider(this.player.sprite, this.platforms);

    // Keyboard
    this.keys = this.input.keyboard!.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      up: Phaser.Input.Keyboard.KeyCodes.UP,
      A: Phaser.Input.Keyboard.KeyCodes.A,
      D: Phaser.Input.Keyboard.KeyCodes.D,
      W: Phaser.Input.Keyboard.KeyCodes.W,
      SPACE: Phaser.Input.Keyboard.KeyCodes.SPACE,
    }) as PlayerKeys;

    // Camera follows the player horizontally (matches legacy lerp 0.12)
    this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0);

    // ---- State ----
    this.state = {
      currentSection: 0,
      dwellTicks: 0,
      onFlyer: null,
      carryingFlyer: null,
      timeMs: 0,
      score: 0,
      doorEntered: false,
    };

    // ---- Flyers for section 0 + banner ----
    this.banner = new Banner(this);
    this.spawnFlyersForSection(0);
    this.banner.show(this.level.sections[0]!.question.question, 'question');

    // ---- Test seam: expose state for Playwright assertions ----
    if (__TEST_SEAM__) {
      (window as unknown as { __GAME_STATE__: () => unknown }).__GAME_STATE__ = () => ({
        section: this.state.currentSection,
        timeMs: this.state.timeMs,
        score: this.state.score,
        onFlyer: this.state.onFlyer != null,
        carryingFlyer: this.state.carryingFlyer != null,
        doorEntered: this.state.doorEntered,
        sections: this.level.sections.length,
      });
    }
  }

  private addPlatform(x: number, y: number, w: number, h: number, isFinish = false): void {
    const rect = this.add
      .rectangle(x + w / 2, y + h / 2, w, h, isFinish ? 0x38f9d7 : 0x43e97b)
      .setStrokeStyle(2, 0x0a3a1a);
    this.physics.add.existing(rect, true);
    this.platforms.add(rect);
  }

  private spawnFlyersForSection(sectionIdx: number): void {
    for (const f of this.flyers) f.destroy();
    this.flyers = [];
    const sec = this.level.sections[sectionIdx];
    if (!sec) return;
    for (const data of sec.flyers) {
      this.flyers.push(new Flyer(this, data));
    }
    for (const f of this.flyers) {
      this.physics.add.collider(this.player.sprite, f.sprite);
    }
  }

  update(_time: number, delta: number): void {
    if (this.state.doorEntered) return;

    // Timer (pauses during carrier transit — matches v13.3 intent)
    if (!this.state.carryingFlyer) {
      this.state.timeMs += delta;
    }

    // Carrier transit takes priority — player is locked to the flyer
    if (this.state.carryingFlyer) {
      const nextSolid =
        this.level.sections[this.state.currentSection + 1]?.solid ?? this.level.finalSolid;
      const arrived = this.state.carryingFlyer.updateCarrier(this.player.sprite, nextSolid);
      if (arrived) {
        this.arriveAtNextSection();
      }
      return;
    }

    // Normal play: player update + flyers drift
    this.player.update(this.keys);
    for (const f of this.flyers) {
      if (f.data.state === 'live') f.updateDrift(this.state.timeMs);
      else if (f.data.state === 'crashing') f.updateCrashing();
    }

    // Detect onFlyer (only for the current section's live flyers)
    this.state.onFlyer = null;
    const playerBody = this.player.sprite.body as Phaser.Physics.Arcade.Body;
    const playerBottom = this.player.sprite.y; // origin is feet
    for (const f of this.flyers) {
      if (f.data.state !== 'live') continue;
      const overlapX =
        this.player.sprite.x + 10 > f.data.x && this.player.sprite.x - 10 < f.data.x + f.data.w;
      const closeY = Math.abs(playerBottom - f.data.y) < 8;
      if (overlapX && closeY && playerBody.velocity.y >= 0) {
        this.state.onFlyer = f;
        break;
      }
    }

    // Dwell-to-confirm (mirrors legacy 544-565)
    if (this.state.onFlyer) {
      const vx = Math.abs(playerBody.velocity.x);
      const vy = Math.abs(playerBody.velocity.y);
      const stillEnough = vx < WALK_SPEED_PER_S * 0.5 && vy < 30;
      if (stillEnough) {
        this.state.dwellTicks++;
        if (this.state.dwellTicks >= COMMIT_FRAMES) {
          this.commitAnswer(this.state.onFlyer);
        }
      } else {
        this.state.dwellTicks = Math.max(0, this.state.dwellTicks - 2);
      }
    } else {
      this.state.dwellTicks = 0;
    }
  }

  private commitAnswer(flyer: Flyer): void {
    const sec = this.level.sections[this.state.currentSection];
    if (!sec || sec.answered) return;
    if (flyer.data.isCorrect) {
      sec.answered = true;
      flyer.data.carrying = true;
      this.state.carryingFlyer = flyer;
      this.banner.show('Correct! Hold on...', 'correct');
      for (const f of this.flyers) {
        if (f !== flyer && f.data.state === 'live') {
          f.data.state = 'crashing';
        }
      }
    } else {
      this.crashFlyer(flyer, 'Wrong - try again!');
    }
  }

  private crashFlyer(flyer: Flyer, msg: string): void {
    flyer.data.state = 'crashing';
    this.banner.show(msg, 'wrong');
    this.state.dwellTicks = 0;
  }

  private arriveAtNextSection(): void {
    const playerBody = this.player.sprite.body as Phaser.Physics.Arcade.Body;
    playerBody.setAllowGravity(true);

    this.state.carryingFlyer = null;
    this.state.onFlyer = null;
    this.state.dwellTicks = 0;

    const nextIdx = this.state.currentSection + 1;
    const nextSec: Section | undefined = this.level.sections[nextIdx];
    if (nextSec) {
      this.player.setPosition(nextSec.solid.x + 40, nextSec.solid.y);
      this.state.currentSection = nextIdx;
      this.spawnFlyersForSection(nextIdx);
      this.banner.show(nextSec.question.question, 'question');
    } else {
      // Final platform — Milestone D will trigger the win flow here.
      this.player.setPosition(this.level.finalSolid.x + 40, this.level.finalSolid.y);
      this.banner.show('Walk to the door!', 'info');
      for (const f of this.flyers) f.destroy();
      this.flyers = [];
    }
  }
}
