// GAME/screens/map.js — Filled in during Task 6.
window.GG = window.GG || {};
GG.screens = GG.screens || {};
GG.screens.map = {
  render: function(rootEl, profile, isReturning, onIslandSelect) {
    rootEl.innerHTML = '<p style="color:white;padding:80px 20px;">Stub: Map screen for ' +
                       (profile && profile.name ? profile.name : '???') + ' (Task 6 will replace this)</p>' +
                       '<button class="gg-button gg-primary" id="gg-stub-island">Pretend-click Bias Breaker</button>';
    var btn = rootEl.querySelector('#gg-stub-island');
    if (btn) btn.addEventListener('click', function() { onIslandSelect('bias-breaker'); });
  }
};
