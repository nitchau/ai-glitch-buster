// AvatarSelectScene — pick your kid (boy/girl × light/dark skin) before the
// level. Shows the four real avatars as tappable cards, remembers the choice
// in localStorage (gg.bias.avatar), then starts the game.

import Phaser from 'phaser';
import {
  AVATAR_GENDERS,
  AVATAR_SKINS,
  ensureAvatarTextures,
  avatarTextureKey,
  loadAvatarChoice,
  saveAvatarChoice,
  type AvatarGender,
  type AvatarSkin,
} from '../avatar';

type Combo = { gender: AvatarGender; skin: AvatarSkin };

export class AvatarSelectScene extends Phaser.Scene {
  private selected!: Combo;
  private cards: { combo: Combo; ring: Phaser.GameObjects.Rectangle }[] = [];

  constructor() {
    super('AvatarSelectScene');
  }

  create(): void {
    const { width, height } = this.scale;
    this.cards = [];
    this.cameras.main.setBackgroundColor('#0a0820');
    this.selected = loadAvatarChoice();

    this.add
      .text(width / 2, height * 0.13, 'Pick your Guardian!', {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '54px',
        color: '#43e97b',
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height * 0.22, 'Tap a character, then press Play', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#cfeefe',
      })
      .setOrigin(0.5);

    const combos: Combo[] = [];
    for (const gender of AVATAR_GENDERS) {
      for (const skin of AVATAR_SKINS) combos.push({ gender, skin });
    }
    const gap = 300;
    const startX = width / 2 - ((combos.length - 1) * gap) / 2;
    const cardY = height * 0.5;

    combos.forEach((combo, i) => {
      ensureAvatarTextures(this, combo.gender, combo.skin);
      const x = startX + i * gap;
      const ring = this.add
        .rectangle(x, cardY, 212, 292)
        .setStrokeStyle(5, 0x43e97b)
        .setVisible(false);
      const card = this.add
        .rectangle(x, cardY, 200, 280, 0x14224a, 0.95)
        .setStrokeStyle(2, 0x2a3a66)
        .setInteractive({ useHandCursor: true });
      this.add.image(x, cardY - 8, avatarTextureKey(combo.gender, combo.skin, 'idle')).setScale(1.7);
      const label = `${combo.gender === 'boy' ? 'Boy' : 'Girl'} · ${combo.skin === 'light' ? 'Light' : 'Dark'}`;
      this.add
        .text(x, cardY + 118, label, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '20px',
          color: '#cfeefe',
        })
        .setOrigin(0.5);
      card.on('pointerdown', () => this.select(combo));
      this.cards.push({ combo, ring });
    });

    const btn = this.add
      .text(width / 2, height * 0.85, '▶  Play!', {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '32px',
        color: '#06202a',
        backgroundColor: '#43e97b',
        padding: { x: 40, y: 16 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setBackgroundColor('#38f9d7'));
    btn.on('pointerout', () => btn.setBackgroundColor('#43e97b'));
    btn.on('pointerdown', () => {
      saveAvatarChoice(this.selected);
      this.scene.start('GameScene');
    });

    this.select(this.selected);
  }

  private select(combo: Combo): void {
    this.selected = combo;
    for (const c of this.cards) {
      const on = c.combo.gender === combo.gender && c.combo.skin === combo.skin;
      c.ring.setVisible(on);
    }
  }
}
