// CelebrationScene — the Bad-Habit Harbor win screen (the win the vanilla game
// never had). Stars by time + a rescue tally + confetti + Back-to-Map, wired to
// the @gg/shared profile SDK so Privacy Vaults unlocks. Reached from
// GameScene.enterExit(). Mirrors bias-breaker's CelebrationScene.

import Phaser from 'phaser';
import { markIslandCleared } from '@gg/shared';
import { STAR_TIME_GOLD, STAR_TIME_SILVER } from '../constants';

export type CelebrationData = {
  stars: number;
  time: number; // whole seconds
  rescued: number; // bots freed (of 5)
};

const CONFETTI_COLORS = [0x43e97b, 0xffd700, 0xf5576c, 0x38f9d7, 0xf093fb];

export class CelebrationScene extends Phaser.Scene {
  constructor() {
    super('CelebrationScene');
  }

  create(data: CelebrationData): void {
    const { width, height } = this.scale;
    const cx = width / 2;

    this.cameras.main.setBackgroundColor('#0a2738');
    this.spawnConfetti();

    // We are no longer "in" the game — drop the refresh-resume flag, then persist
    // the clear and unlock the next island.
    try {
      localStorage.removeItem('gg.activeIsland');
    } catch {
      /* ignore */
    }
    const saved = markIslandCleared('habit-harbor', data.stars);

    // ---- Title + subtitle ----
    this.add
      .text(cx, height * 0.15, 'The harbor is calm again!', {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '50px',
        color: '#43e97b',
      })
      .setOrigin(0.5);
    this.add
      .text(
        cx,
        height * 0.27,
        'Every helper-bot is back to good habits — kind, clear, honest.\nYou taught Bad-Habit Harbor how to be a great helper.',
        {
          fontFamily: 'Arial, sans-serif',
          fontSize: '21px',
          color: '#cfeefe',
          align: 'center',
        }
      )
      .setOrigin(0.5);

    // ---- Stars ----
    const filled = Math.max(1, Math.min(3, data.stars || 1));
    const stars = '⭐'.repeat(filled) + '☆'.repeat(3 - filled);
    this.add
      .text(cx, height * 0.43, stars, { fontFamily: 'Arial, sans-serif', fontSize: '56px' })
      .setOrigin(0.5);

    // ---- Time + tier badge, rescue tally ----
    const tier =
      data.time <= STAR_TIME_GOLD ? ' ⚡ Lightning!' : data.time <= STAR_TIME_SILVER ? ' Quick!' : '';
    this.add
      .text(cx, height * 0.55, `⏱ ${data.time}s${tier}     🤖 ${data.rescued}/5 rescued`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#ffd166',
      })
      .setOrigin(0.5);

    // ---- Unlock / save status ----
    const unlockMsg = saved.ok
      ? '🛡️ Privacy Vaults unlocked!'
      : "Couldn't save — play again to keep it";
    this.add
      .text(cx, height * 0.65, unlockMsg, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        color: saved.ok ? '#38f9d7' : '#f5576c',
      })
      .setOrigin(0.5);

    // ---- Back to Map button ----
    this.makeButton(cx, height * 0.79, '🏠 Back to Map', () => {
      try {
        localStorage.removeItem('gg.activeIsland');
      } catch {
        /* ignore */
      }
      // No landing page yet; '/' 404s on Vercel until the Phase 4 cutover.
      window.location.href = '/';
    });
  }

  private makeButton(x: number, y: number, label: string, onClick: () => void): void {
    const text = this.add
      .text(x, y, label, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#06202a',
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

  // Tweened falling squares — a dependency-free confetti (no particle texture).
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
