// GAME/state.js — Player profile + progress + localStorage persistence.
window.GG = window.GG || {};

GG.state = (function() {
  var STORAGE_KEY = 'gg.profile';
  var ISLANDS = ['bias-breaker', 'habit-harbor', 'privacy-vaults', 'reality-tower', 'the-core'];

  function blankProgress() {
    var p = {};
    ISLANDS.forEach(function(id, i) {
      p[id] = { unlocked: i === 0, stars: 0, cleared: false };
    });
    return p;
  }

  function isValidProfile(p) {
    if (!p || typeof p !== 'object') return false;
    if (typeof p.name !== 'string' || p.name.trim().length === 0) return false;
    if (p.gradeBand !== 'explorer' && p.gradeBand !== 'guardian') return false;
    if (!p.progress || typeof p.progress !== 'object') return false;
    if (!p.progress['bias-breaker'] || typeof p.progress['bias-breaker'].unlocked !== 'boolean') return false;
    return true;
  }

  function load() {
    var raw;
    try { raw = localStorage.getItem(STORAGE_KEY); }
    catch (e) { return null; }
    if (!raw) return null;
    var parsed;
    try { parsed = JSON.parse(raw); }
    catch (e) { return null; }
    return isValidProfile(parsed) ? parsed : null;
  }

  function save(profile) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      return { ok: true };
    } catch (e) {
      return { ok: false, reason: 'storage-blocked' };
    }
  }

  function reset() {
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
  }

  function isIslandUnlocked(islandId) {
    var p = load();
    if (!p) return islandId === 'bias-breaker';
    if (!p.progress[islandId]) return false;
    return !!p.progress[islandId].unlocked;
  }

  function newProfile(name, gradeBand) {
    return {
      name: String(name).trim().slice(0, 20),
      gradeBand: gradeBand,
      createdAt: new Date().toISOString(),
      progress: blankProgress()
    };
  }

  function markIslandCleared(islandId, stars) {
    var profile = load();
    if (!profile) return { ok: false, reason: 'no-profile' };
    if (!profile.progress[islandId]) return { ok: false, reason: 'unknown-island' };

    profile.progress[islandId].cleared = true;
    var prevStars = profile.progress[islandId].stars || 0;
    var newStars = (typeof stars === 'number' && isFinite(stars)) ? stars : 1;
    profile.progress[islandId].stars = Math.max(prevStars, newStars);

    var order = ['bias-breaker', 'habit-harbor', 'privacy-vaults', 'reality-tower', 'the-core'];
    var idx = order.indexOf(islandId);
    if (idx >= 0 && idx + 1 < order.length) {
      var next = order[idx + 1];
      if (profile.progress[next]) profile.progress[next].unlocked = true;
    }
    return save(profile);
  }

  return {
    load: load,
    save: save,
    reset: reset,
    isIslandUnlocked: isIslandUnlocked,
    newProfile: newProfile,
    markIslandCleared: markIslandCleared
  };
})();
