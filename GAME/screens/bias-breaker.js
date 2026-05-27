// GAME/screens/bias-breaker.js — Continuous-gameplay platformer.
//
// Design: NO MODAL. Each gap has 4 floating "answer platforms" labeled with
// the question's 4 options. Player jumps onto the correct one to continue.
// Wrong platform shakes red, crumbles in 600ms, dropping the player to a
// safety net at the bottom of the canvas. From there they jump back up and
// try again. Physics never pauses; the question banner floats above the gap.
window.GG = window.GG || {};
GG.screens = GG.screens || {};

GG.screens.biasBreaker = (function() {
  var CANVAS_W = 1100;
  var CANVAS_H = 540;
  var GRAVITY    = 0.7;
  var JUMP_SPEED = -14;
  var WALK_SPEED = 4.5;
  var FRICTION   = 0.85;
  var PLAYER_W   = 50;
  var PLAYER_H   = 100;

  var SECTION_SPACING = 380;       // x distance between consecutive solid platforms
  var SOLID_W         = 160;
  var SOLID_Y         = 440;       // y of all "ground" solid platforms
  var ANSWER_W        = 110;       // width of an answer platform
  var ANSWER_H        = 18;        // height (thin so it feels like a stepping stone)
  var ANSWER_Y_HIGH   = 230;       // highest answer platform
  var ANSWER_Y_STEP   = 60;        // vertical spacing between answer platforms

  // Color palette (4 distinct, kid-friendly tones)
  var ANSWER_COLORS = ['#43e97b', '#f5576c', '#ffd166', '#8b5cf6'];

  function clearChildren(el) { while (el.firstChild) el.removeChild(el.firstChild); }

  function shuffle(arr) {
    var out = arr.slice();
    for (var i = out.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  }

  // ----- Level builder -----
  // We build the WHOLE level upfront with 5 traversal sections + 1 boss arena.
  // Each section has: a solid landing platform on the LEFT, then 4 answer platforms
  // in the gap, leading to the next solid platform.
  function buildLevel(questions) {
    var sections = [];
    var x = 0;
    for (var i = 0; i < questions.length; i++) {
      var question = questions[i];
      // SOLID landing platform for this section
      var solid = { type: 'solid', x: x, y: SOLID_Y, w: SOLID_W, h: 60 };

      // 4 answer platforms in the gap to the right
      var gapStart = x + SOLID_W + 20;
      var answers = [];
      // Shuffle option indices so the correct one isn't always at position 0
      var positions = shuffle([0, 1, 2, 3]);
      for (var p = 0; p < 4; p++) {
        var optionIdx = positions[p];
        answers.push({
          type: 'answer',
          x: gapStart + 22,
          y: ANSWER_Y_HIGH + p * ANSWER_Y_STEP,
          w: ANSWER_W,
          h: ANSWER_H,
          // p is the row index (0=top, 3=bottom). Each row gets a different
          // option from the (shuffled) options list.
          rowIndex: p,
          optionIndex: optionIdx,
          optionText: question.options[optionIdx],
          isCorrect: (optionIdx === question.correct),
          color: ANSWER_COLORS[p],
          state: 'live',                    // 'live' | 'locked' | 'crumbling' | 'gone'
          shakeOffset: 0,
          crumbleStart: 0
        });
      }

      sections.push({
        question: question,
        solid: solid,
        answers: answers,
        gapCenterX: gapStart + ANSWER_W / 2 + 22,
        gapBannerY: ANSWER_Y_HIGH - 60,
        answered: false
      });
      x += SECTION_SPACING;
    }

    // Final solid platform after the last section
    var finalSolid = { type: 'solid', x: x, y: SOLID_Y, w: SOLID_W * 1.5, h: 60, isFinish: true };

    // Safety net at the bottom — catches any fall
    var safety = { type: 'safety', x: -200, y: CANVAS_H - 30, w: x + 600, h: 30 };

    return {
      sections: sections,
      finalSolid: finalSolid,
      safetyNet: safety,
      totalWidth: x + SOLID_W * 1.5
    };
  }

  // ----- Question banner overlay -----
  function buildBanner() {
    var b = document.createElement('div');
    b.className = 'gg-bb-banner';
    b.hidden = true;
    return b;
  }

  // ----- Answer label overlay -----
  // For each answer platform, we render an HTML label positioned in canvas-space
  // (translated via CSS). Re-positioned each frame so they track camera scroll.
  function buildLabel(text, color) {
    var el = document.createElement('div');
    el.className = 'gg-bb-answer-label';
    el.style.borderColor = color;
    el.textContent = text;
    return el;
  }

  function render(rootEl, profile, onComplete) {
    clearChildren(rootEl);

    // Pick 5 traversal questions + 3 boss questions (8 total, no repeats)
    var allQs = GG.biasBreakerQuestions.pickN(8);
    var traversalQs = allQs.slice(0, 5);
    var bossQs      = allQs.slice(5, 8);
    var level = buildLevel(traversalQs);

    // ---- DOM scaffolding ----
    var stageEl = document.createElement('div');
    stageEl.className = 'gg-bb-stage';

    var canvas = document.createElement('canvas');
    canvas.className = 'gg-bb-canvas';
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    stageEl.appendChild(canvas);

    var avatarRefs = GG.biasBreakerAvatar.build();
    stageEl.appendChild(avatarRefs.svg);

    // Overlay container for HTML labels + banner — sits above canvas, transforms with camera
    var overlay = document.createElement('div');
    overlay.className = 'gg-bb-overlay';
    stageEl.appendChild(overlay);

    var banner = buildBanner();
    overlay.appendChild(banner);

    var hud = buildHUD();
    stageEl.appendChild(hud.root);

    var fallOverlay = document.createElement('div');
    fallOverlay.className = 'gg-bb-fall-overlay';
    stageEl.appendChild(fallOverlay);

    rootEl.appendChild(stageEl);

    var ctx = canvas.getContext('2d');
    var keys = {};

    // ---- Build label DOM elements (one per answer platform) ----
    level.sections.forEach(function(section) {
      section.answers.forEach(function(a) {
        a.labelEl = buildLabel(a.optionText, a.color);
        overlay.appendChild(a.labelEl);
      });
    });

    // ---- Boss state (modal-free design: boss is overhead during a final arena) ----
    var bossState = {
      active: false,
      hp: 3,
      hitFlash: 0,
      defeated: false,
      defeatedAt: 0,
      x: 0, y: 30,
      currentQuestion: null,
      currentAnswers: [],
      questionIdx: 0
    };

    // ---- Player state ----
    var state = {
      x: 40, y: SOLID_Y - PLAYER_H,
      vx: 0, vy: 0,
      facing: 'right',
      onGround: false,
      currentSection: 0,
      falls: 0,
      animState: 'idle',
      animTime: 0,
      camX: 0,
      isPaused: false,
      running: true,
      finished: false
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
      var bs = document.createElement('span'); bs.className = 'gg-bb-hud-boss'; bs.hidden = true; root.appendChild(bs);
      function setPlatforms(cur, total) { pl.textContent = 'Section: ' + cur + '/' + total; }
      function setBoss(hp) {
        if (hp === null || hp === undefined) { bs.hidden = true; return; }
        bs.hidden = false;
        var hearts = '';
        for (var i = 0; i < hp; i++) hearts += '♥';
        for (var j = 0; j < 3 - hp; j++) hearts += '♡';
        bs.textContent = 'Gatekeeper HP: ' + hearts;
      }
      setPlatforms(0, level.sections.length);
      return { root: root, setPlatforms: setPlatforms, setBoss: setBoss };
    }

    // ---- Collisions ----
    function checkCollisions() {
      state.onGround = false;
      var section = level.sections[state.currentSection];
      var bossSolid = bossState.active ? { type: 'solid', x: bossState.x, y: SOLID_Y, w: 300, h: 60 } : null;

      // Build a flat list of all platforms the player can land on this frame
      var pads = [];
      // Always: safety net
      pads.push(level.safetyNet);
      // All section solids up to and including current section
      for (var s = 0; s <= state.currentSection && s < level.sections.length; s++) {
        pads.push(level.sections[s].solid);
      }
      // Current section's live answer platforms
      if (section && !section.answered) {
        section.answers.forEach(function(a) {
          if (a.state === 'live' || a.state === 'locked') pads.push(a);
        });
      }
      // Final solid + boss platform if reached
      if (state.currentSection >= level.sections.length) pads.push(level.finalSolid);
      if (bossSolid) pads.push(bossSolid);
      // Active boss answer platforms
      bossState.currentAnswers.forEach(function(a) {
        if (a.state === 'live' || a.state === 'locked') pads.push(a);
      });

      for (var i = 0; i < pads.length; i++) {
        var p = pads[i];
        var px1 = state.x, px2 = state.x + PLAYER_W;
        var py2 = state.y + PLAYER_H;
        if (px2 > p.x && px1 < p.x + p.w && py2 >= p.y && py2 <= p.y + 30 && state.vy > 0) {
          state.y = p.y - PLAYER_H;
          state.vy = 0;
          state.onGround = true;

          // If this is an answer platform in 'live' state and not already evaluated,
          // commit the player's answer.
          if (p.type === 'answer' && p.state === 'live') {
            handleAnswerLanding(p, section);
          }

          // If we landed on the next section's solid, advance the section index
          for (var s2 = 0; s2 < level.sections.length; s2++) {
            if (level.sections[s2].solid === p && state.currentSection < s2) {
              state.currentSection = s2;
              hud.setPlatforms(state.currentSection + 1, level.sections.length);
            }
          }
          // If we landed on the safety net
          if (p.type === 'safety') {
            // Just chill; player can jump up again from here
          }
        }
      }
    }

    // ---- Answer landing logic ----
    function handleAnswerLanding(answer, section) {
      if (!section || section.answered) return;
      if (answer.isCorrect) {
        // Lock as solid; spawn next section's solid platform (if any)
        answer.state = 'locked';
        section.answered = true;
        section.solidBridge = answer;
        // Crumble the other 3 (visual feedback)
        section.answers.forEach(function(other) {
          if (other !== answer && other.state === 'live') {
            other.state = 'crumbling';
            other.crumbleStart = state.animTime;
          }
        });
        // Show success banner briefly
        showBanner('✓ Correct! Fair AI thinking.', 'correct');
        setTimeout(function() { hideBanner(); showSectionBanner(state.currentSection + 1); }, 1200);
      } else {
        // Shake + crumble
        answer.state = 'crumbling';
        answer.crumbleStart = state.animTime;
        showBanner('✗ Try again — read carefully', 'wrong');
        // After ~1s the player will be in mid-fall, jump back from safety net
        setTimeout(function() {
          showSectionBanner(state.currentSection + (section.answered ? 1 : 0));
        }, 1400);
      }
    }

    // ---- Boss answer landing ----
    function handleBossAnswerLanding(answer) {
      if (answer.isCorrect) {
        answer.state = 'locked';
        bossState.hp--;
        bossState.hitFlash = 1;
        hud.setBoss(bossState.hp);
        bossState.currentAnswers.forEach(function(other) {
          if (other !== answer && other.state === 'live') {
            other.state = 'crumbling';
            other.crumbleStart = state.animTime;
          }
        });
        if (bossState.hp <= 0) {
          bossState.defeated = true;
          bossState.defeatedAt = state.animTime;
          hideBanner();
          setTimeout(function() {
            var stars = state.falls === 0 ? 3 : state.falls <= 3 ? 2 : 1;
            GG.biasBreakerCelebration.show(stageEl, {
              stars: stars,
              onContinue: function() { cleanup(); onComplete({ cleared: true, stars: stars }); }
            });
          }, 1300);
        } else {
          showBanner('✓ Hit! Keep going.', 'correct');
          setTimeout(function() { loadBossQuestion(); }, 1100);
        }
      } else {
        answer.state = 'crumbling';
        answer.crumbleStart = state.animTime;
        showBanner('✗ Try again', 'wrong');
        setTimeout(function() {
          // Refresh the same boss question with fresh answer platforms
          loadBossQuestion(bossState.currentQuestion);
        }, 1200);
      }
    }

    // ---- Banner control ----
    function showBanner(text, kind) {
      banner.textContent = text;
      banner.className = 'gg-bb-banner gg-bb-banner-' + (kind || 'info');
      banner.hidden = false;
    }
    function hideBanner() { banner.hidden = true; }

    function showSectionBanner(sectionIdx) {
      var nextSection = level.sections[sectionIdx];
      if (!nextSection) {
        if (sectionIdx >= level.sections.length && !bossState.active) {
          enterBossArena();
        }
        return;
      }
      banner.className = 'gg-bb-banner gg-bb-banner-question';
      banner.textContent = nextSection.question.question;
      banner.hidden = false;
    }

    // ---- Boss arena ----
    function enterBossArena() {
      if (bossState.active) return;
      bossState.active = true;
      bossState.x = level.totalWidth + 80;
      hud.setBoss(bossState.hp);
      loadBossQuestion();
    }

    function loadBossQuestion(forceQ) {
      // Clean up old boss answer platforms
      bossState.currentAnswers.forEach(function(a) {
        if (a.labelEl && a.labelEl.parentNode) a.labelEl.parentNode.removeChild(a.labelEl);
      });
      bossState.currentAnswers = [];

      var q = forceQ || bossQs[bossState.questionIdx % bossQs.length];
      if (!forceQ) bossState.questionIdx++;
      bossState.currentQuestion = q;

      var arenaX = level.totalWidth + 250;
      var positions = shuffle([0, 1, 2, 3]);
      for (var p = 0; p < 4; p++) {
        var optionIdx = positions[p];
        var a = {
          type: 'answer',
          x: arenaX + 22,
          y: ANSWER_Y_HIGH + p * ANSWER_Y_STEP,
          w: ANSWER_W,
          h: ANSWER_H,
          rowIndex: p,
          optionIndex: optionIdx,
          optionText: q.options[optionIdx],
          isCorrect: (optionIdx === q.correct),
          color: ANSWER_COLORS[p],
          state: 'live',
          crumbleStart: 0,
          isBoss: true
        };
        a.labelEl = buildLabel(a.optionText, a.color);
        overlay.appendChild(a.labelEl);
        bossState.currentAnswers.push(a);
      }

      banner.className = 'gg-bb-banner gg-bb-banner-question';
      banner.textContent = '⚔ BOSS: ' + q.question;
      banner.hidden = false;
    }

    // ---- Fall / safety net ----
    function checkFall() {
      // Falling out of the world (off the safety net)
      if (state.y > CANVAS_H + 100) {
        state.falls++;
        fallOverlay.classList.add('gg-bb-fading');
        setTimeout(function() {
          var resp = level.sections[state.currentSection].solid;
          state.x = resp.x + 20;
          state.y = resp.y - PLAYER_H;
          state.vx = 0; state.vy = 0;
          fallOverlay.classList.remove('gg-bb-fading');
        }, 250);
      }
    }

    // ---- Crumble lifecycle ----
    function updateCrumbles() {
      function tickAnswer(a) {
        if (a.state === 'crumbling') {
          var t = state.animTime - a.crumbleStart;
          a.shakeOffset = Math.sin(t * 0.8) * 4;
          if (t > 36) {  // ~600ms at 60fps
            a.state = 'gone';
            a.shakeOffset = 0;
            if (a.labelEl && a.labelEl.parentNode) a.labelEl.parentNode.removeChild(a.labelEl);
          }
        }
      }
      level.sections.forEach(function(section) { section.answers.forEach(tickAnswer); });
      bossState.currentAnswers.forEach(tickAnswer);
    }

    // ---- Auto-advance to boss after final section ----
    function checkProgress() {
      if (bossState.active) return;
      if (state.currentSection >= level.sections.length - 1 &&
          level.sections[level.sections.length - 1].answered &&
          state.x > level.finalSolid.x + 40) {
        enterBossArena();
      }
    }

    // ---- Rendering ----
    function drawBackground() {
      var g = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      g.addColorStop(0, '#0a0820');
      g.addColorStop(1, '#1a1247');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      for (var y = 0; y < CANVAS_H; y += 4) ctx.fillRect(0, y, CANVAS_W, 1);
      ctx.fillStyle = 'rgba(67, 233, 255, 0.13)';
      for (var i = 0; i < 18; i++) {
        var rx = (i * 67 + state.animTime * 0.5) % CANVAS_W;
        var ry = (state.animTime * 1.2 + i * 50) % (CANVAS_H + 60);
        ctx.fillRect(rx, CANVAS_H - ry, 2, 24);
      }
    }

    function drawSolidPlatform(p, color, opts) {
      opts = opts || {};
      var glow = opts.glow !== false;
      if (glow) {
        ctx.shadowColor = 'rgba(67, 233, 123, 0.6)';
        ctx.shadowBlur = 18;
      }
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

    function drawAnswerPlatform(a) {
      if (a.state === 'gone') return;
      var x = a.x - state.camX + (a.shakeOffset || 0);
      var y = a.y;

      // Glow
      ctx.shadowColor = a.state === 'crumbling' ? 'rgba(245, 87, 108, 0.7)' : a.color;
      ctx.shadowBlur = 16;
      ctx.fillStyle = a.state === 'crumbling' ? '#3a1247' : a.color;
      ctx.beginPath();
      roundRect(ctx, x, y, a.w, a.h, 6);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Locked: extra-bright halo
      if (a.state === 'locked') {
        ctx.strokeStyle = '#ffd700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        roundRect(ctx, x - 2, y - 2, a.w + 4, a.h + 4, 8);
        ctx.stroke();
      }
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

    function drawSafetyNet() {
      var p = level.safetyNet;
      ctx.fillStyle = 'rgba(67, 233, 255, 0.15)';
      ctx.fillRect(p.x - state.camX, p.y, p.w, p.h);
      ctx.strokeStyle = 'rgba(67, 233, 255, 0.5)';
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(p.x - state.camX, p.y);
      ctx.lineTo(p.x - state.camX + p.w, p.y);
      ctx.stroke();
      ctx.setLineDash([]);
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
      // Position each answer's HTML label above its platform. The label for the
      // section the player is currently approaching is fully visible; further-out
      // sections are dimmed so the player focuses on the next decision.
      function updateOne(a, sectionIdx, isActive) {
        if (!a.labelEl) return;
        if (a.state === 'gone') {
          a.labelEl.style.display = 'none';
          return;
        }
        a.labelEl.style.display = '';
        var disp = logicalToDisplay(a.x - state.camX, a.y);
        a.labelEl.style.left = disp.x + 'px';
        a.labelEl.style.top  = (disp.y - 50) + 'px';
        // Allow the label to be wider than the tiny platform (use min-width via CSS)
        a.labelEl.style.width = '';
        // Dim non-active sections so the player focuses on the current decision
        a.labelEl.classList.toggle('gg-bb-label-dim', !isActive);
        if (a.state === 'crumbling') a.labelEl.classList.add('gg-bb-label-crumbling');
        if (a.state === 'locked')    a.labelEl.classList.add('gg-bb-label-locked');
      }
      level.sections.forEach(function(s, i) {
        var isActive = (i === state.currentSection && !s.answered);
        s.answers.forEach(function(a) { updateOne(a, i, isActive); });
      });
      bossState.currentAnswers.forEach(function(a) { updateOne(a, -1, true); });
    }

    function updateCamera() {
      var target = state.x - CANVAS_W / 3;
      state.camX += (Math.max(0, target) - state.camX) * 0.12;
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
      if (jump && state.onGround) { state.vy = JUMP_SPEED; state.onGround = false; }

      state.vy += GRAVITY;
      state.x  += state.vx;
      state.y  += state.vy;

      // Constrain to world bounds (left edge)
      if (state.x < 0) state.x = 0;

      checkCollisions();
      checkFall();
      updateCamera();
      updateCrumbles();
      checkProgress();

      // Boss answer collision check (in case the player walks into a boss answer platform)
      if (bossState.active && !bossState.defeated) {
        bossState.currentAnswers.forEach(function(a) {
          if (a.state === 'live') {
            // Already handled by checkCollisions when player LANDS on it.
            // But we also evaluate when standing — answered above.
          }
        });
        if (bossState.hitFlash > 0) bossState.hitFlash -= 0.06;
      }

      // ---- Render ----
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      drawBackground();
      drawSafetyNet();

      // Solid platforms
      level.sections.forEach(function(s, i) {
        drawSolidPlatform(s.solid, '#43e97b');
      });
      // Final solid
      drawSolidPlatform(level.finalSolid, '#ffd700');

      // Answer platforms
      level.sections.forEach(function(s) {
        s.answers.forEach(drawAnswerPlatform);
      });

      // Boss
      if (bossState.active) {
        // Boss platform (solid) under the boss
        drawSolidPlatform({ x: bossState.x, y: SOLID_Y, w: 320, h: 60 }, '#5b2c87', { glow: false });
        // Boss
        GG.biasBreakerBoss.draw(ctx, {
          x: bossState.x + 80 - state.camX, y: 90,
          hp: bossState.hp, animTime: state.animTime,
          hitFlash: bossState.hitFlash,
          defeated: bossState.defeated, defeatedAt: bossState.defeatedAt
        });
        // Boss answer platforms
        bossState.currentAnswers.forEach(drawAnswerPlatform);
      }

      updateAvatar();
      updateLabels();

      // Initial banner — show on first frame
      if (state.animTime === 1) {
        showSectionBanner(0);
      }

      // Check for boss answer landing in the standing collision
      if (bossState.active && !bossState.defeated && state.onGround) {
        bossState.currentAnswers.forEach(function(a) {
          if (a.state === 'live') {
            var px1 = state.x, px2 = state.x + PLAYER_W;
            var py2 = state.y + PLAYER_H;
            if (px2 > a.x && px1 < a.x + a.w && Math.abs(py2 - a.y) < 5) {
              handleBossAnswerLanding(a);
            }
          }
        });
      }
    }

    function cleanup() {
      state.running = false;
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup',   onKeyUp);
      hidePauseOverlay();
    }

    requestAnimationFrame(tick);
  }

  return { render: render };
})();
