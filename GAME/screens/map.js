// GAME/screens/map.js — Datapolis SVG world map.
window.GG = window.GG || {};
GG.screens = GG.screens || {};

GG.screens.map = (function() {
  var SVG_NS = 'http://www.w3.org/2000/svg';

  // IDs are stable (don't change — they're persisted in saved profiles).
  // Display names line up with the 4 AI-safety pillars used elsewhere in the app:
  //   bias, bad-habits, privacy, hallucination.
  var ISLANDS = [
    { id: 'bias-breaker',   name: 'Bias Breaker',        x: 150, y: 150, icon: '⚖️' },
    { id: 'habit-harbor',   name: 'Bad-Habit Harbor',    x: 650, y: 150, icon: '🌊' },
    { id: 'privacy-vaults', name: 'Privacy Vault',       x: 150, y: 450, icon: '🔐' },
    { id: 'reality-tower',  name: 'Hallucination Tower', x: 650, y: 450, icon: '🗼' },
    { id: 'the-core',       name: 'The Core',            x: 400, y: 300, icon: '💥' }
  ];

  // Curved bezier paths from each corner island to The Core.
  // Control points (cx,cy) push each curve outward so the 4 paths form a flower-petal pattern.
  var PATHS = [
    { from: 'bias-breaker',   to: 'the-core', cx: 200, cy: 290 },
    { from: 'habit-harbor',   to: 'the-core', cx: 600, cy: 290 },
    { from: 'privacy-vaults', to: 'the-core', cx: 200, cy: 310 },
    { from: 'reality-tower',  to: 'the-core', cx: 600, cy: 310 }
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

  function buildDefs() {
    // SVG <defs> — glow filter for paths and pulse for unlocked islands.
    var defs = document.createElementNS(SVG_NS, 'defs');

    // Glow filter — used by paths and unlocked island circles.
    var filter = document.createElementNS(SVG_NS, 'filter');
    filter.setAttribute('id', 'gg-glow');
    filter.setAttribute('x', '-50%');
    filter.setAttribute('y', '-50%');
    filter.setAttribute('width', '200%');
    filter.setAttribute('height', '200%');

    var blur = document.createElementNS(SVG_NS, 'feGaussianBlur');
    blur.setAttribute('stdDeviation', '4');
    blur.setAttribute('result', 'coloredBlur');
    filter.appendChild(blur);

    var merge = document.createElementNS(SVG_NS, 'feMerge');
    var mn1 = document.createElementNS(SVG_NS, 'feMergeNode');
    mn1.setAttribute('in', 'coloredBlur');
    var mn2 = document.createElementNS(SVG_NS, 'feMergeNode');
    mn2.setAttribute('in', 'SourceGraphic');
    merge.appendChild(mn1);
    merge.appendChild(mn2);
    filter.appendChild(merge);

    defs.appendChild(filter);
    return defs;
  }

  function buildIsland(meta, unlocked, onSelect, onLockedClick) {
    // Outer <g> handles positioning via SVG transform attribute — NEVER touched by CSS.
    // Inner <g> handles all CSS effects (hover, wiggle, etc.). This separation
    // prevents CSS transform from clobbering the SVG translate (the wobble bug).
    var positionGroup = document.createElementNS(SVG_NS, 'g');
    positionGroup.setAttribute('transform', 'translate(' + meta.x + ',' + meta.y + ')');

    var fxGroup = document.createElementNS(SVG_NS, 'g');
    fxGroup.setAttribute('class', 'gg-island ' + (unlocked ? 'gg-unlocked' : 'gg-locked'));
    fxGroup.setAttribute('tabindex', '0');
    fxGroup.setAttribute('role', 'button');
    fxGroup.setAttribute('aria-label', meta.name + (unlocked ? ', unlocked. Click to enter.' : ', locked.'));

    var circle = document.createElementNS(SVG_NS, 'circle');
    circle.setAttribute('r', '60');
    circle.setAttribute('class', 'gg-island-circle');
    fxGroup.appendChild(circle);

    var icon = document.createElementNS(SVG_NS, 'text');
    icon.setAttribute('text-anchor', 'middle');
    icon.setAttribute('dominant-baseline', 'central');
    icon.setAttribute('font-size', '38');
    icon.textContent = unlocked ? meta.icon : '🔒';
    fxGroup.appendChild(icon);

    var label = document.createElementNS(SVG_NS, 'text');
    label.setAttribute('text-anchor', 'middle');
    label.setAttribute('y', '90');
    label.setAttribute('class', 'gg-island-label');
    label.textContent = meta.name;
    fxGroup.appendChild(label);

    function handleSelect() {
      if (unlocked) {
        onSelect(meta.id);
      } else {
        fxGroup.classList.remove('gg-wiggle');
        // Force browser to reflow so the animation can be re-triggered
        void fxGroup.getBoundingClientRect();
        fxGroup.classList.add('gg-wiggle');
        onLockedClick(meta.name);
      }
    }

    fxGroup.addEventListener('click', handleSelect);
    fxGroup.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelect();
      }
    });

    positionGroup.appendChild(fxGroup);
    return positionGroup;
  }

  function render(rootEl, profile, isReturning, onIslandSelect) {
    clearChildren(rootEl);

    rootEl.appendChild(buildHeader(profile, isReturning));

    // Island lookup
    var byId = {};
    ISLANDS.forEach(function(i) { byId[i.id] = i; });

    // SVG with defs for glow
    var svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 800 600');
    svg.setAttribute('class', 'gg-map-svg');
    svg.appendChild(buildDefs());

    // Curved bezier paths (drawn beneath islands)
    PATHS.forEach(function(p) {
      var a = byId[p.from], b = byId[p.to];
      var pathEl = document.createElementNS(SVG_NS, 'path');
      var d = 'M ' + a.x + ' ' + a.y +
              ' Q ' + p.cx + ' ' + p.cy +
              ' ' + b.x + ' ' + b.y;
      pathEl.setAttribute('d', d);
      pathEl.setAttribute('class', 'gg-map-path');
      svg.appendChild(pathEl);
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
