// Celebration stub — full implementation lands in Milestone D.
// For now: show the result data and a back link.

import Phaser from 'phaser';

export type CelebrationData = {
  stars: number;
  time: number;
  score: number;
};

export class CelebrationScene extends Phaser.Scene {
  constructor() {
    super('CelebrationScene');
  }

  create(data: CelebrationData): void {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height / 2 - 60, 'You freed the city!', {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '48px',
        color: '#43e97b',
      })
      .setOrigin(0.5);
    const stars = '⭐'.repeat(data.stars) + '☆'.repeat(3 - data.stars);
    this.add
      .text(width / 2, height / 2, stars, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '42px',
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height / 2 + 60, `⏱ ${data.time}s   ★ ${data.score} pts`, {
        fontFamily: 'Arial, sans-serif',
        fontSize: '22px',
        color: '#cfeefe',
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height / 2 + 110, '🌊 Bad-Habit Harbor unlocked! (Milestone D)', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        color: '#ffd700',
      })
      .setOrigin(0.5);
  }
}
