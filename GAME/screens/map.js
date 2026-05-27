// GAME/screens/map.js — Datapolis SVG world map.
window.GG = window.GG || {};
GG.screens = GG.screens || {};

GG.screens.map = (function() {
  var SVG_NS = 'http://www.w3.org/2000/svg';

  // IDs are stable (don't change — they're persisted in saved profiles).
  // Display names align with the 4 AI-safety pillars used elsewhere in the app:
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

  // ----- helpers --------------------------------------------------------

  function clearChildren(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  // Build an SVG element with attributes and children. Keeps the kid/scene
  // construction below readable instead of one giant chain of setAttribute.
  function svgEl(tag, attrs, children) {
    var el = document.createElementNS(SVG_NS, tag);
    if (attrs) {
      for (var k in attrs) {
        if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
        if (k === 'text') el.textContent = attrs[k];
        else el.setAttribute(k, attrs[k]);
      }
    }
    if (children) {
      for (var i = 0; i < children.length; i++) {
        if (children[i]) el.appendChild(children[i]);
      }
    }
    return el;
  }

  // ----- header ---------------------------------------------------------

  function buildHeader(profile, isReturning) {
    var header = document.createElement('div');
    header.className = 'gg-map-header';

    var h2 = document.createElement('h2');
    var greeting = isReturning ? 'Welcome back, ' : 'Welcome, ';
    h2.textContent = greeting + profile.name + '! 👋';
    header.appendChild(h2);

    var p = document.createElement('p');
    p.textContent = 'Datapolis needs you. The citizens are confused — pick an island to start fixing things!';
    header.appendChild(p);

    return header;
  }

  // ----- background scene (confused kids + particles) -------------------

  // Build one cartoon kid silhouette with a thought bubble showing AI confusion.
  // Width 100, height 140 (viewBox). Hand-drawn paths, no external images.
  function buildKid(hairColor, shirtColor, bubbleText) {
    return svgEl('svg', { viewBox: '0 0 100 140', class: 'gg-kid-svg' }, [
      // Thought bubble (drawn behind head so head sits on top visually)
      svgEl('g', { class: 'gg-thought' }, [
        svgEl('circle',  { cx: 78, cy: 18, r: 14, fill: 'white', opacity: 0.92 }),
        svgEl('circle',  { cx: 64, cy: 30, r: 4,  fill: 'white', opacity: 0.92 }),
        svgEl('circle',  { cx: 58, cy: 38, r: 2,  fill: 'white', opacity: 0.92 }),
        svgEl('text', {
          x: 78, y: 24, 'text-anchor': 'middle',
          'font-size': 16, 'font-weight': 'bold', fill: '#5b2c87',
          text: bubbleText
        })
      ]),
      // Head
      svgEl('circle', { cx: 40, cy: 48, r: 22, fill: '#fce8b8' }),
      // Hair (sweeps over forehead)
      svgEl('path', {
        d: 'M19 46 Q19 26 40 26 Q61 26 61 46 Q56 36 40 36 Q24 36 19 46 Z',
        fill: hairColor
      }),
      // Worried eyes (small horizontal squints)
      svgEl('path', { d: 'M30 48 L36 48', stroke: '#333', 'stroke-width': 2.5, 'stroke-linecap': 'round' }),
      svgEl('path', { d: 'M44 48 L50 48', stroke: '#333', 'stroke-width': 2.5, 'stroke-linecap': 'round' }),
      // Frown
      svgEl('path', {
        d: 'M33 60 Q40 56 47 60',
        stroke: '#333', 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round'
      }),
      // Body / shirt
      svgEl('path', {
        d: 'M22 72 Q22 67 28 67 L52 67 Q58 67 58 72 L58 130 L22 130 Z',
        fill: shirtColor
      }),
      // Arms going up (head-scratching pose)
      svgEl('path', {
        d: 'M22 72 Q12 60 22 50',
        stroke: '#fce8b8', 'stroke-width': 7, fill: 'none', 'stroke-linecap': 'round'
      }),
      svgEl('path', {
        d: 'M58 72 Q68 60 58 50',
        stroke: '#fce8b8', 'stroke-width': 7, fill: 'none', 'stroke-linecap': 'round'
      })
    ]);
  }

  function buildScene() {
    var scene = document.createElement('div');
    scene.className = 'gg-scene';

    // 4 confused kids — one per corner. Different hair + shirt + bubble for variety.
    var kids = [
      { corner: 'tl', hair: '#5a3a1a', shirt: '#5b9bd5', mark: '?' },
      { corner: 'tr', hair: '#222',    shirt: '#f5576c', mark: '?!' },
      { corner: 'bl', hair: '#cd853f', shirt: '#43e97b', mark: '…' },
      { corner: 'br', hair: '#111',    shirt: '#ffc857', mark: 'AI?' }
    ];

    kids.forEach(function(k) {
      var holder = document.createElement('div');
      holder.className = 'gg-citizen gg-citizen-' + k.corner;
      holder.appendChild(buildKid(k.hair, k.shirt, k.mark));
      scene.appendChild(holder);
    });

    // 12 floating data particles. Spread across the width with cycling colors
    // and staggered animation delays for a "swarm" effect.
    for (var i = 0; i < 12; i++) {
      var p = document.createElement('span');
      p.className = 'gg-particle gg-particle-' + (i % 4);
      // Spread horizontally; CSS provides the rising animation
      p.style.left = (4 + (i * 8)) + '%';
      p.style.animationDelay = (-i * 1.3) + 's';
      scene.appendChild(p);
    }

    return scene;
  }

  // ----- SVG defs (glow filter) ----------------------------------------

  function buildDefs() {
    var defs = svgEl('defs', null, [
      svgEl('filter', { id: 'gg-glow', x: '-50%', y: '-50%', width: '200%', height: '200%' }, [
        svgEl('feGaussianBlur', { stdDeviation: 4, result: 'coloredBlur' }),
        svgEl('feMerge', null, [
          svgEl('feMergeNode', { in: 'coloredBlur' }),
          svgEl('feMergeNode', { in: 'SourceGraphic' })
        ])
      ])
    ]);
    return defs;
  }

  // ----- island construction -------------------------------------------

  function buildIsland(meta, index, unlocked, onSelect, onLockedClick) {
    // Outer <g> handles positioning via SVG transform attribute — NEVER touched by CSS.
    // Inner <g> handles all CSS effects (hover, wiggle, etc.). This separation
    // prevents CSS transform from clobbering the SVG translate (the wobble bug).
    var positionGroup = svgEl('g', { transform: 'translate(' + meta.x + ',' + meta.y + ')' });

    var fxGroup = svgEl('g', {
      'class': 'gg-island gg-island-' + index + ' ' + (unlocked ? 'gg-unlocked' : 'gg-locked'),
      tabindex: 0,
      role: 'button',
      'aria-label': meta.name + (unlocked ? ', unlocked. Click to enter.' : ', locked.')
    });

    fxGroup.appendChild(svgEl('circle', { r: 60, 'class': 'gg-island-circle' }));

    var iconText = svgEl('text', {
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
      'font-size': 38,
      text: unlocked ? meta.icon : '🔒'
    });
    fxGroup.appendChild(iconText);

    var label = svgEl('text', {
      'text-anchor': 'middle',
      y: 90,
      'class': 'gg-island-label',
      text: meta.name
    });
    fxGroup.appendChild(label);

    function handleSelect() {
      if (unlocked) {
        onSelect(meta.id);
      } else {
        fxGroup.classList.remove('gg-wiggle');
        // Force browser reflow so the animation can re-trigger
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

  // ----- main render ---------------------------------------------------

  function render(rootEl, profile, isReturning, onIslandSelect) {
    clearChildren(rootEl);

    // 1) Background scene FIRST — sits at z-index 0, behind everything else.
    rootEl.appendChild(buildScene());

    // 2) Header (fades up via CSS)
    rootEl.appendChild(buildHeader(profile, isReturning));

    // Island lookup
    var byId = {};
    ISLANDS.forEach(function(i) { byId[i.id] = i; });

    // 3) Main map SVG (above the scene, below the tooltip)
    var svg = svgEl('svg', { viewBox: '0 0 800 600', 'class': 'gg-map-svg' });
    svg.appendChild(buildDefs());

    // Curved bezier paths (drawn beneath islands)
    PATHS.forEach(function(p) {
      var a = byId[p.from], b = byId[p.to];
      svg.appendChild(svgEl('path', {
        d: 'M ' + a.x + ' ' + a.y + ' Q ' + p.cx + ' ' + p.cy + ' ' + b.x + ' ' + b.y,
        'class': 'gg-map-path'
      }));
    });

    // Tooltip (one, reused) — sits over the SVG
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
    ISLANDS.forEach(function(meta, index) {
      var unlocked = !!(profile.progress[meta.id] && profile.progress[meta.id].unlocked);
      svg.appendChild(buildIsland(meta, index, unlocked, onIslandSelect, showTooltip));
    });

    rootEl.appendChild(svg);
  }

  return { render: render };
})();
