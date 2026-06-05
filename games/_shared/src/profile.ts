import {
  ISLANDS,
  type GradeBand,
  type IslandId,
  type IslandProgress,
  type Profile,
  type SaveResult,
} from './types';

const STORAGE_KEY = 'gg.profile';

export function blankProgress(): Record<IslandId, IslandProgress> {
  const p = {} as Record<IslandId, IslandProgress>;
  ISLANDS.forEach((id, i) => {
    p[id] = { unlocked: i === 0, stars: 0, cleared: false };
  });
  return p;
}

export function isValidProfile(p: unknown): p is Profile {
  if (!p || typeof p !== 'object') return false;
  const x = p as Record<string, unknown>;
  if (typeof x.name !== 'string' || (x.name as string).trim().length === 0) return false;
  if (x.gradeBand !== 'explorer' && x.gradeBand !== 'guardian') return false;
  if (!x.progress || typeof x.progress !== 'object') return false;
  const prog = x.progress as Record<string, { unlocked?: unknown }>;
  if (!prog['bias-breaker'] || typeof prog['bias-breaker'].unlocked !== 'boolean') return false;
  return true;
}

export function load(): Profile | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  return isValidProfile(parsed) ? parsed : null;
}

export function save(profile: Profile): SaveResult {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    return { ok: true };
  } catch {
    return { ok: false, reason: 'storage-blocked' };
  }
}

export function reset(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function isIslandUnlocked(id: IslandId): boolean {
  const p = load();
  if (!p) return id === 'bias-breaker';
  return !!p.progress[id]?.unlocked;
}

export function newProfile(name: string, gradeBand: GradeBand): Profile {
  return {
    name: String(name).trim().slice(0, 20),
    gradeBand,
    createdAt: new Date().toISOString(),
    progress: blankProgress(),
  };
}

export function markIslandCleared(id: IslandId, stars: number): SaveResult {
  const profile = load();
  if (!profile) return { ok: false, reason: 'no-profile' };
  if (!profile.progress[id]) return { ok: false, reason: 'unknown-island' };
  profile.progress[id].cleared = true;
  const prev = profile.progress[id].stars ?? 0;
  const next = Number.isFinite(stars) ? stars : 1;
  profile.progress[id].stars = Math.max(prev, next);
  const idx = ISLANDS.indexOf(id);
  if (idx >= 0 && idx + 1 < ISLANDS.length) {
    const nextId = ISLANDS[idx + 1];
    if (nextId) {
      const np = profile.progress[nextId];
      if (np) np.unlocked = true;
    }
  }
  return save(profile);
}
