// AvatarSelectScene — pick one of the three AI Glitch Busters (Rihal, Aanya, Noah)
// before the level. Shows them as tappable cards, remembers the choice in
// localStorage (gg.bias.persona), then starts the game.

import Phaser from 'phaser';
import {
  PERSONAS,
  ensurePersonaTextures,
  personaTextureKey,
  loadPersona,
  savePersona,
  type Persona,
} from '../avatar';

export class AvatarSelectScene extends Phaser.Scene {
  private selected!: Persona;
  private cards: { persona: Persona; ring: Phaser.GameObjects.Rectangle }[] = [];

  constructor() {
    super('AvatarSelectScene');
  }

  create(): void {
    const { width, height } = this.scale;
    this.cards = [];
    this.cameras.main.setBackgroundColor('#0a0820');
    this.selected = loadPersona();

    this.add
      .text(width / 2, height * 0.13, 'Pick your Glitch Buster!', {
        fontFamily: 'Arial Black, sans-serif',
        fontSize: '54px',
        color: '#43e97b',
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height * 0.22, 'Tap a hero, then press Play', {
        fontFamily: 'Arial, sans-serif',
        fontSize: '24px',
        color: '#cfeefe',
      })
      .setOrigin(0.5);

    const gap = 340;
    const startX = width / 2 - ((PERSONAS.length - 1) * gap) / 2;
    const cardY = height * 0.5;

    PERSONAS.forEach((persona, i) => {
      ensurePersonaTextures(this, persona);
      const x = startX + i * gap;
      const ring = this.add
        .rectangle(x, cardY, 214, 314)
        .setStrokeStyle(5, 0x43e97b)
        .setVisible(false);
      const card = this.add
        .rectangle(x, cardY, 200, 300, 0x14224a, 0.95)
        .setStrokeStyle(2, 0x2a3a66)
        .setInteractive({ useHandCursor: true });
      this.add.image(x, cardY - 28, personaTextureKey(persona.id, 'idle')).setScale(1.7);
      this.add
        .text(x, cardY + 86, persona.name, {
          fontFamily: 'Arial Black, sans-serif',
          fontSize: '26px',
          color: '#ffffff',
        })
        .setOrigin(0.5);
      this.add
        .text(x, cardY + 116, persona.title, {
          fontFamily: 'Arial, sans-serif',
          fontSize: '15px',
          color: '#43e97b',
        })
        .setOrigin(0.5);
      card.on('pointerdown', () => this.select(persona));
      this.cards.push({ persona, ring });
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
      savePersona(this.selected.id);
      this.scene.start('HowToScene');
    });

    this.select(this.selected);
  }

  private select(persona: Persona): void {
    this.selected = persona;
    for (const c of this.cards) {
      c.ring.setVisible(c.persona.id === persona.id);
    }
  }
}
