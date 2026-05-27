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

  // Hair stylings — each returns an SVG <g> of paths/circles that sit on the head.
  function buildHair(style, color) {
    if (style === 'short') {
      return svgEl('g', null, [
        svgEl('path', { d: 'M30 56 Q30 36 50 36 Q70 36 70 56 Q66 46 50 46 Q34 46 30 56 Z', fill: color }),
        // small spike tufts
        svgEl('path', { d: 'M36 38 Q34 30 40 32', stroke: color, 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' }),
        svgEl('path', { d: 'M55 36 Q58 30 62 34', stroke: color, 'stroke-width': 3, fill: 'none', 'stroke-linecap': 'round' })
      ]);
    }
    if (style === 'long') {
      return svgEl('g', null, [
        // hair flows down past the head, framing the face
        svgEl('path', {
          d: 'M28 56 Q26 32 50 32 Q74 32 72 56 L74 86 Q66 76 58 78 L42 78 Q34 76 26 86 Z',
          fill: color
        })
      ]);
    }
    if (style === 'curly') {
      // cluster of small puffs for curly hair
      return svgEl('g', null, [
        svgEl('circle', { cx: 34, cy: 44, r: 7, fill: color }),
        svgEl('circle', { cx: 44, cy: 38, r: 8, fill: color }),
        svgEl('circle', { cx: 56, cy: 38, r: 8, fill: color }),
        svgEl('circle', { cx: 66, cy: 44, r: 7, fill: color }),
        svgEl('circle', { cx: 30, cy: 54, r: 5, fill: color }),
        svgEl('circle', { cx: 70, cy: 54, r: 5, fill: color })
      ]);
    }
    // 'buzz' (default fallback)
    return svgEl('g', null, [
      svgEl('path', { d: 'M32 48 Q32 40 50 40 Q68 40 68 48 L68 50 L32 50 Z', fill: color })
    ]);
  }

  // Build one kid with full anatomy. opts drives all colors and the pose
  // (via hand positions); same function makes 4 visually distinct characters.
  function buildKid(opts) {
    // Shoulder anchor points (fixed across all kids). Hand positions vary per pose.
    var SH_L = { x: 30, y: 95 };   // left shoulder
    var SH_R = { x: 70, y: 95 };   // right shoulder
    // Hip + foot anchors are fixed too — standing still, posing with arms.
    var HIP_L = { x: 40, y: 142 };
    var HIP_R = { x: 60, y: 142 };
    var FOOT_L = { x: 38, y: 178 };
    var FOOT_R = { x: 62, y: 178 };

    // Smooth curved arm via quadratic bezier: shoulder → midpoint (slightly outward) → hand
    function armPath(shoulder, hand, bulgeX) {
      var midX = (shoulder.x + hand.x) / 2 + bulgeX;
      var midY = (shoulder.y + hand.y) / 2;
      return 'M ' + shoulder.x + ' ' + shoulder.y +
             ' Q ' + midX + ' ' + midY +
             ' ' + hand.x + ' ' + hand.y;
    }

    return svgEl('svg', { viewBox: '0 0 100 200', 'class': 'gg-kid-svg' }, [
      // Thought bubble (sits up & to the right of the head; pulses on its own)
      svgEl('g', { 'class': 'gg-thought' }, [
        svgEl('circle', { cx: 82, cy: 24, r: 15, fill: 'white', opacity: 0.92 }),
        svgEl('circle', { cx: 68, cy: 36, r: 4.5, fill: 'white', opacity: 0.92 }),
        svgEl('circle', { cx: 62, cy: 44, r: 2.5, fill: 'white', opacity: 0.92 }),
        svgEl('text', {
          x: 82, y: 30, 'text-anchor': 'middle',
          'font-size': 16, 'font-weight': 'bold', fill: '#5b2c87',
          text: opts.bubbleText
        })
      ]),

      // ----- LEGS (drawn first so torso overlaps the top) -----
      svgEl('path', {
        d: 'M ' + HIP_L.x + ' ' + HIP_L.y + ' L ' + FOOT_L.x + ' ' + FOOT_L.y,
        stroke: opts.pantsColor, 'stroke-width': 11, 'stroke-linecap': 'round'
      }),
      svgEl('path', {
        d: 'M ' + HIP_R.x + ' ' + HIP_R.y + ' L ' + FOOT_R.x + ' ' + FOOT_R.y,
        stroke: opts.pantsColor, 'stroke-width': 11, 'stroke-linecap': 'round'
      }),

      // ----- SHOES (ellipses at feet) -----
      svgEl('ellipse', { cx: FOOT_L.x + 1, cy: FOOT_L.y + 6, rx: 10, ry: 5, fill: opts.shoeColor }),
      svgEl('ellipse', { cx: FOOT_R.x - 1, cy: FOOT_R.y + 6, rx: 10, ry: 5, fill: opts.shoeColor }),

      // ----- TORSO (shirt) -----
      svgEl('path', {
        d: 'M 26 94 Q 26 88 32 88 L 68 88 Q 74 88 74 94 L 74 144 L 26 144 Z',
        fill: opts.shirtColor
      }),
      // Shirt collar — small V neckline
      svgEl('path', {
        d: 'M 44 88 L 50 96 L 56 88',
        stroke: opts.skinTone, 'stroke-width': 2, fill: 'none'
      }),

      // ----- ARMS (curved) + HANDS (circles) -----
      svgEl('path', {
        d: armPath(SH_L, opts.leftHand, opts.leftHandBulge || -8),
        stroke: opts.skinTone, 'stroke-width': 8, fill: 'none', 'stroke-linecap': 'round'
      }),
      svgEl('path', {
        d: armPath(SH_R, opts.rightHand, opts.rightHandBulge || 8),
        stroke: opts.skinTone, 'stroke-width': 8, fill: 'none', 'stroke-linecap': 'round'
      }),
      svgEl('circle', { cx: opts.leftHand.x,  cy: opts.leftHand.y,  r: 6.5, fill: opts.skinTone }),
      svgEl('circle', { cx: opts.rightHand.x, cy: opts.rightHand.y, r: 6.5, fill: opts.skinTone }),

      // ----- NECK -----
      svgEl('rect', { x: 44, y: 78, width: 12, height: 14, fill: opts.skinTone }),

      // ----- HEAD (drawn last so it sits on top of arms if they reach up) -----
      svgEl('circle', { cx: 50, cy: 60, r: 20, fill: opts.skinTone }),

      // Hair (varies by style)
      buildHair(opts.hairStyle, opts.hairColor),

      // Ears (small ovals on either side of head)
      svgEl('ellipse', { cx: 30, cy: 60, rx: 3, ry: 5, fill: opts.skinTone }),
      svgEl('ellipse', { cx: 70, cy: 60, rx: 3, ry: 5, fill: opts.skinTone }),

      // Eyebrows (slightly tilted worried)
      svgEl('path', { d: 'M40 54 L46 56', stroke: opts.hairColor, 'stroke-width': 2, 'stroke-linecap': 'round' }),
      svgEl('path', { d: 'M54 56 L60 54', stroke: opts.hairColor, 'stroke-width': 2, 'stroke-linecap': 'round' }),

      // Eyes — small squints (worried look)
      svgEl('path', { d: 'M40 61 L46 61', stroke: '#222', 'stroke-width': 2.5, 'stroke-linecap': 'round' }),
      svgEl('path', { d: 'M54 61 L60 61', stroke: '#222', 'stroke-width': 2.5, 'stroke-linecap': 'round' }),

      // Nose (tiny curve)
      svgEl('path', { d: 'M50 64 Q52 68 50 70', stroke: '#b88a5a', 'stroke-width': 1.5, fill: 'none' }),

      // Mouth — small confused frown
      svgEl('path', {
        d: 'M44 74 Q50 71 56 74',
        stroke: '#333', 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round'
      })
    ]);
  }

  function buildScene() {
    var scene = document.createElement('div');
    scene.className = 'gg-scene';

    // 4 distinct kids — different skin tones, hair styles, outfits, and poses.
    // Hand positions drive each pose:
    //   head-scratch: both hands near top of head
    //   cheek-clutch: both hands on cheeks ("oh no!" pose)
    //   shrug:        arms straight out at sides, palms up
    //   thinker:      one hand on chin, other on hip
    var kids = [
      {
        corner: 'tl',
        skinTone: '#fce8b8', hairColor: '#5a3a1a', hairStyle: 'short',
        shirtColor: '#5b9bd5', pantsColor: '#3a4d6a', shoeColor: '#c0392b',
        leftHand:  { x: 30, y: 42 }, leftHandBulge:  -12,
        rightHand: { x: 70, y: 42 }, rightHandBulge:  12,
        bubbleText: '?'
      },
      {
        corner: 'tr',
        skinTone: '#e8c89c', hairColor: '#222', hairStyle: 'long',
        shirtColor: '#f5576c', pantsColor: '#222',  shoeColor: '#ffffff',
        leftHand:  { x: 36, y: 66 }, leftHandBulge:  -6,
        rightHand: { x: 64, y: 66 }, rightHandBulge:  6,
        bubbleText: '?!'
      },
      {
        corner: 'bl',
        skinTone: '#fad4ae', hairColor: '#d4a449', hairStyle: 'curly',
        shirtColor: '#43e97b', pantsColor: '#8B4513', shoeColor: '#3a4d6a',
        leftHand:  { x: 12, y: 112 }, leftHandBulge:  -6,
        rightHand: { x: 88, y: 112 }, rightHandBulge:  6,
        bubbleText: '…'
      },
      {
        corner: 'br',
        skinTone: '#8d5524', hairColor: '#111', hairStyle: 'buzz',
        shirtColor: '#ffc857', pantsColor: '#1a4d7a', shoeColor: '#222',
        leftHand:  { x: 48, y: 78 },  leftHandBulge:  -2,   // hand on chin
        rightHand: { x: 30, y: 130 }, rightHandBulge: -10,  // hand on hip
        bubbleText: 'AI?'
      }
    ];

    kids.forEach(function(k) {
      var holder = document.createElement('div');
      holder.className = 'gg-citizen gg-citizen-' + k.corner;
      holder.appendChild(buildKid(k));
      scene.appendChild(holder);
    });

    // 12 floating data particles. Spread across the width with cycling colors
    // and staggered animation delays for a "swarm" effect.
    for (var i = 0; i < 12; i++) {
      var p = document.createElement('span');
      p.className = 'gg-particle gg-particle-' + (i % 4);
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
