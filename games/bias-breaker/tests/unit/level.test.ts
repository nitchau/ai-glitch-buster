import { describe, it, expect } from 'vitest';
import { buildLevel } from '../../src/level/buildLevel';
import { quizDataBias } from '@gg/shared';

describe('buildLevel', () => {
  it('builds 5 sections of 4 flyers from 5 questions', () => {
    const lv = buildLevel(quizDataBias.slice(0, 5));
    expect(lv.sections.length).toBe(5);
    lv.sections.forEach((s) => {
      expect(s.flyers.length).toBe(4);
      // travelLeft < travelRight (the v13.2 NaN-free bound — drift needs a range)
      s.flyers.forEach((f) => expect(f.travelLeft).toBeLessThan(f.travelRight));
    });
  });

  it('gives each section exactly one correct flyer', () => {
    const lv = buildLevel(quizDataBias.slice(0, 5));
    lv.sections.forEach((s) => {
      expect(s.flyers.filter((f) => f.isCorrect).length).toBe(1);
    });
  });

  it('assigns the per-stage flyer types in order (cloud → bird → kite → heli → quad)', () => {
    const lv = buildLevel(quizDataBias.slice(0, 5));
    expect(lv.sections.map((s) => s.flyerType)).toEqual([
      'cloud',
      'bird',
      'kite',
      'helicopter',
      'quadcopter',
    ]);
  });

  it('lays sections left-to-right with a final solid + door past the last', () => {
    const lv = buildLevel(quizDataBias.slice(0, 5));
    for (let i = 1; i < lv.sections.length; i++) {
      expect(lv.sections[i]!.solid.x).toBeGreaterThan(lv.sections[i - 1]!.solid.x);
    }
    expect(lv.finalSolid.x).toBeGreaterThan(lv.sections[4]!.solid.x);
    expect(lv.door.x).toBeGreaterThan(lv.finalSolid.x);
    expect(lv.totalWidth).toBeGreaterThan(lv.door.x);
  });
});
