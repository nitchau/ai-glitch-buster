export type Question = {
  question: string;
  options: readonly [string, string, string, string];
  correct: 0 | 1 | 2 | 3;
};

export type BankId = 'bias' | 'bad-habits' | 'privacy' | 'hallucination';
export type IslandId = 'bias-breaker' | 'habit-harbor' | 'privacy-vaults' | 'reality-tower' | 'the-core';
export type GradeBand = 'explorer' | 'guardian';

export type IslandProgress = { unlocked: boolean; cleared: boolean; stars: number };

export type Profile = {
  name: string;
  gradeBand: GradeBand;
  createdAt: string; // ISO 8601
  progress: Record<IslandId, IslandProgress>;
};

export type SaveResult =
  | { ok: true }
  | { ok: false; reason: 'storage-blocked' | 'no-profile' | 'unknown-island' };

export const ISLANDS: readonly IslandId[] = [
  'bias-breaker',
  'habit-harbor',
  'privacy-vaults',
  'reality-tower',
  'the-core',
] as const;
