import type { Question } from '@gg/shared';
import type { FlyerType } from '../constants';

export type Solid = { x: number; y: number; w: number; h: number };

export type FlyerState = 'live' | 'crashing' | 'gone';

export type Flyer = {
  type: FlyerType;
  travelLeft: number;
  travelRight: number;
  baseY: number;
  x: number;
  y: number;
  w: number;
  h: number;
  phase: number;
  driftSpeed: number;
  vx: number;
  rowIndex: number;
  optionIndex: 0 | 1 | 2 | 3;
  optionText: string;
  isCorrect: boolean;
  color: string;
  state: FlyerState;
  crashStart: number;
  carrying: boolean;
};

export type Section = {
  question: Question;
  solid: Solid;
  flyerType: FlyerType;
  flyers: Flyer[];
  answered: boolean;
};

export type FinalSolid = Solid & { isFinish: true };

export type Door = { x: number; y: number; w: number; h: number; open: boolean };
export type EntryDoor = { x: number; y: number; w: number; h: number };

export type Level = {
  sections: Section[];
  finalSolid: FinalSolid;
  door: Door;
  entryDoor: EntryDoor;
  firstSolidX: number;
  totalWidth: number;
};
