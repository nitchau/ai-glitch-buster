import { describe, it, expect, beforeEach } from 'vitest';
import {
  newProfile,
  save,
  load,
  reset,
  isIslandUnlocked,
  markIslandCleared,
} from '../../src/profile';

beforeEach(() => reset());

describe('profile SDK', () => {
  it('load returns null on fresh storage', () => {
    expect(load()).toBeNull();
  });

  it('save then load round-trips a profile', () => {
    const p = newProfile('Mishika', 'guardian');
    expect(save(p)).toEqual({ ok: true });
    const got = load();
    expect(got?.name).toBe('Mishika');
    expect(got?.gradeBand).toBe('guardian');
    expect(got?.progress['bias-breaker']?.unlocked).toBe(true);
  });

  it('load returns null on corrupted JSON', () => {
    localStorage.setItem('gg.profile', 'not-valid-json-{');
    expect(load()).toBeNull();
  });

  it('isIslandUnlocked returns true for bias-breaker on fresh profile', () => {
    save(newProfile('M', 'guardian'));
    expect(isIslandUnlocked('bias-breaker')).toBe(true);
  });

  it('isIslandUnlocked returns false for habit-harbor on fresh profile', () => {
    save(newProfile('M', 'guardian'));
    expect(isIslandUnlocked('habit-harbor')).toBe(false);
  });

  it('markIslandCleared sets cleared plus stars plus unlocks next', () => {
    save(newProfile('M', 'guardian'));
    const r = markIslandCleared('bias-breaker', 2);
    expect(r).toEqual({ ok: true });
    const p = load();
    expect(p?.progress['bias-breaker']?.cleared).toBe(true);
    expect(p?.progress['bias-breaker']?.stars).toBe(2);
    expect(p?.progress['habit-harbor']?.unlocked).toBe(true);
  });

  it('markIslandCleared keeps best-of stars', () => {
    save(newProfile('M', 'guardian'));
    markIslandCleared('bias-breaker', 2);
    markIslandCleared('bias-breaker', 3);
    markIslandCleared('bias-breaker', 1);
    expect(load()?.progress['bias-breaker']?.stars).toBe(3);
  });

  it('markIslandCleared on the-core does NOT crash', () => {
    const p = newProfile('M', 'guardian');
    p.progress['the-core'].unlocked = true;
    save(p);
    const r = markIslandCleared('the-core', 3);
    expect(r.ok).toBe(true);
    expect(load()?.progress['the-core']?.cleared).toBe(true);
  });
});
