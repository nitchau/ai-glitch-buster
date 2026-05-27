// GAME/screens/bias-breaker.js — Continuous platformer w/ varied flying answers.
//
// Each of the 5 sections uses a DIFFERENT flyer type:
//   Section 0: Clouds            Section 3: Helicopters
//   Section 1: Birds (flapping)   Section 4: Quadcopters
//   Section 2: Kites (diamond+tail)
// Mechanically they're identical: 4 flyers drift in the gap, each labeled
// with one option. Player jumps onto whichever one and stays still.
//   - On a CORRECT flyer for >=1.5s -> it carries the player to the next solid
//     platform and disengages
//   - On a WRONG flyer for >=1.5s -> it crashes; player falls into LAVA at the
//     bottom of the gap; player teleports back to the current section's start
//   - Standing on ANY flyer for >2s without jumping = it crashes (no camping)
// Ground OUTSIDE solid platforms is LAVA, not a safety net. Lava = death =
// respawn at current section.
// Only the CURRENT section's flyers are visible — future sections hidden.
// At the end of the level a glowing door appears; walk into it -> player
// avatar steps inside (disappears) -> celebration screen.
window.GG = window.GG || {};
GG.screens = GG.screens || {};

GG.screens.biasBreaker = (function() {
  // ---- World constants ----
  var CANVAS_W = 1600;
  var CANVAS_H = 720;
  var GRAVITY    = 0.65;
  var JUMP_SPEED = -13;
  var WALK_SPEED = 3.5;          // slower per user request
  var FRICTION   = 0.82;
  var PLAYER_W   = 50;
  var PLAYER_H   = 100;

  var SOLID_Y = 580;
  var SOLID_W = 220;
  var SECTION_SPACING = 560;     // wider gaps now that flyers vary in size

  var FLYER_DRIFT_RANGE = 80;
  var FLYER_DRIFT_SPEED = 0.011;
  var FLYER_Y_TOP  = 220;
  var FLYER_Y_STEP = 80;

  var COMMIT_FRAMES   = 90;   // 1.5s @ 60fps to commit
  var CRASH_FRAMES    = 120;  // 2s @ 60fps anti-camp crash

  var LAVA_Y       = CANVAS_H - 60;  // lava surface
  var FLYER_TYPES = ['cloud', 'bird', 'kite', 'helicopter', 'quadcopter'];
  var ANSWER_COLORS = ['#43e97b', '#f5576c', '#ffd166', '#8b5cf6'];

  function shuffle(arr) {
    var out = arr.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  }
  function clearChildren(el) { while (el.firstChild) el.removeChild(el.firstChild); }

  // ---- Web Audio synth ----
  var _audioCtx = null;
  function audio() {
    if (_audioCtx) return _audioCtx;
    try {
      var C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      _audioCtx = new C();
    } catch (e) { return null; }
    return _audioCtx;
  }
  function tone(freq, dur, type, vol) {
    var ctx = audio(); if (!ctx) return;
    var o = ctx.createOscillator(); o.type = type || 'sine'; o.frequency.value = freq;
    var g = ctx.createGain();
    g.gain.setValueAtTime(vol == null ? 0.14 : vol, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + dur);
  }
  function seq(notes) {
    var t = 0;
    notes.forEach(function(n) {
      setTimeout(function() { tone(n.f, n.d || 0.12, n.t || 'sine', n.v || 0.16); }, t);
      t += (n.delay != null ? n.delay : 110);
    });
  }
  function sfxJump()    { tone(320, 0.08, 'square', 0.10); }
  function sfxLand()    { tone(120, 0.10, 'sine', 0.10); }
  function sfxTick()    { tone(880, 0.03, 'sine', 0.04); }
  function sfxCorrect() { seq([{ f: 523 }, { f: 659 }, { f: 784, d: 0.24, v: 0.20 }]); }
  function sfxWrong()   {
    var ctx = audio(); if (!ctx) return;
    var o = ctx.createOscillator(); o.type = 'square';
    o.frequency.setValueAtTime(440, ctx.currentTime);
    o.frequency.linearRampToValueAtTime(180, ctx.currentTime + 0.32);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.10, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.32);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.32);
  }
  function sfxLava()    {
    var ctx = audio(); if (!ctx) return;
    // Hissing noise + descending tone
    var o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(180, ctx.currentTime);
    o.frequency.linearRampToValueAtTime(50, ctx.currentTime + 0.4);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.16, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.4);
  }
  function sfxDoor()    { seq([{ f: 523 }, { f: 659 }, { f: 784 }, { f: 1047, d: 0.32, v: 0.22 }]); }

  // ---- Level builder ----
  function buildLevel(questions) {
    var sections = [];
    var x = 60; // start with a small gap from left wall
    for (var i = 0; i < questions.length; i++) {
      var question = questions[i];
      var solid = { type: 'solid', x: x, y: SOLID_Y, w: SOLID_W, h: 30 };
      var flyerType = FLYER_TYPES[i % FLYER_TYPES.length];

      var gapMidX = x + SOLID_W + 180;
      var positions = shuffle([0, 1, 2, 3]);
      var flyers = [];
      for (var p = 0; p < 4; p++) {
        var optionIdx = positions[p];
        var fw = flyerWidthFor(flyerType);
        var fh = flyerHeightFor(flyerType);
        flyers.push({
          type: flyerType,
          baseX: gapMidX - fw / 2,
          baseY: FLYER_Y_TOP + p * FLYER_Y_STEP,
          x: gapMidX - fw / 2, y: FLYER_Y_TOP + p * FLYER_Y_STEP,
          w: fw, h: fh,
          phase: Math.random() * Math.PI * 2,
          driftSpeed: FLYER_DRIFT_SPEED * (0.7 + Math.random() * 0.6),
          vx: 0,
          rowIndex: p,
          optionIndex: optionIdx,
          optionText: question.options[optionIdx],
          isCorrect: (optionIdx === question.correct),
          color: ANSWER_COLORS[p],
          state: 'live',                // live | crashing | gone
          crashStart: 0,
          carrying: false               // true when correct flyer is delivering player
        });
      }

      sections.push({
        question: question,
        solid: solid,
        flyerType: flyerType,
        flyers: flyers,
        answered: false
      });
      x += SECTION_SPACING;
    }

    var finalSolid = { type: 'solid', x: x, y: SOLID_Y, w: SOLID_W * 2, h: 30, isFinish: true };
    var door = {
      x: x + SOLID_W * 2 - 100,
      y: SOLID_Y - 150,
      w: 90, h: 150,
      open: false
    };

    return {
      sections: sections,
      finalSolid: finalSolid,
      door: door,
      totalWidth: x + SOLID_W * 2 + 200
    };
  }

  // ---- Flyer geometry per type ----
  function flyerWidthFor(type) {
    if (type === 'cloud') return 150;
    if (type === 'bird')  return 130;
    if (type === 'kite')  return 110;
    if (type === 'helicopter') return 150;
    if (type === 'quadcopter') return 130;
    return 140;
  }
  function flyerHeightFor(type) {
    if (type === 'cloud') return 58;
    if (type === 'bird')  return 50;
    if (type === 'kite')  return 60;
    if (type === 'helicopter') return 50;
    if (type === 'quadcopter') return 40;
    return 50;
  }

  function buildBanner() {
    var b = document.createElement('div');
    b.className = 'gg-bb-banner';
    b.hidden = true;
    return b;
  }
  function buildLabel(text, color) {
    var el = document.createElement('div');
    el.className = 'gg-bb-answer-label';
    el.style.borderColor = color;
    el.textContent = text;
    return el;
  }

  function render(rootEl, profile, onComplete) {
    clearChildren(rootEl);

    var questions = GG.biasBreakerQuestions.pickN(5);
    var level = buildLevel(questions);

    var stageEl = document.createElement('div');
    stageEl.className = 'gg-bb-stage';

    var canvas = document.createElement('canvas');
    canvas.className = 'gg-bb-canvas';
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    stageEl.appendChild(canvas);

    var avatarRefs = GG.biasBreakerAvatar.build();
    stageEl.appendChild(avatarRefs.svg);

    var overlay = document.createElement('div');
    overlay.className = 'gg-bb-overlay';
    stageEl.appendChild(overlay);

    var banner = buildBanner();
    overlay.appendChild(banner);

    var doorPrompt = document.createElement('div');
    doorPrompt.className = 'gg-bb-door-prompt';
    doorPrompt.textContent = '🚪 Walk into the door to finish!';
    doorPrompt.hidden = true;
    overlay.appendChild(doorPrompt);

    var streakEl = document.createElement('div');
    streakEl.className = 'gg-bb-streak';
    streakEl.hidden = true;
    stageEl.appendChild(streakEl);

    var hud = buildHUD();
    stageEl.appendChild(hud.root);

    var fallOverlay = document.createElement('div');
    fallOverlay.className = 'gg-bb-fall-overlay';
    stageEl.appendChild(fallOverlay);

    rootEl.appendChild(stageEl);

    var ctx = canvas.getContext('2d');
    var keys = {};

    // Build all labels but only show current section's
    level.sections.forEach(function(section) {
      section.flyers.forEach(function(f) {
        f.labelEl = buildLabel(f.optionText, f.color);
        overlay.appendChild(f.labelEl);
      });
    });

    var state = {
      x: 80, y: SOLID_Y - PLAYER_H,
      vx: 0, vy: 0,
      facing: 'right',
      onGround: false,
      onFlyer: null,
      dwellTimer: 0,           // time on current flyer (in frames)
      currentSection: 0,
      falls: 0,
      animState: 'idle',
      animTime: 0,
      camX: 0,
      isPaused: false,
      running: true,
      streak: 0,
      finished: false,
      teleporting: false,
      doorEntered: false,
      avatarHidden: false,
      carryingFlyer: null      // reference to the flyer carrying the player to next solid
    };

    function onKeyDown(e) {
      keys[e.code] = true;
      if (['Space','ArrowLeft','ArrowRight','ArrowUp','KeyA','KeyD','KeyW'].indexOf(e.code) >= 0) {
        e.preventDefault();
      }
      if (e.code === 'Escape') {
        state.isPaused = !state.isPaused;
        if (state.isPaused) showPauseOverlay(); else hidePauseOverlay();
      }
    }
    function onKeyUp(e) { keys[e.code] = false; }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup',   onKeyUp);

    var pauseOverlay = null;
    function showPauseOverlay() {
      if (pauseOverlay) return;
      pauseOverlay = document.createElement('div');
      pauseOverlay.className = 'gg-bb-pause';
      var h2 = document.createElement('h2'); h2.textContent = 'Paused'; pauseOverlay.appendChild(h2);
      var resume = document.createElement('button');
      resume.className = 'gg-button gg-primary'; resume.type = 'button'; resume.textContent = 'Resume';
      resume.addEventListener('click', function() { state.isPaused = false; hidePauseOverlay(); });
      pauseOverlay.appendChild(resume);
      var back = document.createElement('button');
      back.className = 'gg-button gg-secondary'; back.type = 'button'; back.textContent = 'Back to Map';
      back.addEventListener('click', function() { cleanup(); onComplete({ cleared: false, stars: 0 }); });
      pauseOverlay.appendChild(back);
      stageEl.appendChild(pauseOverlay);
    }
    function hidePauseOverlay() {
      if (pauseOverlay && pauseOverlay.parentNode) pauseOverlay.parentNode.removeChild(pauseOverlay);
      pauseOverlay = null;
    }

    function buildHUD() {
      var root = document.createElement('div');
      root.className = 'gg-bb-hud';
      var pl = document.createElement('span'); pl.className = 'gg-bb-hud-platforms'; root.appendChild(pl);
      function setPlatforms(cur, total) { pl.textContent = 'Section: ' + cur + '/' + total; }
      setPlatforms(0, level.sections.length);
      return { root: root, setPlatforms: setPlatforms };
    }

    function setStreak(n) {
      state.streak = n;
      if (n <= 0) { streakEl.hidden = true; return; }
      streakEl.hidden = false;
      streakEl.textContent = (n >= 3 ? '🔥 ' : '✨ ') + 'Streak: ' + n;
      streakEl.classList.add('gg-bb-streak-flash');
      setTimeout(function() { streakEl.classList.remove('gg-bb-streak-flash'); }, 220);
    }

    function showBanner(text, kind) {
      banner.textContent = text;
      banner.className = 'gg-bb-banner gg-bb-banner-' + (kind || 'info');
      banner.hidden = false;
    }
    function showSectionBanner(idx) {
      var s = level.sections[idx];
      if (s) showBanner(s.question.question, 'question');
    }

    function updateFlyers() {
      level.sections.forEach(function(section, idx) {
        section.flyers.forEach(function(f) {
          if (f.state === 'gone') return;
          if (f.state === 'crashing') {
            f.y += 5;
            if (f.y > LAVA_Y) {
              f.state = 'gone';
              if (f.labelEl && f.labelEl.parentNode) f.labelEl.parentNode.removeChild(f.labelEl);
            }
            return;
          }
          if (f.carrying) {
            // Flyer descending while carrying player
            var nextSolid = level.sections[state.currentSection + 1] ?
              level.sections[state.currentSection + 1].solid : level.finalSolid;
            var targetX = nextSolid.x + 30;
            var targetY = nextSolid.y - f.h;
            var dx = (targetX - f.x) * 0.06;
            var dy = (targetY - f.y) * 0.06;
            f.vx = dx;
            f.x += dx;
            f.y += dy;
            // Check arrival
            if (Math.abs(f.x - targetX) < 4 && Math.abs(f.y - targetY) < 4) {
              // Drop the player onto the solid
              state.onFlyer = null;
              f.carrying = false;
              f.state = 'gone';
              if (f.labelEl && f.labelEl.parentNode) f.labelEl.parentNode.removeChild(f.labelEl);
              state.carryingFlyer = null;
              state.currentSection = idx + 1;
              hud.setPlatforms(state.currentSection, level.sections.length);
              if (state.currentSection >= level.sections.length) {
                level.door.open = true;
                doorPrompt.hidden = false;
                showBanner('All 5 done! Walk into the door →', 'correct');
                sfxDoor();
              } else {
                showSectionBanner(state.currentSection);
              }
            }
            return;
          }
          // Only animate live flyers in the CURRENT section
          if (idx === state.currentSection && f.state === 'live') {
            var newX = f.baseX + Math.sin(state.animTime * f.driftSpeed + f.phase) * FLYER_DRIFT_RANGE;
            f.vx = newX - f.x;
            f.x = newX;
            f.y = f.baseY + Math.cos(state.animTime * f.driftSpeed * 0.7 + f.phase) * 6;
          }
        });
      });
    }

    function checkCollisions() {
      state.onGround = false;
      var prevFlyer = state.onFlyer;
      state.onFlyer = null;

      var pads = [];
      // Solids: current section's and one before (so retreating works)
      level.sections.forEach(function(s, i) {
        if (i <= state.currentSection) pads.push(s.solid);
      });
      pads.push(level.finalSolid);
      // Active section's live flyers
      var sec = level.sections[state.currentSection];
      if (sec && !sec.answered) {
        sec.flyers.forEach(function(f) {
          if (f.state === 'live' || f.carrying) pads.push(f);
        });
      }

      for (var i = 0; i < pads.length; i++) {
        var p = pads[i];
        var px1 = state.x, px2 = state.x + PLAYER_W;
        var py2 = state.y + PLAYER_H;
        if (px2 > p.x && px1 < p.x + p.w && py2 >= p.y && py2 <= p.y + 30 && state.vy > 0) {
          if (!state.onGround) sfxLand();
          state.y = p.y - PLAYER_H;
          state.vy = 0;
          state.onGround = true;
          if (p.type === 'cloud' || p.type === 'bird' || p.type === 'kite' ||
              p.type === 'helicopter' || p.type === 'quadcopter') {
            state.onFlyer = p;
            state.x += p.vx;  // sticky
          }
        }
      }

      // Dwell timer
      if (prevFlyer !== state.onFlyer) state.dwellTimer = 0;
    }

    function updateDwell() {
      if (!state.onFlyer) {
        state.dwellTimer = 0;
        return;
      }
      var f = state.onFlyer;
      if (f.carrying) return;  // already committed
      var stillEnough = (state.vy === 0 && Math.abs(state.vx) < WALK_SPEED * 0.5);
      if (stillEnough) {
        state.dwellTimer++;
        if (state.dwellTimer % 8 === 0 && state.dwellTimer < COMMIT_FRAMES) sfxTick();
        if (state.dwellTimer >= COMMIT_FRAMES && f.state === 'live') {
          commitAnswer(f);
        } else if (state.dwellTimer >= CRASH_FRAMES && f.state === 'live') {
          // Anti-camp: shouldn't normally hit since commit fires at 90
          crashFlyer(f, 'You camped! Keep moving.');
        }
      } else {
        state.dwellTimer = Math.max(0, state.dwellTimer - 2);
      }
    }

    function commitAnswer(flyer) {
      var section = level.sections[state.currentSection];
      if (!section || section.answered) return;
      if (flyer.isCorrect) {
        section.answered = true;
        flyer.carrying = true;       // flyer descends with player
        state.carryingFlyer = flyer;
        sfxCorrect();
        setStreak(state.streak + 1);
        showBanner('✓ Correct!', 'correct');
        // Crash other 3 flyers (visual)
        section.flyers.forEach(function(o) {
          if (o !== flyer && o.state === 'live') {
            o.state = 'crashing';
            o.crashStart = state.animTime;
          }
        });
      } else {
        crashFlyer(flyer, '✗ Wrong! Try again.');
      }
    }

    function crashFlyer(flyer, msg) {
      flyer.state = 'crashing';
      flyer.crashStart = state.animTime;
      sfxWrong();
      setStreak(0);
      showBanner(msg, 'wrong');
      // Player will likely fall now since the flyer is descending fast
    }

    function checkLava() {
      if (state.teleporting || state.doorEntered) return;
      // Anything below LAVA_Y is lava
      if (state.y + PLAYER_H >= LAVA_Y) {
        // ...unless they're on a solid (they shouldn't be — solids are above lava)
        if (!state.onGround) {
          state.falls++;
          setStreak(0);
          sfxLava();
          state.teleporting = true;
          fallOverlay.classList.add('gg-bb-fading');
          setTimeout(function() {
            // Respawn at current section's solid
            var resp = level.sections[state.currentSection].solid;
            state.x = resp.x + 30;
            state.y = resp.y - PLAYER_H;
            state.vx = 0; state.vy = 0;
            state.onGround = true;
            // Reset section's flyers for fresh attempt
            resetSection(state.currentSection);
            state.teleporting = false;
            fallOverlay.classList.remove('gg-bb-fading');
            showSectionBanner(state.currentSection);
          }, 400);
        }
      }
    }

    function resetSection(idx) {
      var section = level.sections[idx];
      if (!section || section.answered) return;
      // Remove existing labels
      section.flyers.forEach(function(f) {
        if (f.labelEl && f.labelEl.parentNode) f.labelEl.parentNode.removeChild(f.labelEl);
      });
      // Rebuild flyers fresh
      var gapMidX = section.solid.x + SOLID_W + 180;
      var positions = shuffle([0, 1, 2, 3]);
      var newFlyers = [];
      for (var p = 0; p < 4; p++) {
        var optionIdx = positions[p];
        var fw = flyerWidthFor(section.flyerType);
        var fh = flyerHeightFor(section.flyerType);
        var f = {
          type: section.flyerType,
          baseX: gapMidX - fw / 2,
          baseY: FLYER_Y_TOP + p * FLYER_Y_STEP,
          x: gapMidX - fw / 2, y: FLYER_Y_TOP + p * FLYER_Y_STEP,
          w: fw, h: fh,
          phase: Math.random() * Math.PI * 2,
          driftSpeed: FLYER_DRIFT_SPEED * (0.7 + Math.random() * 0.6),
          vx: 0,
          rowIndex: p,
          optionIndex: optionIdx,
          optionText: section.question.options[optionIdx],
          isCorrect: (optionIdx === section.question.correct),
          color: ANSWER_COLORS[p],
          state: 'live',
          crashStart: 0,
          carrying: false
        };
        f.labelEl = buildLabel(f.optionText, f.color);
        overlay.appendChild(f.labelEl);
        newFlyers.push(f);
      }
      section.flyers = newFlyers;
    }

    function checkDoor() {
      if (!level.door.open || state.doorEntered) return;
      var d = level.door;
      if (state.x + PLAYER_W > d.x + 10 && state.x < d.x + d.w - 10 &&
          state.y + PLAYER_H > d.y + 20 && state.y < d.y + d.h - 20) {
        state.doorEntered = true;
        state.avatarHidden = true;
        avatarRefs.svg.style.transition = 'opacity 0.5s, transform 0.5s';
        avatarRefs.svg.style.opacity = '0';
        avatarRefs.svg.style.transform += ' scale(0.4)';
        sfxDoor();
        showBanner('You walked through! 🎉', 'correct');
        setTimeout(function() {
          var stars = state.falls === 0 ? 3 : state.falls <= 2 ? 2 : 1;
          GG.biasBreakerCelebration.show(stageEl, {
            stars: stars,
            onContinue: function() { cleanup(); onComplete({ cleared: true, stars: stars }); }
          });
        }, 900);
      }
    }

    function updateCamera() {
      var target = state.x - CANVAS_W * 0.35;
      var maxCam = Math.max(0, level.totalWidth - CANVAS_W);
      state.camX += (Math.max(0, Math.min(maxCam, target)) - state.camX) * 0.12;
    }

    // ---- Render ----
    function drawBackground() {
      var g = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      g.addColorStop(0, '#0a0820');
      g.addColorStop(1, '#1a1247');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      for (var i = 0; i < 80; i++) {
        var sx = (i * 73 + state.camX * 0.2) % CANVAS_W;
        var sy = (i * 37) % (CANVAS_H * 0.65);
        var tw = 0.3 + Math.sin(state.animTime * 0.05 + i) * 0.3;
        ctx.globalAlpha = tw;
        ctx.fillRect(sx, sy, 2, 2);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      for (var y = 0; y < CANVAS_H; y += 4) ctx.fillRect(0, y, CANVAS_W, 1);
    }

    function drawSolid(p) {
      // Floating bridge with explicit underside (so it's visually clear you can walk under)
      ctx.save();
      ctx.shadowColor = 'rgba(67, 233, 123, 0.6)';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#43e97b';
      ctx.beginPath();
      roundRect(ctx, p.x - state.camX, p.y, p.w, p.h, 14);
      ctx.fill();
      ctx.shadowBlur = 0;
      // Top highlight
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.fillRect(p.x - state.camX + 8, p.y + 4, p.w - 16, 4);
      // Underside (dark) — makes it clear you can walk under
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(p.x - state.camX, p.y + p.h - 6, p.w, 6);
      // Pillar shadows hinting at "floating"
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(p.x - state.camX + 20, p.y + p.h, 6, 20);
      ctx.fillRect(p.x - state.camX + p.w - 26, p.y + p.h, 6, 20);
      ctx.restore();
    }

    function drawLava() {
      // Lava strip at bottom: red/orange gradient with wavy upper edge
      var topY = LAVA_Y - state.camX * 0;
      var g = ctx.createLinearGradient(0, topY, 0, CANVAS_H);
      g.addColorStop(0, '#ff5722');
      g.addColorStop(0.5, '#e65100');
      g.addColorStop(1, '#bf360c');
      ctx.fillStyle = g;
      ctx.fillRect(0, topY, CANVAS_W, CANVAS_H - topY);
      // Wavy top edge
      ctx.fillStyle = '#ffab40';
      ctx.beginPath();
      ctx.moveTo(0, topY);
      for (var x = 0; x <= CANVAS_W; x += 16) {
        var w = Math.sin(state.animTime * 0.08 + x * 0.06) * 6;
        ctx.lineTo(x, topY + w);
      }
      ctx.lineTo(CANVAS_W, topY);
      ctx.fill();
      // Glow particles rising
      ctx.fillStyle = 'rgba(255, 235, 100, 0.6)';
      for (var i = 0; i < 25; i++) {
        var px = (i * 67 + state.animTime * 1.5) % CANVAS_W;
        var py = (i * 9 + state.animTime * 2) % (CANVAS_H - topY);
        ctx.fillRect(px, CANVAS_H - py, 3, 3);
      }
    }

    function drawFlyer(f) {
      if (f.state === 'gone') return;
      var x = f.x - state.camX;
      var y = f.y;
      ctx.save();
      if (f.state === 'crashing') {
        ctx.globalAlpha = Math.max(0.2, 1 - (state.animTime - f.crashStart) / 40);
      }
      if (f.type === 'cloud') drawCloud(x, y, f);
      else if (f.type === 'bird') drawBird(x, y, f);
      else if (f.type === 'kite') drawKite(x, y, f);
      else if (f.type === 'helicopter') drawHelicopter(x, y, f);
      else if (f.type === 'quadcopter') drawQuadcopter(x, y, f);
      ctx.restore();
    }

    function drawCloud(x, y, f) {
      ctx.shadowColor = f.color; ctx.shadowBlur = 18;
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.beginPath();
      ctx.arc(x + 28, y + 30, 26, 0, Math.PI * 2);
      ctx.arc(x + 58, y + 22, 30, 0, Math.PI * 2);
      ctx.arc(x + 92, y + 26, 28, 0, Math.PI * 2);
      ctx.arc(x + 122, y + 32, 24, 0, Math.PI * 2);
      ctx.arc(x + 68, y + 40, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = f.color; ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x + 6, y + 28);
      ctx.quadraticCurveTo(x + f.w / 2, y - 6, x + f.w - 6, y + 28);
      ctx.stroke();
    }

    function drawBird(x, y, f) {
      // Body
      ctx.shadowColor = f.color; ctx.shadowBlur = 14;
      ctx.fillStyle = '#e8c89c';
      ctx.beginPath();
      ctx.ellipse(x + f.w / 2, y + 30, 32, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      // Head
      ctx.fillStyle = '#d4a76a';
      ctx.beginPath();
      ctx.arc(x + f.w - 28, y + 22, 14, 0, Math.PI * 2);
      ctx.fill();
      // Beak
      ctx.fillStyle = '#ffa500';
      ctx.beginPath();
      ctx.moveTo(x + f.w - 14, y + 22);
      ctx.lineTo(x + f.w, y + 25);
      ctx.lineTo(x + f.w - 14, y + 27);
      ctx.closePath();
      ctx.fill();
      // Eye
      ctx.fillStyle = '#222';
      ctx.fillRect(x + f.w - 26, y + 19, 3, 3);
      // Wing (flapping)
      var flap = Math.sin(state.animTime * 0.3 + f.phase) * 0.5;
      ctx.shadowBlur = 0;
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.moveTo(x + f.w / 2, y + 24);
      ctx.quadraticCurveTo(x + f.w / 2 - 10, y - 8 + flap * 14, x + f.w / 2 + 14, y + 6 - flap * 14);
      ctx.quadraticCurveTo(x + f.w / 2 + 14, y + 18, x + f.w / 2, y + 24);
      ctx.fill();
      // Tail
      ctx.fillStyle = f.color;
      ctx.beginPath();
      ctx.moveTo(x + 20, y + 30);
      ctx.lineTo(x, y + 26);
      ctx.lineTo(x, y + 36);
      ctx.closePath();
      ctx.fill();
    }

    function drawKite(x, y, f) {
      // Diamond
      ctx.shadowColor = f.color; ctx.shadowBlur = 14;
      ctx.fillStyle = f.color;
      var cx = x + f.w / 2, cy = y + 20;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 22);
      ctx.lineTo(cx + 32, cy);
      ctx.lineTo(cx, cy + 26);
      ctx.lineTo(cx - 32, cy);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      // Cross lines
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 22); ctx.lineTo(cx, cy + 26);
      ctx.moveTo(cx - 32, cy); ctx.lineTo(cx + 32, cy);
      ctx.stroke();
      // Tail with bows
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy + 26);
      var t = state.animTime * 0.1;
      ctx.quadraticCurveTo(cx + Math.sin(t) * 8, cy + 40, cx + Math.sin(t + 1) * 12, cy + f.h - 4);
      ctx.stroke();
      // Bows along the tail
      var bowYs = [cy + 32, cy + 44, cy + f.h - 6];
      ctx.fillStyle = '#fff';
      bowYs.forEach(function(by, i) {
        var bx = cx + Math.sin(t + i * 0.5) * 10;
        ctx.beginPath();
        ctx.ellipse(bx - 3, by, 3, 2, -0.5, 0, Math.PI * 2);
        ctx.ellipse(bx + 3, by, 3, 2, 0.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    function drawHelicopter(x, y, f) {
      // Body
      ctx.shadowColor = f.color; ctx.shadowBlur = 14;
      ctx.fillStyle = f.color;
      ctx.beginPath();
      roundRect(ctx, x + 20, y + 18, f.w - 40, 22, 10);
      ctx.fill();
      // Tail
      ctx.fillRect(x + f.w - 24, y + 26, 24, 6);
      // Tail rotor
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      var tr = state.animTime * 0.4;
      ctx.beginPath();
      ctx.ellipse(x + f.w, y + 28, 6, 2 + Math.abs(Math.cos(tr)) * 3, 0, 0, Math.PI * 2);
      ctx.fill();
      // Skids
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#888'; ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 20, y + 42); ctx.lineTo(x + f.w - 30, y + 42);
      ctx.stroke();
      // Main rotor (top, fast spinning blur)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.lineWidth = 3;
      var rotor = state.animTime * 0.8;
      ctx.beginPath();
      var mid = x + (f.w - 30) / 2 + 20;
      ctx.moveTo(mid - 40, y + 16); ctx.lineTo(mid + 40, y + 16);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.beginPath();
      ctx.moveTo(mid - 38 + Math.cos(rotor) * 6, y + 13);
      ctx.lineTo(mid + 38 + Math.cos(rotor + Math.PI) * 6, y + 19);
      ctx.stroke();
      // Window
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(x + 35, y + 28, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawQuadcopter(x, y, f) {
      // Central frame
      ctx.fillStyle = f.color;
      ctx.shadowColor = f.color; ctx.shadowBlur = 12;
      ctx.beginPath();
      roundRect(ctx, x + 30, y + 14, f.w - 60, 14, 6);
      ctx.fill();
      ctx.shadowBlur = 0;
      // 4 arms + rotors
      var arms = [
        { ax: 18,        ay: y + 8  },
        { ax: f.w - 18,  ay: y + 8  },
        { ax: 18,        ay: y + 34 },
        { ax: f.w - 18,  ay: y + 34 }
      ];
      ctx.strokeStyle = '#333'; ctx.lineWidth = 3;
      arms.forEach(function(a, i) {
        var ax = x + a.ax;
        var midX = x + f.w / 2;
        var midY = y + 21;
        ctx.beginPath();
        ctx.moveTo(midX, midY); ctx.lineTo(ax, a.ay);
        ctx.stroke();
        // Rotor blur
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        var rotPhase = state.animTime * 0.6 + i * 0.5;
        var rs = 10 + Math.abs(Math.cos(rotPhase)) * 6;
        ctx.beginPath();
        ctx.ellipse(ax, a.ay, rs, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
      });
      // Camera/sensor underneath
      ctx.fillStyle = '#111';
      ctx.beginPath();
      ctx.arc(x + f.w / 2, y + 30, 5, 0, Math.PI * 2);
      ctx.fill();
    }

    function drawDoor() {
      var d = level.door;
      var x = d.x - state.camX;
      ctx.save();
      var grad = ctx.createLinearGradient(x, d.y, x, d.y + d.h);
      grad.addColorStop(0, '#ffd700');
      grad.addColorStop(1, '#ff9500');
      ctx.fillStyle = grad;
      ctx.shadowColor = level.door.open ? 'rgba(255, 215, 0, 0.95)' : 'rgba(120, 120, 120, 0.4)';
      ctx.shadowBlur = level.door.open ? 36 : 8;
      ctx.beginPath();
      ctx.moveTo(x, d.y + d.h);
      ctx.lineTo(x, d.y + 40);
      ctx.quadraticCurveTo(x + d.w / 2, d.y - 20, x + d.w, d.y + 40);
      ctx.lineTo(x + d.w, d.y + d.h);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      // Interior
      ctx.fillStyle = level.door.open ? 'rgba(255, 240, 180, 0.92)' : 'rgba(40, 30, 70, 0.85)';
      ctx.beginPath();
      ctx.moveTo(x + 14, d.y + d.h);
      ctx.lineTo(x + 14, d.y + 50);
      ctx.quadraticCurveTo(x + d.w / 2, d.y - 4, x + d.w - 14, d.y + 50);
      ctx.lineTo(x + d.w - 14, d.y + d.h);
      ctx.closePath();
      ctx.fill();
      if (level.door.open) {
        for (var i = 0; i < 8; i++) {
          var sx = x + 14 + ((i * 13 + state.animTime) % (d.w - 28));
          var sy = d.y + 30 + ((i * 17 + state.animTime * 0.7) % (d.h - 50));
          ctx.fillStyle = 'rgba(255, 255, 200, ' + (0.4 + Math.sin(state.animTime * 0.1 + i) * 0.3) + ')';
          ctx.fillRect(sx, sy, 3, 3);
        }
      }
      ctx.restore();
    }

    function drawConfirmRing() {
      if (!state.onFlyer || state.dwellTimer === 0 || state.onFlyer.carrying) return;
      var pct = Math.min(1, state.dwellTimer / COMMIT_FRAMES);
      var cx = state.x + PLAYER_W / 2 - state.camX;
      var cy = state.y - 12;
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.95)';
      ctx.lineWidth = 5; ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(255, 215, 0, 0.7)'; ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(cx, cy, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.18)';
      ctx.beginPath(); ctx.arc(cx, cy, 30, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = 'rgba(255, 215, 0, 0.95)';
      ctx.font = 'bold 13px monospace'; ctx.textAlign = 'center';
      ctx.fillText(pct >= 1 ? 'GO!' : 'HOLD', cx, cy - 38);
      ctx.restore();
    }

    function roundRect(ctx, x, y, w, h, r) {
      if (r > w / 2) r = w / 2;
      if (r > h / 2) r = h / 2;
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y,     x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x,     y + h, r);
      ctx.arcTo(x,     y + h, x,     y,     r);
      ctx.arcTo(x,     y,     x + w, y,     r);
      ctx.closePath();
    }

    function logicalToDisplay(lx, ly) {
      var rect = canvas.getBoundingClientRect();
      var sx = rect.width / CANVAS_W;
      var sy = rect.height / CANVAS_H;
      return { x: lx * sx, y: ly * sy, sx: sx, sy: sy };
    }

    function updateAvatar() {
      if (state.avatarHidden) return;
      var anim = 'idle';
      if (!state.onGround) anim = state.vy < 0 ? 'jumping' : 'falling';
      else if (Math.abs(state.vx) > 0.5) anim = 'running';
      state.animState = anim;
      var disp = logicalToDisplay(state.x - state.camX, state.y);
      avatarRefs.svg.style.width = (PLAYER_W * disp.sx) + 'px';
      avatarRefs.svg.style.height = (PLAYER_H * disp.sy) + 'px';
      GG.biasBreakerAvatar.update(avatarRefs, {
        x: disp.x, y: disp.y,
        facing: state.facing,
        animState: anim,
        animTime: state.animTime
      });
    }

    function updateLabels() {
      level.sections.forEach(function(s, i) {
        var isActive = (i === state.currentSection && !s.answered);
        s.flyers.forEach(function(f) {
          if (!f.labelEl) return;
          // ONLY current section's labels visible at all
          if (!isActive || f.state === 'gone') {
            f.labelEl.style.display = 'none';
            return;
          }
          f.labelEl.style.display = '';
          var disp = logicalToDisplay(f.x + f.w / 2 - state.camX, f.y);
          f.labelEl.style.left = disp.x + 'px';
          f.labelEl.style.top  = (disp.y - 40) + 'px';
          if (f.state === 'crashing') f.labelEl.classList.add('gg-bb-label-crumbling');
          else f.labelEl.classList.remove('gg-bb-label-crumbling');
        });
      });
    }

    function updateDoorPrompt() {
      if (!level.door.open) { doorPrompt.hidden = true; return; }
      doorPrompt.hidden = false;
      var d = level.door;
      var disp = logicalToDisplay(d.x + d.w / 2 - state.camX, d.y);
      doorPrompt.style.left = disp.x + 'px';
      doorPrompt.style.top  = (disp.y - 50) + 'px';
    }

    function tick() {
      if (!state.running) return;
      requestAnimationFrame(tick);
      if (state.isPaused) return;
      state.animTime++;

      if (!state.doorEntered) {
        var goLeft  = keys.KeyA || keys.ArrowLeft;
        var goRight = keys.KeyD || keys.ArrowRight;
        var jump    = keys.Space || keys.KeyW || keys.ArrowUp;

        if (goLeft)       { state.vx = -WALK_SPEED; state.facing = 'left';  }
        else if (goRight) { state.vx =  WALK_SPEED; state.facing = 'right'; }
        else if (state.onGround) state.vx *= FRICTION;
        if (jump && state.onGround) {
          state.vy = JUMP_SPEED;
          state.onGround = false;
          state.onFlyer = null;
          state.dwellTimer = 0;
          sfxJump();
        }

        state.vy += GRAVITY;
        state.x  += state.vx;
        state.y  += state.vy;
        // LEFT WALL — cannot go off-screen left
        if (state.x < 0) { state.x = 0; if (state.vx < 0) state.vx = 0; }
      }

      updateFlyers();
      checkCollisions();
      checkLava();
      updateDwell();
      checkDoor();
      updateCamera();

      // ---- Render ----
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      drawBackground();
      drawLava();
      level.sections.forEach(function(s) { drawSolid(s.solid); });
      drawSolid(level.finalSolid);
      level.sections.forEach(function(s, i) {
        // Only draw current section's flyers (other sections' flyers are invisible)
        if (i === state.currentSection) s.flyers.forEach(drawFlyer);
        // Carrying flyer still drawn during transition
        else s.flyers.forEach(function(f) { if (f.carrying) drawFlyer(f); });
      });
      drawDoor();
      drawConfirmRing();
      updateAvatar();
      updateLabels();
      updateDoorPrompt();

      if (state.animTime === 1) showSectionBanner(0);
    }

    function cleanup() {
      state.running = false;
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup',   onKeyUp);
      hidePauseOverlay();
      try { if (_audioCtx && _audioCtx.close) _audioCtx.close(); _audioCtx = null; } catch (e) {}
    }

    requestAnimationFrame(tick);
  }

  return { render: render };
})();
