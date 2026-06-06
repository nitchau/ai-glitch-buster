// Minimal preload — the vault is drawn procedurally. Boots straight into the game.

import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }
  create(): void {
    this.scene.start('HowToScene');
  }
}
