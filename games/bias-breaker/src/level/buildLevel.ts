// Port of legacy/GAME/screens/bias-breaker.js:132-212 (the buildLevel function).
// Mechanic-for-mechanic; same RNG semantics (uses Math.random for flyer phase
// and the [0,1,2,3] position shuffle).

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
import type { Flyer, Level, Section, FinalSolid } from './types';

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

export function buildLevel(questions: Question[]): Level {
  const sections: Section[] = [];
  // Center the first visible section in the canvas.
  let x = Math.max(60, Math.round((CANVAS_W - SOLID_W - SECTION_SPACING) / 2));
  const firstSolidX = x;

  for (let i = 0; i < questions.length; i++) {
    const question = questions[i]!;
    const solid = { x, y: SOLID_Y, w: SOLID_W, h: SOLID_H };
    const flyerType: FlyerType = FLYER_TYPES[i % FLYER_TYPES.length]!;

    const nextSolidX = x + SECTION_SPACING;
    const travelLeft = x + SOLID_W + 30;
    const travelRight = nextSolidX - 30;

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
