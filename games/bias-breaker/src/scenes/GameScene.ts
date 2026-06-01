// GameScene — the playable Bias Breaker level.
// Milestone A: static world (platforms, lava, doors, background) + player + camera + keyboard.
// Milestone B: drifting answer flyers + question banner + dwell-to-confirm + carrier-flyer transit.
// Milestone C: lava fall + v13.2 NaN-free respawn, tortoise enemy (walk/stomp/bump), HUD.
// Milestone D (next): final door win flow → CelebrationScene + markIslandCleared.

import Phaser from 'phaser';
import { pickN, type Question } from '@gg/shared';
import {
  CANVAS_H,
  SOLID_Y,
  LAVA_Y,
  COMMIT_FRAMES,
  WALK_SPEED_PER_S,
  JUMP_SPEED_PER_S,
  PLAYER_W,
  PLAYER_H,
  TORTOISE_W,
  TORTOISE_H,
  TORTOISE_SPEED,
  TORTOISE_FIRST_DELAY,
  TORTOISE_RESPAWN_MIN,
  TORTOISE_RESPAWN_MAX,
  TORTOISE_STOMP_POINTS,
} from '../constants';
import { buildLevel, buildFlyers } from '../level/buildLevel';
import type { Level, Section } from '../level/types';
import { Player, type PlayerKeys } from '../entities/Player';
import { Flyer } from '../entities/Flyer';
import { Tortoise } from '../entities/Tortoise';
import { Banner } from '../ui/Banner';
import { Hud } from '../ui/Hud';

declare const __TEST_SEAM__: boolean;

type GameState = {
  currentSection: number;
  dwellTicks: number;
  onFlyer: Flyer | null;
  carryingFlyer: Flyer | null;
  timeMs: number;
  score: number;
  doorEntered: boolean;
  animFrame: number; // per-frame clock for tortoise scheduling (mirrors legacy animTime)
  respawning: boolean; // true during the lava fade-out → respawn → fade-in
  tortoiseSpawnFrame: number; // animFrame at which the next tortoise may appear
  lastSecond: number; // last whole second pushed to the HUD timer
};

