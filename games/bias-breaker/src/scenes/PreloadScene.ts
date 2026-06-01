// Minimal preload — visuals are procedural (no asset files yet).
// Phase 2 polish or a future asset pass can add sprite atlases here.

import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }
  create(): void {
    this.scene.start('AvatarSelectScene');
  }
}
