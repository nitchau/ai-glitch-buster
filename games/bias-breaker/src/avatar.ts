// Shared kid-avatar drawing + persona persistence for Bias Breaker.
//
// The three playable characters are the AI Glitch Busters from the app's video —
// Rihal, Aanya, and Noah. Each is a procedural cartoon kid (no image assets),
// told apart by gender (hairstyle / bow), skin tone, and shirt colour. The picker
// preview and the in-game sprite share this drawer, so they always match.

import Phaser from 'phaser';
import { PLAYER_W, PLAYER_H } from './constants';

export type AvatarGender = 'boy' | 'girl';
export type AvatarFrame = 'idle' | 'walk0' | 'walk1';

export type Persona = {
  id: string;
  name: string;
  title: string;
  gender: AvatarGender;
  skin: number; // hex skin colour
  shirt: number; // hex shirt colour
};

// The three video heroes. Looks are an easy starting point — tweak names/gender/
// skin/shirt freely; nothing else is keyed off them but the `id`.
export const PERSONAS: readonly Persona[] = [
  { id: 'rihal', name: 'Rihal', title: 'Bias Buster', gender: 'boy', skin: 0x8d5524, shirt: 0x3b82f6 },
  { id: 'aanya', name: 'Aanya', title: 'Truth Seeker', gender: 'girl', skin: 0xc68642, shirt: 0xec4899 },
  { id: 'noah', name: 'Noah', title: 'Data Defender', gender: 'boy', skin: 0xf1c27d, shirt: 0xf59e0b },
];

const DEFAULT_ID = 'rihal';
const STORAGE_KEY = 'gg.bias.persona';
const HAIR_COLOR = 0x2b1a0e;
const PANTS = 0x3a4d6a;
const SHOE = 0x26334d;
const BOW = 0xff7eb6;

export function personaById(id: string): Persona {
  return PERSONAS.find((p) => p.id === id) ?? PERSONAS[0]!;
}

export function loadPersona(): Persona {
  try {
    const id = localStorage.getItem(STORAGE_KEY);
    if (id) return personaById(id);
  } catch {
    /* ignore */
  }
  return personaById(DEFAULT_ID);
}

export function savePersona(id: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

export function personaTextureKey(id: string, frame: AvatarFrame): string {
  return `kid-${id}-${frame}`;
}

// Generate the three frames (idle / two walk strides) for a persona.
export function ensurePersonaTextures(scene: Phaser.Scene, persona: Persona): void {
  if (scene.textures.exists(personaTextureKey(persona.id, 'idle'))) return;
  drawKid(scene, personaTextureKey(persona.id, 'idle'), persona, 0);
  drawKid(scene, personaTextureKey(persona.id, 'walk0'), persona, 1);
  drawKid(scene, personaTextureKey(persona.id, 'walk1'), persona, -1);
}

// Multiply each RGB channel by f (<1 darkens) — used for the shirt's sleeves/collar.
function darken(hex: number, f: number): number {
  const r = Math.floor(((hex >> 16) & 0xff) * f);
  const g = Math.floor(((hex >> 8) & 0xff) * f);
  const b = Math.floor((hex & 0xff) * f);
  return (r << 16) | (g << 8) | b;
}

function drawKid(scene: Phaser.Scene, key: string, persona: Persona, strideDir: number): void {
  const w = PLAYER_W;
  const h = PLAYER_H;
  const g = scene.add.graphics({ x: 0, y: 0 });
  const SKIN = persona.skin;
  const SHIRT = persona.shirt;
  const SHIRT_DK = darken(persona.shirt, 0.78);
  const gender = persona.gender;

  const cx = w / 2;
  const hipY = h * 0.6;
  const shoulderY = h * 0.36;
  const footY = h - 4;
  const s = strideDir * 7;

  // ---- Legs (behind torso) ----
  drawLimb(g, PANTS, cx - 7, hipY, cx - 7 + s, footY, 9);
  drawLimb(g, PANTS, cx + 7, hipY, cx + 7 - s, footY, 9);
  g.fillStyle(SHOE);
  g.fillEllipse(cx - 7 + s + 3, footY, 16, 9);
  g.fillEllipse(cx + 7 - s + 3, footY, 16, 9);

  // ---- Arms (swing opposite the legs), hands in skin ----
  drawLimb(g, SHIRT_DK, cx - 13, shoulderY + 2, cx - 14 - s, hipY + 6, 7);
  drawLimb(g, SHIRT_DK, cx + 13, shoulderY + 2, cx + 14 + s, hipY + 6, 7);
  g.fillStyle(SKIN);
  g.fillCircle(cx - 14 - s, hipY + 7, 5);
  g.fillCircle(cx + 14 + s, hipY + 7, 5);

  // ---- Torso (shirt) ----
  g.fillStyle(SHIRT);
  g.fillRoundedRect(cx - 14, shoulderY, 28, hipY - shoulderY + 6, 7);
  g.fillStyle(SHIRT_DK);
  g.fillRoundedRect(cx - 14, shoulderY, 28, 8, 4);

  // ---- Head ----
  const headR = w * 0.3;
  const headY = h * 0.2;

  // Girl: long side hair behind the face (drawn first so the face sits on top).
  if (gender === 'girl') {
    g.fillStyle(HAIR_COLOR);
    g.fillEllipse(cx - headR + 2, headY + 8, 11, 26);
    g.fillEllipse(cx + headR - 2, headY + 8, 11, 26);
  }

  // Single skin head — the ONLY skin region on the face.
  g.fillStyle(SKIN);
  g.fillCircle(cx, headY, headR);
  g.fillCircle(cx - headR + 1, headY + 1, 3);
  g.fillCircle(cx + headR - 1, headY + 1, 3);

  // Hair cluster on top.
  g.fillStyle(HAIR_COLOR);
  g.fillCircle(cx - 10, headY - 7, 5);
  g.fillCircle(cx - 3, headY - 11, 6);
  g.fillCircle(cx + 4, headY - 11, 6);
  g.fillCircle(cx + 10, headY - 7, 5);
  g.fillCircle(cx - 13, headY - 1, 4.5);
  g.fillCircle(cx + 13, headY - 1, 4.5);

  // Girl: a little bow on top.
  if (gender === 'girl') {
    g.fillStyle(BOW);
    g.fillTriangle(cx - 1, headY - 13, cx - 9, headY - 17, cx - 9, headY - 9);
    g.fillTriangle(cx + 1, headY - 13, cx + 9, headY - 17, cx + 9, headY - 9);
    g.fillCircle(cx, headY - 13, 2.5);
  }

  // ---- Face: eyes + smile ----
  g.fillStyle(0x1a1a1a);
  g.fillCircle(cx - 5, headY, 2.3);
  g.fillCircle(cx + 5, headY, 2.3);
  g.lineStyle(2, 0x1a1a1a, 1);
  g.beginPath();
  g.arc(cx, headY + 5, 6, 0.15 * Math.PI, 0.85 * Math.PI);
  g.strokePath();

  g.generateTexture(key, w, h);
  g.destroy();
}

// A limb: a quad from a fixed joint to an offset extremity.
function drawLimb(
  g: Phaser.GameObjects.Graphics,
  color: number,
  topX: number,
  topY: number,
  botX: number,
  botY: number,
  width: number
): void {
  const hw = width / 2;
  g.fillStyle(color);
  g.fillPoints(
    [
      new Phaser.Geom.Point(topX - hw, topY),
      new Phaser.Geom.Point(topX + hw, topY),
      new Phaser.Geom.Point(botX + hw, botY),
      new Phaser.Geom.Point(botX - hw, botY),
    ],
    true
  );
}
