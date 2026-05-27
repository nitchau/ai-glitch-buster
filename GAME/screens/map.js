// GAME/screens/map.js — Datapolis SVG world map.
window.GG = window.GG || {};
GG.screens = GG.screens || {};

GG.screens.map = (function() {
  var SVG_NS = 'http://www.w3.org/2000/svg';

  var ISLANDS = [
    { id: 'bias-breaker',   name: 'Bias Breaker',   x: 150, y: 150, icon: '⚖️' },
    { id: 'habit-harbor',   name: 'Habit Harbor',   x: 650, y: 150, icon: '🌊' },
    { id: 'privacy-vaults', name: 'Privacy Vaults', x: 150, y: 450, icon: '🔐' },
    { id: 'reality-tower',  name: 'Reality Tower',  x: 650, y: 450, icon: '🗼' },
    { id: 'the-core',       name: 'The Core',       x: 400, y: 300, icon: '💥' }
  ];

  var PATHS = [
    ['bias-breaker', 'the-core'],
    ['habit-harbor', 'the-core'],
    ['privacy-vaults', 'the-core'],
    ['reality-tower', 'the-core']
  ];

  function clearChildren(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function buildHeader(profile, isReturning) {
    var header = document.createElement('div');
    header.className = 'gg-map-header';

    var h2 = document.createElement('h2');
    var greeting = isReturning ? 'Welcome back, ' : 'Welcome, ';
    h2.textContent = greeting + profile.name + '!';
    header.appendChild(h2);

    var p = document.createElement('p');
    p.textContent = 'Datapolis needs you. Pick an island to begin.';
    header.appendChild(p);

    return header;
  }

  function buildIsland(meta, unlocked, onSelect, onLockedClick) {
    var g = document.createElementNS(SVG_NS, 'g');
    g.setAttribute('class', 'gg-island ' + (unlocked ? 'gg-unlocked' : 'gg-locked'));
    g.setAttribute('transform', 'translate(' + meta.x + ',' + meta.y + ')');
    g.setAttribute('tabindex', '0');
    g.setAttribute('role', 'button');
    g.setAttribute('aria-label', meta.name + (unlocked ? ', unlocked. Click to enter.' : ', locked.'));

    var circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('r', '60');
    circle.setAttribute('class', 'gg-island-circle');
    g.appendChild(circle);

    var icon = document.createElementNS(SVG_NS, 'text');
    icon.setAttribute('text-anchor', 'middle');
    icon.setAttribute('dominant-baseline', 'central');
    icon.setAttribute('font-size', '38');
    icon.textContent = unlocked ? meta.icon : '🔒';
    g.appendChild(icon);

    var label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('y', '90');
    label.setAttribute('class', 'gg-island-label');
    label.textContent = meta.name;
    g.appendChild(label);

    function handleSelect() {
      if (unlocked) {
        onSelect(meta.id);
      } else {
        g.classList.remove('gg-wiggle');
        // Force browser to reflow so the animation can be re-triggered
        void g.getBoundingClientRect();
        g.classList.add('gg-wiggle');
        onLockedClick(meta.name);
      }
    }

    g.addEventListener('click', handleSelect);
    g.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelect();
      }
    });

    return g;
  }

  function render(rootEl, profile, isReturning, onIslandSelect) {
    clearChildren(rootEl);

    rootEl.appendChild(buildHeader(profile, isReturning));

    // Island lookup
    var byId = {};
    ISLANDS.forEach(function(i) { byId[i.id] = i; });

    // SVG
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 800 600');
    svg.setAttribute('class', 'gg-map-svg');

    // Paths first (drawn beneath islands)
    PATHS.forEach(function(p) {
      var a = byId[p[0]], b = byId[p[1]];
      var line = document.createElementNS(SVG_NS, 'line');
      line.setAttribute('x1', a.x); line.setAttribute('y1', a.y);
      line.setAttribute('x2', b.x); line.setAttribute('y2', b.y);
      line.setAttribute('class', 'gg-map-path');
      svg.appendChild(line);
    });

    // Tooltip (one, reused)
    var tooltip = document.createElement('div');
    tooltip.className = 'gg-tooltip';
    tooltip.hidden = true;
    rootEl.appendChild(tooltip);
    var tooltipTimer = null;

    function showTooltip(islandName) {
      tooltip.textContent = 'Clear Bias Breaker first to unlock ' + islandName + '!';
      tooltip.hidden = false;
      if (tooltipTimer) clearTimeout(tooltipTimer);
      tooltipTimer = setTimeout(function() { tooltip.hidden = true; }, 2500);
    }

    // Islands
    ISLANDS.forEach(function(meta) {
      var unlocked = !!(profile.progress[meta.id] && profile.progress[meta.id].unlocked);
      var g = buildIsland(meta, unlocked, onIslandSelect, showTooltip);
      svg.appendChild(g);
    });

    rootEl.appendChild(svg);
  }

  return { render: render };
})();
