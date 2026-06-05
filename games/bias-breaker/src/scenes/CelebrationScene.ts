// CelebrationScene — the Bias Breaker win screen.
// Port of legacy/GAME/screens/bias-breaker-celebration.js (stars + time tier +
// bonus + confetti + Back-to-Map) wired to the @gg/shared profile SDK so the
// next island unlocks. Reached from GameScene.enterDoor().

import Phaser from 'phaser';
import { markIslandCleared } from '@gg/shared';
import { STAR_TIME_GOLD, STAR_TIME_SILVER } from '../constants';

export type CelebrationData = {
  stars: number;
  time: number; // whole seconds
  score: number; // tortoise bonus points
};

const CONFETTI_COLORS = [0x43e97b, 0xffd700, 0xf5576c, 0x38f9d7, 0xf093fb];

export class CelebrationScene extends Phaser.Scene {
  constructor() {
    super('CelebrationScene');
  }

  create(data: CelebrationData): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    this.cameras.main.setBackgroundColor('#0a0820');
    this.spawnConfetti();

    // Persist the clear and unlock the next island. We are no longer "in" the
    // game, so drop the refresh-resume flag (D3).
    try {
      localStorage.removeItem('gg.activeIsland');
    } catch {
      /* ignore */
    }
    const saved = markIslandCleared('bias-breaker', data.stars);

    // ---- Title + subtitle ----
    this.add
      .text(cx, height * 0.16, 'You freed the city!', {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '52px',
        color: '#43e97b',
      })
      .setOrigin(0.5);
    this.add
      .text(
        cx,
        height * 0.27,
        'Bias Breaker is healed. Fair AI treats everyone the same —\nyou helped Datapolis learn that.',
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '22px',
          color: '#cfeefe',
          align: 'center',
        }
      )
      .setOrigin(0.5);

    // ---- Stars ----
    const filled = Math.max(1, Math.min(3, data.stars || 1));
    const stars = '⭐'.repeat(filled) + '☆'.repeat(3 - filled);
    this.add
      .text(cx, height * 0.42, stars, { fontFamily: 'Arial, sans-serif', fontSize: '56px' })
      .setOrigin(0.5);

    // ---- Time + tier badge, bonus score ----
    const tier =
      data.time <= STAR_TIME_GOLD ? ' ⚡ Lightning!' : data.time <= STAR_TIME_SILVER ? ' Quick!' : '';
    const statLine =
      data.score > 0
        ? `⏱ ${data.time}s${tier}     🐢 +${data.score} bonus pts`
        : `⏱ ${data.time}s${tier}`;
    this.add
      .text(cx, height * 0.54, statLine, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#ffd166',
      })
      .setOrigin(0.5);

    // ---- Unlock / save status ----
    const unlockMsg = saved.ok
      ? '🌊 Bad-Habit Harbor unlocked!'
      : "Couldn't save — play again to keep it";
    this.add
      .text(cx, height * 0.64, unlockMsg, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        color: saved.ok ? '#38f9d7' : '#f5576c',
      })
      .setOrigin(0.5);

    // ---- Back to Map button ----
    this.makeButton(cx, height * 0.78, '🏠 Back to Map', () => {
      try {
        localStorage.removeItem('gg.activeIsland');
      } catch {
        /* ignore */
      }
      // Go up one level (…/glitch-guardians/<game>/ -> …/glitch-guardians/) to the
      // island map. Relative, so it works under any deploy sub-path.
      window.location.href = '../';
    });
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void): void {
    const text = this.add
      .text(x, y, label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#0a0820',
        backgroundColor: '#43e97b',
        padding: { x: 24, y: 12 },
      })
      .setOrigin(0.5)
      .setDepth(10)
      .setInteractive({ useHandCursor: true });
    text.on('pointerover', () => text.setBackgroundColor('#38f9d7'));
    text.on('pointerout', () => text.setBackgroundColor('#43e97b'));
    text.on('pointerdown', onClick);
  }

  // Tweened falling squares — a dependency-free port of the legacy confetti
  // canvas (no particle texture needed).
  private spawnConfetti(): void {
    const { width, height } = this.scale;
    for (let i = 0; i < 60; i++) {
      const size = 6 + Math.random() * 6;
      const color = CONFETTI_COLORS[(Math.random() * CONFETTI_COLORS.length) | 0]!;
      const rect = this.add
        .rectangle(Math.random() * width, -20 - Math.random() * height, size, size, color)
        .setDepth(2);
      this.tweens.add({
        targets: rect,
        y: height + 30,
        angle: (Math.random() > 0.5 ? 1 : -1) * 360,
        duration: 2500 + Math.random() * 2500,
        delay: Math.random() * 1500,
        repeat: -1,
        ease: 'Linear',
      });
    }
  }
}
