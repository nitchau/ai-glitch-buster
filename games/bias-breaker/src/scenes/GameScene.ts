// GameScene — the playable Bias Breaker level.
// A: static world + player + camera + keyboard.  B: flyers + dwell + carrier.
// C: lava respawn + tortoise + HUD.              D: door win → Celebration.
// Polish pass: frame-based cloud drift (+ ride-the-cloud), a circular dwell
// ring, wrong-answer rain that drops the player into the lava, and the player
// emerging from the entry door behind an invisible left wall.

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
  STAR_TIME_GOLD,
  STAR_TIME_SILVER,
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
  animFrame: number; // per-frame clock for drift + tortoise scheduling
  respawning: boolean; // true during the lava fade-out → respawn → fade-in
  tortoiseSpawnFrame: number; // animFrame at which the next tortoise may appear
  lastSecond: number; // last whole second pushed to the HUD timer
  carryHang: boolean; // current carry rides UNDER the flyer (kite / quadcopter)
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
  private doorRect!: Phaser.GameObjects.Rectangle;
  private dwellRing!: Phaser.GameObjects.Graphics;
  private state!: GameState;

  constructor() {
    super('GameScene');
  }

  create(): void {
    // Persist that we are inside Bias Breaker for refresh-resume (Phase 4 wires the resume).
    try {
      localStorage.setItem('gg.activeIsland', 'bias-breaker');
    } catch {
      /* ignore */
    }

    // Pick 5 random questions from the bias bank.
    const questions: Question[] = pickN('bias', 5);
    this.level = buildLevel(questions);

    // World + camera bounds span the full level width.
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

    // ---- Entry door (where the player emerges) + final door ----
    this.add
      .rectangle(
        this.level.entryDoor.x,
        this.level.entryDoor.y,
        this.level.entryDoor.w,
        this.level.entryDoor.h,
        0x8b5a2b
      )
      .setOrigin(0, 0)
      .setStrokeStyle(4, 0x4a2f15);
    // Door opening (darker inset) for a bit of depth.
    this.add
      .rectangle(
        this.level.entryDoor.x + 12,
        this.level.entryDoor.y + 14,
        this.level.entryDoor.w - 24,
        this.level.entryDoor.h - 14,
        0x1a1006
      )
      .setOrigin(0, 0);
    this.doorRect = this.add
      .rectangle(
        this.level.door.x,
        this.level.door.y,
        this.level.door.w,
        this.level.door.h,
        0xffd700
      )
      .setOrigin(0, 0)
      .setStrokeStyle(3, 0xb38600);

    // ---- Player emerges from the entry door ----
    const entry = this.level.entryDoor;
    const firstSolid = this.level.sections[0]!.solid;
    this.player = new Player(this, entry.x + entry.w / 2, firstSolid.y);
    this.physics.add.collider(this.player.sprite, this.platforms);
    // Pop out of the doorway.
    this.player.sprite.setAlpha(0).setScale(0.5);
    this.tweens.add({
      targets: this.player.sprite,
      alpha: 1,
      scaleX: 1,
      scaleY: 1,
      duration: 450,
      ease: 'Back.out',
    });
    // Invisible left wall: can't walk off the entry ramp into the lava, and
    // can't go back out through the door.
    const leftWall = this.add.rectangle(firstSolid.x - 12, CANVAS_H / 2, 24, CANVAS_H, 0x000000, 0);
    this.physics.add.existing(leftWall, true);
    this.physics.add.collider(this.player.sprite, leftWall);

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
      carryHang: false,
    };

    // ---- Flyers + banner + HUD + dwell ring ----
    this.banner = new Banner(this);
    this.spawnFlyersForSection(0);
    this.banner.show(this.level.sections[0]!.question.question, 'question');
    this.hud = new Hud(this, this.level.sections.length);
    this.dwellRing = this.add.graphics().setDepth(70);

    // ---- Test seam: expose state for Playwright assertions ----
    if (__TEST_SEAM__) {
      (window as unknown as { __GAME_STATE__: () => unknown }).__GAME_STATE__ = () => ({
        section: this.state.currentSection,
        timeMs: this.state.timeMs,
        score: this.state.score,
        dwellTicks: this.state.dwellTicks,
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
    if (this.state.doorEntered) {
      this.dwellRing.clear();
      return;
    }
    if (this.state.respawning) {
      this.dwellRing.clear();
      return; // frozen during the lava fade
    }

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
      this.dwellRing.clear();
      const nextSolid =
        this.level.sections[this.state.currentSection + 1]?.solid ?? this.level.finalSolid;
      const arrived = this.state.carryingFlyer.updateCarrier(
        this.player.sprite,
        nextSolid,
        this.state.carryHang
      );
      if (arrived) {
        this.arriveAtNextSection();
      }
      return;
    }

    // Normal play: player update + flyers drift (frame-based, matches vanilla speed)
    this.player.update(this.keys);
    for (const f of this.flyers) {
      if (f.data.state === 'live') f.updateDrift(this.state.animFrame);
      else if (f.data.state === 'crashing') f.updateCrashing();
    }

    // Hazards: lava first (may start a respawn fade), then the tortoise.
    this.checkLava();
    if (this.state.respawning) {
      this.dwellRing.clear();
      return;
    }
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
      const closeY = Math.abs(playerBottom - f.data.y) < 10;
      if (overlapX && closeY && playerBody.velocity.y >= 0) {
        this.state.onFlyer = f;
        break;
      }
    }

    // Dwell-to-confirm + ride the cloud. The ring fills only while the player is
    // still ON an answer; jumping or moving off resets it (legacy 544-565).
    if (this.state.onFlyer) {
      const vx = Math.abs(playerBody.velocity.x);
      const vy = Math.abs(playerBody.velocity.y);
      const stillEnough = vx < WALK_SPEED_PER_S * 0.5 && vy < 40;
      if (stillEnough) {
        // Ride the drifting flyer so standing still keeps the player aboard.
        // The flyer drifts vx px PER UPDATE (driven by animFrame), so to track it
        // the player must move vx px per update too — velocity integrates over
        // real time, hence vx * 1000 / delta (frame-rate independent). Using a
        // flat vx * 60 let the player slide off narrow kites when fps dipped.
        const rideVx =
          delta > 0 ? (this.state.onFlyer.data.vx * 1000) / delta : this.state.onFlyer.data.vx * 60;
        this.player.sprite.setVelocityX(rideVx);
        this.state.dwellTicks++;
        if (this.state.dwellTicks >= COMMIT_FRAMES) {
          this.commitAnswer(this.state.onFlyer);
        }
      } else {
        this.state.dwellTicks = 0;
      }
    } else {
      this.state.dwellTicks = 0;
    }
    this.drawDwellRing();

    // Final platform — open the door and watch for the player walking through.
    this.checkDoor();
  }

  // ---- Lava + respawn ----

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

    // Clear the tortoise and grant full breathing room before the next spawn.
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

  // ---- Tortoise ----

  private updateTortoise(): void {
    if (this.state.carryingFlyer || this.state.doorEntered) return;
    if (this.state.currentSection >= this.level.sections.length) return;

    if (!this.tortoise && this.state.animFrame >= this.state.tortoiseSpawnFrame) {
      this.spawnTortoise();
    }
    const t = this.tortoise;
    if (!t) return;

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
    this.state.tortoiseSpawnFrame =
      this.state.animFrame +
      TORTOISE_RESPAWN_MIN +
      Math.floor(Math.random() * (TORTOISE_RESPAWN_MAX - TORTOISE_RESPAWN_MIN));
  }

  private checkTortoiseCollision(): void {
    const t = this.tortoise;
    if (!t || !t.alive) return;
    const px = this.player.sprite.x;
    const pBottom = this.player.sprite.y;
    const pLeft = px - PLAYER_W / 2;
    const pRight = px + PLAYER_W / 2;
    const pTop = pBottom - PLAYER_H;
    const overlap =
      pRight > t.x && pLeft < t.x + TORTOISE_W && pBottom > t.y && pTop < t.y + TORTOISE_H;
    if (!overlap) return;

    const body = this.player.sprite.body as Phaser.Physics.Arcade.Body;
    if (body.velocity.y > 0 && pBottom < t.y + 22) {
      // Stomp from above: +20, kill, bounce off.
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
      // Side bump: gentle knockback, no score penalty.
      const tCenter = t.x + TORTOISE_W / 2;
      this.player.sprite.setVelocityX(px < tCenter ? -240 : 240);
    }
  }

  // ---- Final door + win ----

  private checkDoor(): void {
    if (this.state.doorEntered) return;
    if (this.state.currentSection < this.level.sections.length) return;

    if (!this.level.door.open) {
      this.level.door.open = true;
      this.doorRect.setFillStyle(0x6effc0);
      this.banner.show('The door is open — walk through! 🚪', 'info');
    }

    const d = this.level.door;
    const px = this.player.sprite.x;
    const pBottom = this.player.sprite.y; // feet
    const pTop = pBottom - PLAYER_H;
    const overlap =
      px + PLAYER_W / 2 > d.x + 10 &&
      px - PLAYER_W / 2 < d.x + d.w - 10 &&
      pBottom > d.y + 20 &&
      pTop < d.y + d.h - 20;
    if (overlap) this.enterDoor();
  }

  private enterDoor(): void {
    this.state.doorEntered = true;
    this.dwellRing.clear();
    if (this.tortoise) {
      this.tortoise.destroy();
      this.tortoise = null;
    }
    this.banner.show('You walked through! 🎉', 'correct');
    this.tweens.add({
      targets: this.player.sprite,
      alpha: 0,
      scaleX: 0.4,
      scaleY: 0.4,
      duration: 500,
    });
    this.time.delayedCall(900, () => {
      const finalSec = Math.floor(this.state.timeMs / 1000);
      const stars = finalSec <= STAR_TIME_GOLD ? 3 : finalSec <= STAR_TIME_SILVER ? 2 : 1;
      this.scene.start('CelebrationScene', {
        stars,
        time: finalSec,
        score: this.state.score,
      });
    });
  }

  private commitAnswer(flyer: Flyer): void {
    const sec = this.level.sections[this.state.currentSection];
    if (!sec || sec.answered) return;
    if (flyer.data.isCorrect) {
      sec.answered = true;
      flyer.data.carrying = true;
      this.state.carryingFlyer = flyer;
      // Kite & quadcopter carry you hanging underneath; the rest ride on top.
      this.state.carryHang = flyer.data.type === 'kite' || flyer.data.type === 'quadcopter';
      this.banner.show(this.state.carryHang ? 'Correct! Hang on!' : 'Correct! Hold on...', 'correct');
      for (const f of this.flyers) {
        if (f !== flyer && f.data.state === 'live') {
          f.data.state = 'crashing';
        }
      }
    } else {
      this.crashFlyer(flyer, 'Wrong — into the lava you go!');
    }
  }

  // Wrong answer: the chosen cloud bursts into rain and EVERY cloud stops
  // holding the player up, so they drop straight into the lava (then respawn).
  private crashFlyer(flyer: Flyer, msg: string): void {
    flyer.data.state = 'crashing';
    this.spawnRain(flyer.data.x + flyer.data.w / 2, flyer.data.y + flyer.data.h / 2);
    for (const f of this.flyers) {
      const b = f.sprite.body as Phaser.Physics.Arcade.Body | null;
      if (b) b.enable = false;
    }
    this.banner.show(msg, 'wrong');
    this.state.dwellTicks = 0;
  }

  private spawnRain(x: number, y: number): void {
    for (let i = 0; i < 16; i++) {
      const dx = (Math.random() - 0.5) * 130;
      const drop = this.add
        .rectangle(x + dx, y + Math.random() * 12, 3, 13, 0x7cc8ff, 0.9)
        .setDepth(45);
      this.tweens.add({
        targets: drop,
        y: LAVA_Y,
        alpha: 0,
        duration: 450 + Math.random() * 450,
        ease: 'Quad.in',
        onComplete: () => drop.destroy(),
      });
    }
  }

  // Circular confirm ring above the player; arc fills with dwellTicks.
  private drawDwellRing(): void {
    this.dwellRing.clear();
    if (!this.state.onFlyer || this.state.dwellTicks <= 0) return;
    const cx = this.player.sprite.x;
    const cy = this.player.sprite.y - PLAYER_H - 16;
    const r = 20;
    const prog = Math.min(1, this.state.dwellTicks / COMMIT_FRAMES);
    this.dwellRing.fillStyle(0x0c1838, 0.55);
    this.dwellRing.fillCircle(cx, cy, r + 5);
    this.dwellRing.lineStyle(5, 0xffffff, 0.22);
    this.dwellRing.strokeCircle(cx, cy, r);
    this.dwellRing.lineStyle(5, 0x38f9d7, 1);
    this.dwellRing.beginPath();
    this.dwellRing.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2, false);
    this.dwellRing.strokePath();
  }

  private arriveAtNextSection(): void {
    const playerBody = this.player.sprite.body as Phaser.Physics.Arcade.Body;
    playerBody.setAllowGravity(true);

    this.state.carryingFlyer = null;
    this.state.onFlyer = null;
    this.state.dwellTicks = 0;

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
      // checkDoor() reads to open the door.
      this.player.setPosition(this.level.finalSolid.x + 40, this.level.finalSolid.y);
      this.state.currentSection = nextIdx;
      this.banner.show('Walk to the door!', 'info');
      this.hud.setSection(this.level.sections.length, this.level.sections.length);
      for (const f of this.flyers) f.destroy();
      this.flyers = [];
    }
  }
}