export class GameScene extends Phaser.Scene {
  private level!: Level;
  private player!: Player;
  private keys!: PlayerKeys;
  private flyers: Flyer[] = [];
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private banner!: Banner;
  private hud!: Hud;
  private tortoise: Tortoise | null = null;
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
      animFrame: 0,
      respawning: false,
      tortoiseSpawnFrame: TORTOISE_FIRST_DELAY,
      lastSecond: 0,
    };

    // ---- Flyers for section 0 + banner + HUD ----
    this.banner = new Banner(this);
    this.spawnFlyersForSection(0);
    this.banner.show(this.level.sections[0]!.question.question, 'question');
    this.hud = new Hud(this, this.level.sections.length);

    // ---- Test seam: expose state for Playwright assertions ----
    if (__TEST_SEAM__) {
      (window as unknown as { __GAME_STATE__: () => unknown }).__GAME_STATE__ = () => ({
        section: this.state.currentSection,
        timeMs: this.state.timeMs,
        score: this.state.score,
        onFlyer: this.state.onFlyer != null,
        carryingFlyer: this.state.carryingFlyer != null,
        doorEntered: this.state.doorEntered,
        respawning: this.state.respawning,
        tortoiseAlive: this.tortoise?.alive ?? false,
        doorOpen: this.level.door.open,
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
    if (this.state.respawning) return; // frozen during the lava fade

    this.state.animFrame++;

    // Timer (pauses during carrier transit — matches v13.3 intent)
    if (!this.state.carryingFlyer) {
      this.state.timeMs += delta;
      const sec = Math.floor(this.state.timeMs / 1000);
      if (sec !== this.state.lastSecond) {
        this.state.lastSecond = sec;
        this.hud.setTimer(sec);
      }
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

    // Hazards: lava first (may start a respawn fade), then the tortoise.
    this.checkLava();
    if (this.state.respawning) return;
    this.updateTortoise();
    this.checkTortoiseCollision();

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

  // ---- Lava + respawn (Milestone C1) ----

  private checkLava(): void {
    if (this.state.respawning || this.state.doorEntered || this.state.carryingFlyer) return;
    const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;
    // Player origin is feet, so sprite.y is the bottom. Falling into lava means
    // the feet dip past LAVA_Y while airborne (standing keeps blocked.down true).
    if (this.player.sprite.y >= LAVA_Y && !body.blocked.down) {
      this.state.respawning = true;
      this.state.dwellTicks = 0;
      this.state.onFlyer = null;
      this.cameras.main.fadeOut(250, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.respawnAtSection();
        this.cameras.main.fadeIn(250, 0, 0, 0);
        this.state.respawning = false;
      });
    }
  }

  private respawnAtSection(): void {
    const sec: Section | undefined = this.level.sections[this.state.currentSection];
    const solid = sec ? sec.solid : this.level.finalSolid;
    this.player.setPosition(solid.x + 30, solid.y);
    const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;
    body.setAllowGravity(true);

    this.state.dwellTicks = 0;
    this.state.onFlyer = null;
    this.state.carryingFlyer = null;

    // Clear the tortoise and grant full breathing room before the next spawn
    // (the v13.2 fix: without this the player can respawn straight onto a bump).
    if (this.tortoise) {
      this.tortoise.destroy();
      this.tortoise = null;
    }
    this.state.tortoiseSpawnFrame = this.state.animFrame + TORTOISE_FIRST_DELAY;

    // Rebuild this section's flyers (only if still unanswered) through buildFlyers
    // so travelLeft/travelRight match buildLevel exactly — no NaN labels.
    if (sec && !sec.answered) {
      sec.flyers = buildFlyers(sec.solid, sec.flyerType, sec.question);
      this.spawnFlyersForSection(this.state.currentSection);
      this.banner.show(sec.question.question, 'question');
    }
  }

  // ---- Tortoise (Milestone C2) ----

  private updateTortoise(): void {
    if (this.state.carryingFlyer || this.state.doorEntered) return;
    if (this.state.currentSection >= this.level.sections.length) return;

    if (!this.tortoise && this.state.animFrame >= this.state.tortoiseSpawnFrame) {
      this.spawnTortoise();
    }
    const t = this.tortoise;
    if (!t) return;

    // Despawn if the section advanced under it.
    if (t.sectionIdx !== this.state.currentSection) {
      t.destroy();
      this.tortoise = null;
      return;
    }
    const sec = this.level.sections[this.state.currentSection];
    if (!sec) return;
    const status = t.update(this.state.animFrame, sec.solid.x, sec.solid.w);
    if (status === 'despawn') {
      t.destroy();
      this.tortoise = null;
    }
  }

  private spawnTortoise(): void {
    const sec = this.level.sections[this.state.currentSection];
    if (!sec) return;
    const solid = sec.solid;
    const goingRight = Math.random() > 0.5;
    const x = goingRight ? solid.x + 12 : solid.x + solid.w - TORTOISE_W - 12;
    const y = SOLID_Y - TORTOISE_H;
    const vx = goingRight ? TORTOISE_SPEED : -TORTOISE_SPEED;
    this.tortoise = new Tortoise(this, this.state.currentSection, x, y, vx);
    // Schedule the next spawn now (legacy line 711).
    this.state.tortoiseSpawnFrame =
      this.state.animFrame +
      TORTOISE_RESPAWN_MIN +
      Math.floor(Math.random() * (TORTOISE_RESPAWN_MAX - TORTOISE_RESPAWN_MIN));
  }

  private checkTortoiseCollision(): void {
    const t = this.tortoise;
    if (!t || !t.alive) return;
    const px = this.player.sprite.x; // feet-origin → center x
    const pBottom = this.player.sprite.y; // feet
    const pLeft = px - PLAYER_W / 2;
    const pRight = px + PLAYER_W / 2;
    const pTop = pBottom - PLAYER_H;
    const overlap =
      pRight > t.x && pLeft < t.x + TORTOISE_W && pBottom > t.y && pTop < t.y + TORTOISE_H;
    if (!overlap) return;

    const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;
    if (body.velocity.y > 0 && pBottom < t.y + 22) {
      // Stomp from above: +20, kill, bounce off (legacy 758-769).
      t.kill(this.state.animFrame);
      this.state.score += TORTOISE_STOMP_POINTS;
      this.hud.setScore(this.state.score);
      this.player.sprite.setVelocityY(JUMP_SPEED_PER_S * 0.7);
      this.banner.show(`🐢 +${TORTOISE_STOMP_POINTS} Tortoise stomped!`, 'correct');
      this.time.delayedCall(1200, () => {
        const cur = this.level.sections[this.state.currentSection];
        if (cur && !this.state.doorEntered) this.banner.show(cur.question.question, 'question');
      });
    } else {
      // Side bump: gentle knockback, no score penalty (legacy 770-775).
      const tCenter = t.x + TORTOISE_W / 2;
      this.player.sprite.setVelocityX(px < tCenter ? -240 : 240);
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

    // Despawn any tortoise left on the platform we just rode away from.
    if (this.tortoise) {
      this.tortoise.destroy();
      this.tortoise = null;
    }

    const nextIdx = this.state.currentSection + 1;
    const nextSec: Section | undefined = this.level.sections[nextIdx];
    if (nextSec) {
      this.player.setPosition(nextSec.solid.x + 40, nextSec.solid.y);
      this.state.currentSection = nextIdx;
      this.spawnFlyersForSection(nextIdx);
      this.banner.show(nextSec.question.question, 'question');
      this.hud.setSection(nextIdx + 1, this.level.sections.length);
      this.state.tortoiseSpawnFrame = this.state.animFrame + TORTOISE_FIRST_DELAY;
    } else {
      // Reached the final platform. currentSection becomes sections.length, which
      // Milestone D reads to open the door.
      this.player.setPosition(this.level.finalSolid.x + 40, this.level.finalSolid.y);
      this.state.currentSection = nextIdx;
      this.banner.show('Walk to the door!', 'info');
      this.hud.setSection(this.level.sections.length, this.level.sections.length);
      for (const f of this.flyers) f.destroy();
      this.flyers = [];
    }
  }
}
