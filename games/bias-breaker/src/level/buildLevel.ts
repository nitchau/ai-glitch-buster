// Port of legacy/GAME/screens/bias-breaker.js:132-212 (the buildLevel function).
// Mechanic-for-mechanic; same RNG semantics (uses Math.random for flyer phase
// and the [0,1,2,3] position shuffle).
//
// `buildFlyers` is extracted so the lava-respawn path (GameScene.resetSection)
// rebuilds a section's flyers through the SAME travelLeft/travelRight math.
// Legacy lines 655-658 warn that duplicating those bounds incorrectly yields
// NaN flyer positions (the v13.2 bug) — sharing one helper removes that risk.

import type { Question } from '@gg/shared';
import {
  CANVAS_W,
  SOLID_W,
  SOLID_Y,
  SOLID_H,
  SECTION_SPACING,
  FLYER_Y_TOP,
  FLYER_Y_STEP,
  FLYER_DRIFT_SPEED,
  FLYER_TYPES,
  ANSWER_COLORS,
  type FlyerType,
} from '../constants';
import type { Flyer, Level, Section, FinalSolid, Solid } from './types';

function shuffle<T>(arr: readonly T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = out[i]!;
    out[i] = out[j]!;
    out[j] = t;
  }
  return out;
}

function flyerWidthFor(type: FlyerType): number {
  switch (type) {
    case 'cloud': return 150;
    case 'bird': return 130;
    case 'kite': return 110;
    case 'helicopter': return 150;
    case 'quadcopter': return 130;
  }
}

function flyerHeightFor(type: FlyerType): number {
  switch (type) {
    case 'cloud': return 58;
    case 'bird': return 50;
    case 'kite': return 60;
    case 'helicopter': return 50;
    case 'quadcopter': return 40;
  }
}

/**
 * Build the 4 answer flyers for one section. Shared by `buildLevel` (initial)
 * and the lava-respawn reset so the travel bounds always match. Mirrors the
 * inner loop of legacy buildLevel + resetSection (lines 660-692).
 */
export function buildFlyers(solid: Solid, flyerType: FlyerType, question: Question): Flyer[] {
  const travelLeft = solid.x + SOLID_W + 30;
  const travelRight = solid.x + SECTION_SPACING - 30;
  const positions = shuffle([0, 1, 2, 3] as const);
  const flyers: Flyer[] = [];
  for (let p = 0; p < 4; p++) {
    const optionIdx = positions[p]!;
    const fw = flyerWidthFor(flyerType);
    const fh = flyerHeightFor(flyerType);
    flyers.push({
      type: flyerType,
      travelLeft,
      travelRight: travelRight - fw,
      baseY: FLYER_Y_TOP + p * FLYER_Y_STEP,
      x: travelLeft + p * 30,
      y: FLYER_Y_TOP + p * FLYER_Y_STEP,
      w: fw,
      h: fh,
      phase: Math.random() * Math.PI * 2,
      driftSpeed: FLYER_DRIFT_SPEED * (0.7 + Math.random() * 0.7),
      vx: 0,
      rowIndex: p,
      optionIndex: optionIdx,
      optionText: question.options[optionIdx]!,
      isCorrect: optionIdx === question.correct,
      color: ANSWER_COLORS[p]!,
      state: 'live',
      crashStart: 0,
      carrying: false,
    });
  }
  return flyers;
}

export function buildLevel(questions: Question[]): Level {
  const sections: Section[] = [];
  // Center the first visible section in the canvas.
  let x = Math.max(60, Math.round((CANVAS_W - SOLID_W - SECTION_SPACING) / 2));
  const firstSolidX = x;

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i]!;
    const solid: Solid = { x, y: SOLID_Y, w: SOLID_W, h: SOLID_H };
    const flyerType: FlyerType = FLYER_TYPES[i % FLYER_TYPES.length]!;
    const flyers = buildFlyers(solid, flyerType, question);

    sections.push({ question, solid, flyerType, flyers, answered: false });
    x += SECTION_SPACING;
  }

  const finalSolid: FinalSolid = {
    x,
    y: SOLID_Y,
    w: SOLID_W * 1.5,
    h: SOLID_H,
    isFinish: true,
  };
  const door = {
    x: x + SOLID_W * 1.5 - 100,
    y: SOLID_Y - 150,
    w: 90,
    h: 150,
    open: false,
  };
  const entryDoor = {
    x: firstSolidX + 10,
    y: SOLID_Y - 130,
    w: 90,
    h: 130,
  };

  return {
    sections,
    finalSolid,
    door,
    entryDoor,
    firstSolidX,
    totalWidth: x + SOLID_W * 1.5 + 200,
  };
}
