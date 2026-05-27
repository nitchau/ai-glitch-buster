// GAME/screens/bias-breaker.js — Continuous platformer w/ drifting answer clouds.
//
// Each section has 4 floating clouds that drift in sine-wave patterns. Player
// jumps from cloud to cloud freely. To COMMIT to an answer, they stand on a
// cloud for ~1.2s; a circular "energize" ring fills around them. When full,
// the answer is committed:
//   - Correct: cloud sparkles gold, next section opens
//   - Wrong:   cloud rains, player falls to safety net (auto-recovers)
// After 5 sections cleared, a glowing door appears. Walking into the door
// triggers the celebration.
//
// Sound via Web Audio (no asset files). Combo streak tracked in HUD.
window.GG = window.GG || {};
GG.screens = GG.screens || {};

GG.screens.biasBreaker = (function() {
  // ---- World constants ----
  var CANVAS_W = 1400;
  var CANVAS_H = 640;
  var GRAVITY    = 0.7;
  var JUMP_SPEED = -14;
  var WALK_SPEED = 4.5;
  var FRICTION   = 0.85;
  var PLAYER_W   = 50;
  var PLAYER_H   = 100;

  var SOLID_Y = 530;
  var SOLID_W = 200;
  var SECTION_SPACING = 520;

  var CLOUD_W = 140;
  var CLOUD_H = 56;
  var CLOUD_DRIFT_RANGE = 70;
  var CLOUD_DRIFT_SPEED = 0.012;
  var CLOUD_Y_TOP  = 200;
  var CLOUD_Y_STEP = 78;

  var CONFIRM_FRAMES = 72;  // ~1.2s at 60fps

  // Colors (kid-friendly, distinct)
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

  // ---- Web Audio synth (no assets) ----
  var _audioCtx = null;
  function audio() {
    if (_audioCtx) return _audioCtx;
    try {
      var Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return null;
      _audioCtx = new Ctor();
    } catch (e) { return null; }
    return _audioCtx;
  }
  function tone(freq, dur, type, vol) {
    var ctx = audio(); if (!ctx) return;
    var osc = ctx.createOscillator();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    var g = ctx.createGain();
    g.gain.setValueAtTime(vol == null ? 0.15 : vol, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(g); g.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + dur);
  }
  function seq(notes) {
    var t = 0;
    notes.forEach(function(n) {
      setTimeout(function() { tone(n.f, n.d || 0.12, n.t || 'sine', n.v || 0.18); }, t);
      t += (n.delay != null ? n.delay : 110);
    });
  }
  function sfxJump()    { tone(320, 0.08, 'square', 0.12); }
  function sfxLand()    { tone(120, 0.10, 'sine', 0.10); }
  function sfxTick()    { tone(880, 0.03, 'sine', 0.04); }
  function sfxCorrect() { seq([{ f: 523 }, { f: 659 }, { f: 784, d: 0.22 }]); }
  function sfxWrong()   {
    var ctx = audio(); if (!ctx) return;
    var o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.setValueAtTime(440, ctx.currentTime);
    o.frequency.linearRampToValueAtTime(180, ctx.currentTime + 0.32);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.12, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.32);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.32);
  }
  function sfxDoor()    { seq([{ f: 523 }, { f: 659 }, { f: 784 }, { f: 1047, d: 0.32, v: 0.22 }]); }
  function sfxFall()    {
    var ctx = audio(); if (!ctx) return;
    var o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(400, ctx.currentTime);
    o.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.4);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.10, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    o.connect(g); g.connect(ctx.destination);
    o.start(); o.stop(ctx.currentTime + 0.4);
  }

  // ---- Level builder ----
  function buildLevel(questions) {
    var sections = [];
    var x = 0;
    for (var i = 0; i < questions.length; i++) {
      var question = questions[i];
      var solid = { type: 'solid', x: x, y: SOLID_Y, w: SOLID_W, h: 60 };

      // Clouds floating in the gap to the right.
      // Centered roughly at gapMidX. 4 clouds at different y heights.
      var gapMidX = x + SOLID_W + 160;
      var positions = shuffle([0, 1, 2, 3]);
      var clouds = [];
      for (var p = 0; p < 4; p++) {
        var optionIdx = positions[p];
        clouds.push({
          type: 'cloud',
          baseX: gapMidX - CLOUD_W / 2,
          baseY: CLOUD_Y_TOP + p * CLOUD_Y_STEP,
          x: 0, y: 0,                              // computed each frame
          w: CLOUD_W, h: CLOUD_H,
          phase: Math.random() * Math.PI * 2,
          driftSpeed: CLOUD_DRIFT_SPEED * (0.8 + Math.random() * 0.5),
          vx: 0,                                    // current frame velocity (for sticky riding)
          rowIndex: p,
          optionIndex: optionIdx,
          optionText: question.options[optionIdx],
          isCorrect: (optionIdx === question.correct),
          color: ANSWER_COLORS[p],
          state: 'live',                            // 'live' | 'committed' | 'raining' | 'gone'
          rainStart: 0
        });
      }

      sections.push({
        question: question,
        solid: solid,
        clouds: clouds,
        answered: false
      });
      x += SECTION_SPACING;
    }

    // Final solid platform — wide, with a door at the far right
    var finalSolid = { type: 'solid', x: x, y: SOLID_Y, w: SOLID_W * 2, h: 60, isFinish: true };
    var door = {
      x: x + SOLID_W * 2 - 90, y: SOLID_Y - 130,
      w: 80, h: 130,
      open: false
    };

    var safety = { type: 'safety', x: -300, y: CANVAS_H - 30, w: x + 1200, h: 30 };

    return {
      sections: sections,
      finalSolid: finalSolid,
      door: door,
      safetyNet: safety,
      totalWidth: x + SOLID_W * 2 + 200
    };
  }

  // ---- Render: stage scaffolding helpers ----
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

  // ---- Main render ----
  function render(rootEl, profile, onComplete) {
    clearChildren(rootEl);

    var questions = GG.biasBreakerQuestions.pickN(5);
    var level = buildLevel(questions);

    // Stage container
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

    // Door prompt ("Walk into the door →")
    var doorPrompt = document.createElement('div');
    doorPrompt.className = 'gg-bb-door-prompt';
    doorPrompt.textContent = '🚪 Walk into the door to finish!';
    doorPrompt.hidden = true;
    overlay.appendChild(doorPrompt);

    // Streak indicator
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

    // Build cloud HTML labels
    level.sections.forEach(function(section) {
      section.clouds.forEach(function(c) {
        c.labelEl = buildLabel(c.optionText, c.color);
        overlay.appendChild(c.labelEl);
      });
    });

    // ---- Player state ----
    var state = {
      x: 60, y: SOLID_Y - PLAYER_H,
      vx: 0, vy: 0,
      facing: 'right',
      onGround: false,
      onCloud: null,                   // reference to the cloud being stood on, or null
      currentSection: 0,
      falls: 0,
      animState: 'idle',
      animTime: 0,
      camX: 0,
      isPaused: false,
      running: true,
      confirmTimer: 0,                 // counts frames while standing on a cloud
      streak: 0,
      finished: false,
      teleporting: false,
      doorEntered: false
    };

    // ---- Input ----
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

    // ---- Pause overlay ----
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

    // ---- HUD ----
    function buildHUD() {
      var root = document.createElement('div');
      root.className = 'gg-bb-hud';
      var pl = document.createElement('span'); pl.className = 'gg-bb-hud-platforms'; root.appendChild(pl);
      function setPlatforms(cur, total) { pl.textContent = 'Section: ' + cur + '/' + total; }
      setPlatforms(0, level.sections.length);
      return { root: root, setPlatforms: setPlatforms };
    }

    // ---- Streak ----
    function setStreak(n) {
      state.streak = n;
      if (n <= 0) {
        streakEl.hidden = true;
        return;
      }
      streakEl.hidden = false;
      streakEl.textContent = (n >= 3 ? '🔥 ' : '✨ ') + 'Streak: ' + n;
      streakEl.classList.add('gg-bb-streak-flash');
      setTimeout(function() { streakEl.classList.remove('gg-bb-streak-flash'); }, 220);
    }

    // ---- Banner ----
    function showBanner(text, kind) {
      banner.textContent = text;
      banner.className = 'gg-bb-banner gg-bb-banner-' + (kind || 'info');
      banner.hidden = false;
    }
    function showSectionBanner(idx) {
      var s = level.sections[idx];
      if (s) showBanner(s.question.question, 'question');
    }

    // ---- Update cloud positions per frame ----
    function updateClouds() {
      level.sections.forEach(function(section) {
        section.clouds.forEach(function(c) {
          if (c.state === 'gone') return;
          if (c.state === 'raining') {
            // Cloud descends as it rains
            c.y += 3;
            if (c.y > CANVAS_H + 50) c.state = 'gone';
            return;
          }
          var newX = c.baseX + Math.sin(state.animTime * c.driftSpeed + c.phase) * CLOUD_DRIFT_RANGE;
          c.vx = newX - c.x;
          c.x = newX;
          c.y = c.baseY + Math.cos(state.animTime * c.driftSpeed * 0.7 + c.phase) * 6;
        });
      });
    }

    // ---- Collisions + commit logic ----
    function checkCollisions() {
      state.onGround = false;
      var prevCloud = state.onCloud;
      state.onCloud = null;

      var pads = [];
      // Always include all solids visited or before
      level.sections.forEach(function(s, i) {
        if (i <= state.currentSection + 1) pads.push(s.solid);
      });
      pads.push(level.finalSolid);
      pads.push(level.safetyNet);

      // Active section's live clouds (those still alive)
      var section = level.sections[state.currentSection];
      if (section && !section.answered) {
        section.clouds.forEach(function(c) {
          if (c.state === 'live') pads.push(c);
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
          if (p.type === 'cloud') {
            state.onCloud = p;
            // Sticky platform: ride along with the cloud's drift
            state.x += p.vx;
          } else if (p.type === 'safety') {
            // No commit logic, just landing
          } else if (p === level.finalSolid) {
            // Maybe show door prompt
          } else {
            // landed on a section solid — possibly advance section index
            for (var s2 = 0; s2 < level.sections.length; s2++) {
              if (level.sections[s2].solid === p && state.currentSection < s2) {
                state.currentSection = s2;
                hud.setPlatforms(state.currentSection + 1, level.sections.length);
                showSectionBanner(state.currentSection);
              }
            }
          }
        }
      }

      // Reset confirm timer if no longer standing on the same cloud
      if (prevCloud !== state.onCloud) {
        state.confirmTimer = 0;
      }
    }

    // ---- Confirm logic ----
    function updateConfirm() {
      if (!state.onCloud) {
        state.confirmTimer = 0;
        return;
      }
      // Player must be standing relatively still (small vx ok from cloud drift)
      var stillEnough = (state.vy === 0 && Math.abs(state.vx) < WALK_SPEED * 0.5);
      if (stillEnough) {
        state.confirmTimer++;
        if (state.confirmTimer % 6 === 0) sfxTick();
        if (state.confirmTimer >= CONFIRM_FRAMES) {
          commitAnswer(state.onCloud);
          state.confirmTimer = 0;
        }
      } else {
        // Walking — slow the timer but don't reset hard
        state.confirmTimer = Math.max(0, state.confirmTimer - 2);
      }
    }

    function commitAnswer(cloud) {
      var section = level.sections[state.currentSection];
      if (!section || section.answered) return;
      cloud.state = 'committed';
      section.answered = true;
      // Spawn the next section's solid as a visual cue (it's already there in pads)
      if (cloud.isCorrect) {
        // Correct — sparkle gold, transport player to next solid
        sfxCorrect();
        setStreak(state.streak + 1);
        // Lift player toward next section's solid
        var nextSection = level.sections[state.currentSection + 1];
        var landingSolid = nextSection ? nextSection.solid : level.finalSolid;
        // Trigger a quick jump-arc to next platform
        state.vy = -16;
        state.vx = Math.sign(landingSolid.x - state.x) * (WALK_SPEED + 2);
        showBanner('✓ Correct!', 'correct');
        setTimeout(function() {
          if (nextSection) {
            showSectionBanner(state.currentSection + 1);
          } else {
            // No more sections — show door prompt
            level.door.open = true;
            doorPrompt.hidden = false;
            showBanner('You did it! Walk to the glowing door →', 'correct');
            sfxDoor();
          }
        }, 1100);
        // Crumble other clouds to clean visual
        section.clouds.forEach(function(other) {
          if (other !== cloud && other.state === 'live') {
            other.state = 'raining';
            other.rainStart = state.animTime;
          }
        });
      } else {
        // Wrong — rain + fall + streak break
        sfxWrong();
        setStreak(0);
        cloud.state = 'raining';
        cloud.rainStart = state.animTime;
        section.answered = false;  // allow retry
        // Re-spawn the 3 other clouds in 1 second
        showBanner('✗ Not that one. Try again!', 'wrong');
        // Re-enable a NEW random arrangement so player can try
        setTimeout(function() {
          reshuffleSection(section);
          showSectionBanner(state.currentSection);
        }, 1300);
      }
    }

    function reshuffleSection(section) {
      // Recreate the clouds for this section with fresh data
      section.clouds.forEach(function(c) {
        if (c.labelEl && c.labelEl.parentNode) c.labelEl.parentNode.removeChild(c.labelEl);
      });
      section.clouds = [];
      var gapMidX = section.solid.x + SOLID_W + 160;
      var positions = shuffle([0, 1, 2, 3]);
      for (var p = 0; p < 4; p++) {
        var optionIdx = positions[p];
        var c = {
          type: 'cloud',
          baseX: gapMidX - CLOUD_W / 2,
          baseY: CLOUD_Y_TOP + p * CLOUD_Y_STEP,
          x: gapMidX - CLOUD_W / 2,
          y: CLOUD_Y_TOP + p * CLOUD_Y_STEP,
          w: CLOUD_W, h: CLOUD_H,
          phase: Math.random() * Math.PI * 2,
          driftSpeed: CLOUD_DRIFT_SPEED * (0.8 + Math.random() * 0.5),
          vx: 0,
          rowIndex: p,
          optionIndex: optionIdx,
          optionText: section.question.options[optionIdx],
          isCorrect: (optionIdx === section.question.correct),
          color: ANSWER_COLORS[p],
          state: 'live',
          rainStart: 0
        };
        c.labelEl = buildLabel(c.optionText, c.color);
        overlay.appendChild(c.labelEl);
        section.clouds.push(c);
      }
    }

    // ---- Door check ----
    function checkDoor() {
      if (!level.door.open || state.doorEntered) return;
      // door zone
      var d = level.door;
      if (state.x + PLAYER_W > d.x && state.x < d.x + d.w &&
          state.y + PLAYER_H > d.y && state.y < d.y + d.h) {
        state.doorEntered = true;
        // Trigger celebration
        var stars = state.falls === 0 ? 3 : state.falls <= 2 ? 2 : 1;
        sfxDoor();
        setTimeout(function() {
          GG.biasBreakerCelebration.show(stageEl, {
            stars: stars,
            onContinue: function() { cleanup(); onComplete({ cleared: true, stars: stars }); }
          });
        }, 400);
      }
    }

    // ---- Fall ----
    function checkFall() {
      if (state.y > CANVAS_H + 80 && !state.teleporting) {
        state.falls++;
        setStreak(0);
        sfxFall();
        state.teleporting = true;
        fallOverlay.classList.add('gg-bb-fading');
        setTimeout(function() {
          var resp = level.sections[state.currentSection].solid;
          state.x = resp.x + 20;
          state.y = resp.y - PLAYER_H;
          state.vx = 0; state.vy = 0;
          state.onGround = true;
          state.teleporting = false;
          fallOverlay.classList.remove('gg-bb-fading');
        }, 350);
      }
    }

    // ---- Camera ----
    function updateCamera() {
      var target = state.x - CANVAS_W * 0.35;
      var maxCam = Math.max(0, level.totalWidth - CANVAS_W);
      state.camX += (Math.max(0, Math.min(maxCam, target)) - state.camX) * 0.12;
    }

    // ---- Render helpers ----
    function drawBackground() {
      var g = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      g.addColorStop(0, '#0a0820');
      g.addColorStop(1, '#1a1247');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      // Stars (slowly drifting)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      for (var i = 0; i < 60; i++) {
        var sx = (i * 73 + state.camX * 0.2) % CANVAS_W;
        var sy = (i * 37) % CANVAS_H * 0.6;
        var twinkle = 0.3 + Math.sin(state.animTime * 0.05 + i) * 0.3;
        ctx.globalAlpha = twinkle;
        ctx.fillRect(sx, sy, 2, 2);
      }
      ctx.globalAlpha = 1;
      // Scan lines
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      for (var y = 0; y < CANVAS_H; y += 4) ctx.fillRect(0, y, CANVAS_W, 1);
    }

    function drawSolid(p, color) {
      ctx.shadowColor = 'rgba(67, 233, 123, 0.6)';
      ctx.shadowBlur = 18;
      ctx.fillStyle = color || '#43e97b';
      ctx.beginPath();
      roundRect(ctx, p.x - state.camX, p.y, p.w, p.h, 14);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.fillRect(p.x - state.camX + 8, p.y + 4, p.w - 16, 4);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(p.x - state.camX, p.y + p.h - 4, p.w, 4);
    }

    function drawCloud(c) {
      if (c.state === 'gone') return;
      var x = c.x - state.camX;
      var y = c.y;
      var raining = (c.state === 'raining');
      // Cloud puff (multiple overlapping arcs)
      ctx.save();
      var color = c.color;
      if (raining) color = '#5a6b87';
      ctx.shadowColor = color;
      ctx.shadowBlur = raining ? 6 : 20;
      ctx.fillStyle = raining ? '#5a6b87' : 'rgba(255, 255, 255, 0.94)';
      ctx.beginPath();
      ctx.arc(x + 30, y + 30, 28, 0, Math.PI * 2);
      ctx.arc(x + 60, y + 20, 32, 0, Math.PI * 2);
      ctx.arc(x + 95, y + 28, 28, 0, Math.PI * 2);
      ctx.arc(x + 120, y + 35, 22, 0, Math.PI * 2);
      ctx.arc(x + 70, y + 42, 30, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      // Colored aura ring along the top edge (so player knows which color this is)
      ctx.strokeStyle = color;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(x + 6, y + 30);
      ctx.quadraticCurveTo(x + CLOUD_W / 2, y - 8, x + CLOUD_W - 6, y + 30);
      ctx.stroke();
      // Rain drops if raining
      if (raining) {
        var t = state.animTime - c.rainStart;
        ctx.fillStyle = 'rgba(120, 200, 255, 0.7)';
        for (var i = 0; i < 8; i++) {
          var dx = (i * 17 + t * 3) % CLOUD_W;
          var dy = (t * 4 + i * 10) % 60;
          ctx.fillRect(x + dx, y + CLOUD_H + dy, 2, 8);
        }
      }
      ctx.restore();
    }

    function drawConfirmRing() {
      if (!state.onCloud || state.confirmTimer === 0) return;
      var disp = logicalToDisplay(state.x + PLAYER_W / 2 - state.camX, state.y);
      var pct = Math.min(1, state.confirmTimer / CONFIRM_FRAMES);
      var rect = canvas.getBoundingClientRect();
      var radius = 38 * (rect.height / CANVAS_H);
      ctx.save();
      // Convert display-coords to canvas-pixels (we draw on canvas, not in display px)
      var cx = state.x + PLAYER_W / 2 - state.camX;
      var cy = state.y - 12;
      // Outer arc
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.95)';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.shadowColor = 'rgba(255, 215, 0, 0.7)';
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(cx, cy, 30, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * pct);
      ctx.stroke();
      ctx.shadowBlur = 0;
      // Inner faint circle
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.18)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(cx, cy, 30, 0, Math.PI * 2);
      ctx.stroke();
      // "Hold..." text
      ctx.fillStyle = 'rgba(255, 215, 0, 0.95)';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(pct >= 1 ? 'GO!' : 'HOLD', cx, cy - 38);
      ctx.restore();
    }

    function drawDoor() {
      var d = level.door;
      var x = d.x - state.camX;
      // Arch
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
      ctx.fillStyle = level.door.open ? 'rgba(255, 240, 180, 0.85)' : 'rgba(40, 30, 70, 0.85)';
      ctx.beginPath();
      ctx.moveTo(x + 14, d.y + d.h);
      ctx.lineTo(x + 14, d.y + 50);
      ctx.quadraticCurveTo(x + d.w / 2, d.y - 4, x + d.w - 14, d.y + 50);
      ctx.lineTo(x + d.w - 14, d.y + d.h);
      ctx.closePath();
      ctx.fill();
      // Sparkles when open
      if (level.door.open) {
        for (var i = 0; i < 6; i++) {
          var sx = x + 14 + ((i * 13 + state.animTime) % (d.w - 28));
          var sy = d.y + 30 + ((i * 17 + state.animTime * 0.7) % (d.h - 50));
          ctx.fillStyle = 'rgba(255, 255, 200, ' + (0.4 + Math.sin(state.animTime * 0.1 + i) * 0.3) + ')';
          ctx.fillRect(sx, sy, 3, 3);
        }
      }
    }

    function drawSafetyNet() {
      var p = level.safetyNet;
      ctx.fillStyle = 'rgba(67, 233, 255, 0.12)';
      ctx.fillRect(p.x - state.camX, p.y, p.w, p.h);
      ctx.strokeStyle = 'rgba(67, 233, 255, 0.4)';
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(p.x - state.camX, p.y);
      ctx.lineTo(p.x - state.camX + p.w, p.y);
      ctx.stroke();
      ctx.setLineDash([]);
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
      function updateOne(c, isActive) {
        if (!c.labelEl) return;
        if (c.state === 'gone' || c.state === 'committed') {
          c.labelEl.style.display = 'none';
          return;
        }
        c.labelEl.style.display = '';
        // Anchor at center-top of cloud
        var disp = logicalToDisplay(c.x + c.w / 2 - state.camX, c.y);
        c.labelEl.style.left = disp.x + 'px';
        c.labelEl.style.top  = (disp.y - 40) + 'px';
        c.labelEl.classList.toggle('gg-bb-label-dim', !isActive);
        if (c.state === 'raining') c.labelEl.classList.add('gg-bb-label-crumbling');
      }
      level.sections.forEach(function(s, i) {
        var isActive = (i === state.currentSection && !s.answered);
        s.clouds.forEach(function(c) { updateOne(c, isActive); });
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

    // ---- Tick ----
    function tick() {
      if (!state.running) return;
      requestAnimationFrame(tick);
      if (state.isPaused) return;
      state.animTime++;

      var goLeft  = keys.KeyA || keys.ArrowLeft;
      var goRight = keys.KeyD || keys.ArrowRight;
      var jump    = keys.Space || keys.KeyW || keys.ArrowUp;

      if (goLeft)       { state.vx = -WALK_SPEED; state.facing = 'left';  }
      else if (goRight) { state.vx =  WALK_SPEED; state.facing = 'right'; }
      else if (state.onGround) state.vx *= FRICTION;
      if (jump && state.onGround) {
        state.vy = JUMP_SPEED;
        state.onGround = false;
        state.onCloud = null;
        state.confirmTimer = 0;
        sfxJump();
      }

      state.vy += GRAVITY;
      state.x  += state.vx;
      state.y  += state.vy;
      if (state.x < 0) state.x = 0;

      updateClouds();
      checkCollisions();
      checkFall();
      updateConfirm();
      checkDoor();
      updateCamera();

      // ---- Render ----
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      drawBackground();
      drawSafetyNet();

      // Solids
      level.sections.forEach(function(s) { drawSolid(s.solid, '#43e97b'); });
      drawSolid(level.finalSolid, '#ffd700');

      // Clouds
      level.sections.forEach(function(s) {
        s.clouds.forEach(drawCloud);
      });

      // Door
      drawDoor();

      // Confirm ring (drawn on canvas above player)
      drawConfirmRing();

      // Avatar (SVG, separate layer)
      updateAvatar();
      updateLabels();
      updateDoorPrompt();

      // Initial banner
      if (state.animTime === 1) {
        showSectionBanner(0);
      }
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
