// Shared kid-avatar drawing + choice persistence.
// Used by the Player entity and the AvatarSelectScene so the preview and the
// in-game sprite are identical. The head is a SINGLE skin circle with hair
// stamped as a cluster of circles on top (never a centre-anchored pie slice —
// that left the face split into two tones). Parametrized by skin + gender,
// mirroring the legacy bias-breaker-avatar.js colour hooks.

import Phaser from 'phaser';
import { PLAYER_W, PLAYER_H } from './constants';

export type AvatarSkin = 'light' | 'dark';
export type AvatarGender = 'boy' | 'girl';
export type AvatarChoice = { gender: AvatarGender; skin: AvatarSkin };
export type AvatarFrame = 'idle' | 'walk0' | 'walk1';

export const AVATAR_SKINS: readonly AvatarSkin[] = ['light', 'dark'];
export const AVATAR_GENDERS: readonly AvatarGender[] = ['boy', 'girl'];

const STORAGE_KEY = 'gg.bias.avatar';

const SKIN_COLOR: Record<AvatarSkin, number> = {
  light: 0xfcd9a8,
  dark: 0x875432,
};
const HAIR_COLOR = 0x2b1a0e;
const SHIRT = 0x43e97b;
const SHIRT_DK = 0x2bc063;
const PANTS = 0x3a4d6a;
const SHOE = 0x26334d;
const BOW = 0xff7eb6;

export function loadAvatarChoice(): AvatarChoice {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const p = JSON.parse(raw) as Partial<AvatarChoice>;
      if (
        (p.gender === 'boy' || p.gender === 'girl') &&
        (p.skin === 'light' || p.skin === 'dark')
      ) {
        return { gender: p.gender, skin: p.skin };
      }
    }
  } catch {
    /* ignore */
  }
  return { gender: 'boy', skin: 'light' };
}

export function saveAvatarChoice(choice: AvatarChoice): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(choice));
  } catch {
    /* ignore */
  }
}

export function avatarTextureKey(gender: AvatarGender, skin: AvatarSkin, frame: AvatarFrame): string {
  return `kid-${gender}-${skin}-${frame}`;
}

// Generate the three frames (idle / two walk strides) for a gender+skin combo.
export function ensureAvatarTextures(
  scene: Phaser.Scene,
  gender: AvatarGender,
  skin: AvatarSkin
): void {
  if (scene.textures.exists(avatarTextureKey(gender, skin, 'idle'))) return;
  drawKid(scene, avatarTextureKey(gender, skin, 'idle'), gender, skin, 0);
  drawKid(scene, avatarTextureKey(gender, skin, 'walk0'), gender, skin, 1);
  drawKid(scene, avatarTextureKey(gender, skin, 'walk1'), gender, skin, -1);
}

function drawKid(
  scene: Phaser.Scene,
  key: string,
  gender: AvatarGender,
  skin: AvatarSkin,
  strideDir: number
): void {
  const w = PLAYER_W;
  const h = PLAYER_H;
  const g = scene.add.graphics({ x: 0, y: 0 });
  const SKIN = SKIN_COLOR[skin];

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
  // Ears
  g.fillCircle(cx - headR + 1, headY + 1, 3);
  g.fillCircle(cx + headR - 1, headY + 1, 3);

  // Hair cluster on top (legacy-style: circles along the top arc, not a wedge).
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
