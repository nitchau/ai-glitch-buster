// GAME/screens/island-intro.js — Filled in during Task 7.
window.GG = window.GG || {};
GG.screens = GG.screens || {};
GG.screens.islandIntro = {
  render: function(rootEl, islandId, onBack) {
    rootEl.innerHTML = '<p style="color:white;padding:80px 20px;">Stub: Island intro for ' + islandId +
                       ' (Task 7 will replace this)</p>' +
                       '<button class="gg-button gg-secondary" id="gg-stub-back">← Back to Map</button>';
    var btn = rootEl.querySelector('#gg-stub-back');
    if (btn) btn.addEventListener('click', onBack);
  }
};
