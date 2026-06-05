// GAME/glitch-guardians.js — Entry point + screen router.
window.GG = window.GG || {};

// --- Public API ---
GG.start = function() {
  var container = document.querySelector('.container');
  var ggRoot = document.getElementById('gg-root');
  if (!container || !ggRoot) {
    console.warn('Glitch Guardians: missing .container or #gg-root');
    return;
  }
  container.style.display = 'none';
  ggRoot.hidden = false;
  if (!history.state || !history.state.ggOpen) {
    history.pushState({ ggOpen: true }, '', '#game');
  }
  routeFromState();
};

GG.exit = function() {
  // Synchronously hide the game UI.
  doExit();
  // If we're at #game, clean the hash from the URL without firing popstate.
  // (history.back() would be async and could race with subsequent clicks.)
  if (history.state && history.state.ggOpen) {
    history.replaceState({}, '', location.pathname + location.search);
  }
};

// --- Internal ---
function clearChildren(el) {
  // Safer than innerHTML='' — explicit DOM clear, no parser involvement.
  while (el.firstChild) el.removeChild(el.firstChild);
}

function doExit() {
  // If a screen has registered a cleanup callback (e.g. bias-breaker's level),
  // run it FIRST so it can release rAF, listeners, level-mode CSS class, and
  // any persisted flags before the gg-root is hidden.
  if (GG._activeCleanup) {
    try { GG._activeCleanup(); } catch (e) {}
    GG._activeCleanup = null;
  }

  var container = document.querySelector('.container');
  var ggRoot = document.getElementById('gg-root');
  if (container) container.style.display = '';
  if (ggRoot) {
    ggRoot.hidden = true;
    // Defensive: even if no _activeCleanup ran, scrub the active-level CSS
    // class so a later Play-button click doesn't inherit dark/flex layout.
    ggRoot.classList.remove('gg-bb-active');
    ggRoot.classList.remove('gg-hh-active');
    clearChildren(ggRoot);
  }
  // Clear any persisted "in level" flag so the next page load doesn't auto-resume.
  try { localStorage.removeItem('gg.activeIsland'); } catch (e) {}
}

function routeFromState() {
  var profile = GG.state.load();
  var root = document.getElementById('gg-root');
  clearChildren(root);

  // Persistent Back to App button
  var backBtn = document.createElement('button');
  backBtn.className = 'gg-back-to-app';
  backBtn.type = 'button';
  backBtn.textContent = '🏠 Back to App';
  backBtn.addEventListener('click', GG.exit);
  root.appendChild(backBtn);

  // Screen container
  var screenEl = document.createElement('div');
  screenEl.className = 'gg-screen';
  root.appendChild(screenEl);

  if (!profile) {
    GG.screens.onboarding.render(screenEl, function(newProfile) {
      var r = GG.state.save(newProfile);
      if (!r.ok) showSaveBanner(root);
      goToMap(screenEl, newProfile, false);
    });
  } else {
    goToMap(screenEl, profile, true);
  }
}

function goToMap(screenEl, profile, isReturning) {
  GG.screens.map.render(screenEl, profile, isReturning, function(islandId) {
    goToIslandIntro(screenEl, profile, islandId);
  });
}

function goToIslandIntro(screenEl, profile, islandId) {
  // Phase 2: Bias Breaker has real gameplay. Other islands show Coming Soon intro.
  if (islandId === 'bias-breaker' &&
      profile.progress['bias-breaker'] &&
      profile.progress['bias-breaker'].unlocked &&
      GG.screens.biasBreaker) {
    GG.screens.biasBreaker.render(screenEl, profile, function(result) {
      if (result && result.cleared) {
        var saveResult = GG.state.markIslandCleared('bias-breaker', result.stars);
        if (!saveResult.ok) {
          showSaveBanner(document.getElementById('gg-root'));
        }
      }
      var freshProfile = GG.state.load() || profile;
      goToMap(screenEl, freshProfile, true);
    });
    return;
  }

  // Phase 3 (Bad-Habit Harbor): top-down maze gameplay. Mirrors the
  // bias-breaker branch above.
  if (islandId === 'habit-harbor' &&
      profile.progress['habit-harbor'] &&
      profile.progress['habit-harbor'].unlocked &&
      GG.screens.habitHarbor) {
    GG.screens.habitHarbor.render(screenEl, profile, function(result) {
      if (result && result.cleared) {
        var saveResult = GG.state.markIslandCleared('habit-harbor', result.stars);
        if (!saveResult.ok) {
          showSaveBanner(document.getElementById('gg-root'));
        }
      }
      var freshProfile = GG.state.load() || profile;
      goToMap(screenEl, freshProfile, true);
    });
    return;
  }

  GG.screens.islandIntro.render(screenEl, islandId, function() {
    goToMap(screenEl, profile, true);
  });
}

function showSaveBanner(root) {
  if (root.querySelector('.gg-warning-banner')) return; // already shown
  var banner = document.createElement('div');
  banner.className = 'gg-warning-banner';
  banner.textContent = '⚠️ Progress won\'t save (browser storage blocked)';
  // insert after the back-to-app button
  var backBtn = root.querySelector('.gg-back-to-app');
  if (backBtn && backBtn.nextSibling) {
    root.insertBefore(banner, backBtn.nextSibling);
  } else {
    root.appendChild(banner);
  }
}

// Browser back button: if we were in #game and got popped, clean up.
window.addEventListener('popstate', function() {
  var ggRoot = document.getElementById('gg-root');
  if (ggRoot && !ggRoot.hidden) {
    doExit();
  }
});

// Wire launcher button on page load + auto-resume in-game state
document.addEventListener('DOMContentLoaded', function() {
  var btn = document.getElementById('gg-launch-button');
  if (btn) btn.addEventListener('click', GG.start);

  // If the player refreshed the browser while inside an island level,
  // jump them straight back into that level instead of starting from the
  // main app. The active-island flag is set in screens/bias-breaker.js.
  var activeIsland = null;
  try { activeIsland = localStorage.getItem('gg.activeIsland'); } catch (e) {}
  if (!activeIsland) return;
  var profile = GG.state.load();
  if (!profile || !profile.progress[activeIsland] || !profile.progress[activeIsland].unlocked) return;

  // Defer until the rest of the document is fully wired (avatars, etc.)
  setTimeout(function() {
    GG.start();
    setTimeout(function() {
      var screenEl = document.querySelector('#gg-root .gg-screen');
      if (!screenEl) return;
      var fresh = GG.state.load() || profile;
      goToIslandIntro(screenEl, fresh, activeIsland);
    }, 60);
  }, 60);
});
