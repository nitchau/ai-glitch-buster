// Minimal preload — the harbor is drawn procedurally (no asset files yet).
// Boots straight into the maze: Bad-Habit Harbor has no avatar picker.

import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }
  create(): void {
    this.scene.start('HowToScene');
  }
}
