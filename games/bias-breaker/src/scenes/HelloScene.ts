import Phaser from 'phaser';

export class HelloScene extends Phaser.Scene {
  constructor() {
    super('HelloScene');
  }

  create(): void {
    const { width, height } = this.scale;
    const title = this.add
      .text(width / 2, height / 2 - 20, 'Hello Glitch Guardians!', {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '56px',
        color: '#43e97b',
      })
      .setOrigin(0.5)
      .setShadow(0, 4, '#000', 8, true, true);

    this.add
      .text(width / 2, height / 2 + 40, 'Phaser 3 + TS + Vite — Migration Phase 1 OK', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        color: '#cfeefe',
      })
      .setOrigin(0.5);

    // Gentle pulse on the title (cheap "it works" signal).
    this.tweens.add({
      targets: title,
      scale: { from: 1, to: 1.04 },
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}
