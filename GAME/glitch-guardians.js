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
  var container = document.querySelector('.container');
  var ggRoot = document.getElementById('gg-root');
  if (container) container.style.display = '';
  if (ggRoot) {
    ggRoot.hidden = true;
    clearChildren(ggRoot);
  }
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

// Wire launcher button on page load
document.addEventListener('DOMContentLoaded', function() {
  var btn = document.getElementById('gg-launch-button');
  if (btn) btn.addEventListener('click', GG.start);
});
