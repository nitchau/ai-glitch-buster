import { describe, it, expect } from 'vitest';
import type { BankId } from '../../src/types';
import { quizData, pickN, toChoices } from '../../src/quizData';

const BANKS: BankId[] = ['bias', 'bad-habits', 'privacy', 'hallucination'];

describe('quizData banks', () => {
  it.each(BANKS)('%s bank is non-empty and well-formed', (b) => {
    const bank = quizData[b];
    expect(bank.length).toBeGreaterThan(0);
    bank.forEach((q, i) => {
      expect(q.question, b + '[' + i + '].question').toBeTruthy();
      expect(q.options.length).toBe(4);
      expect([0, 1, 2, 3]).toContain(q.correct);
      q.options.forEach((opt, j) => {
        expect(typeof opt === 'string' && opt.length > 0, b + '[' + i + '].option[' + j + ']').toBe(
          true
        );
      });
    });
  });

  it('bias bank is fully ported (>= 50 questions)', () => {
    expect(quizData.bias.length).toBeGreaterThanOrEqual(50);
  });

  it('bad-habits bank is fully ported (>= 50 questions)', () => {
    expect(quizData['bad-habits'].length).toBeGreaterThanOrEqual(50);
  });
});

describe('pickN + toChoices', () => {
  it('pickN(5) returns 5 from a bank', () => {
    expect(pickN('bias', 5).length).toBe(5);
  });
  it('toChoices returns 4 with exactly one correct', () => {
    const q = pickN('bad-habits', 1)[0]!;
    const ch = toChoices(q);
    expect(ch.length).toBe(4);
    expect(ch.filter((c) => c.isCorrect).length).toBe(1);
  });
  it('toChoices preserves option texts', () => {
    const q = pickN('privacy', 1)[0]!;
    const ch = toChoices(q);
    const texts = ch.map((c) => c.text).sort();
    const orig = q.options.slice().sort();
    expect(texts).toEqual(orig);
  });
});
