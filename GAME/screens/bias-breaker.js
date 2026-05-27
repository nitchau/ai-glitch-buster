// GAME/screens/bias-breaker.js — Main level orchestrator.
window.GG = window.GG || {};
GG.screens = GG.screens || {};

GG.screens.biasBreaker = (function() {
  var CANVAS_W = 900;
  var CANVAS_H = 500;
  var GRAVITY    = 0.8;
  var JUMP_SPEED = -14;
  var WALK_SPEED = 4;
  var FRICTION   = 0.85;
  var PLAYER_W   = 50;
  var PLAYER_H   = 100;

  function buildPlatforms() {
    return [
      { x:    0, y: 420, w: 160, h: 80 },
      { x:  220, y: 380, w: 140, h: 80 },
      { x:  420, y: 340, w: 140, h: 80 },
      { x:  620, y: 300, w: 140, h: 80 },
      { x:  800, y: 260, w: 140, h: 80 },
      { x:  980, y: 220, w: 220, h: 80 }
    ];
  }

  function clearChildren(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
  }

  function render(rootEl, profile, onComplete) {
    clearChildren(rootEl);

    var platforms = buildPlatforms();
    var keys = {};

    var stageEl = document.createElement('div');
    stageEl.className = 'gg-bb-stage';

    var canvas = document.createElement('canvas');
    canvas.className = 'gg-bb-canvas';
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    stageEl.appendChild(canvas);

    var avatarRefs = GG.biasBreakerAvatar.build();
    stageEl.appendChild(avatarRefs.svg);

    var hud = buildHUD();
    stageEl.appendChild(hud.root);

    var fallOverlay = document.createElement('div');
    fallOverlay.className = 'gg-bb-fall-overlay';
    stageEl.appendChild(fallOverlay);

    rootEl.appendChild(stageEl);

    var ctx = canvas.getContext('2d');

    var state = {
      x: 40, y: 320, vx: 0, vy: 0,
      facing: 'right',
      onGround: false,
      currentPlatform: 0,
      maxPlatformReached: 0,
      falls: 0,
      seenQuestionIds: [],
      animState: 'idle',
      animTime: 0,
      atBoss: false,
      bossHP: 3,
      bossX: 1080, bossY: 30,
      bossHitFlash: 0,
      bossDefeated: false,
      bossDefeatedAt: 0,
      camX: 0,
      modalOpen: false,
      isPaused: false,
      running: true
    };

    function onKeyDown(e) {
      keys[e.code] = true;
      if (['Space','ArrowLeft','ArrowRight','ArrowUp','KeyA','KeyD','KeyW'].indexOf(e.code) >= 0) {
        e.preventDefault();
      }
      if (e.code === 'Escape' && !state.modalOpen) {
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

    function pickQuestion(forBoss) {
      var pool = forBoss ?
        GG.biasBreakerQuestions.slice(5, 8) :
        GG.biasBreakerQuestions.slice(0, 5);
      var unseen = pool.filter(function(q) { return state.seenQuestionIds.indexOf(q.id) === -1; });
      var chosen = unseen.length > 0 ?
        unseen[Math.floor(Math.random() * unseen.length)] :
        pool[Math.floor(Math.random() * pool.length)];
      state.seenQuestionIds.push(chosen.id);
      return chosen;
    }
    function shuffle(arr) {
      var out = arr.slice();
      for (var i = out.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = out[i]; out[i] = out[j]; out[j] = t;
      }
      return out;
    }

    function showModal(forBoss, onCorrect) {
      state.modalOpen = true;
      state.isPaused = true;
      var modal = document.createElement('div');
      modal.className = 'gg-bb-modal';
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');

      function renderQ(question) {
        while (modal.firstChild) modal.removeChild(modal.firstChild);

        var qText = document.createElement('div');
        qText.className = 'gg-bb-modal-question';
        qText.textContent = question.question;
        modal.appendChild(qText);

        var optionsEl = document.createElement('div');
        optionsEl.className = 'gg-bb-modal-options';
        shuffle(question.options).forEach(function(opt) {
          var b = document.createElement('button');
          b.className = 'gg-bb-modal-option';
          b.type = 'button';
          b.textContent = opt.text;
          b.addEventListener('click', function() {
            Array.prototype.forEach.call(modal.querySelectorAll('.gg-bb-modal-option'), function(btn) { btn.disabled = true; });
            var feedback = document.createElement('div');
            feedback.className = 'gg-bb-modal-feedback ' + (opt.correct ? 'gg-bb-correct' : 'gg-bb-wrong');
            feedback.textContent = opt.correct ? opt.motivation : opt.explanation;
            modal.appendChild(feedback);
            setTimeout(function() {
              if (opt.correct) {
                if (modal.parentNode) modal.parentNode.removeChild(modal);
                state.modalOpen = false;
                state.isPaused = false;
                onCorrect();
              } else {
                renderQ(pickQuestion(forBoss));
              }
            }, opt.correct ? 800 : 1600);
          });
          optionsEl.appendChild(b);
        });
        modal.appendChild(optionsEl);
      }

      renderQ(pickQuestion(forBoss));
      stageEl.appendChild(modal);
    }

    function platformExists(idx) { return idx <= state.maxPlatformReached; }

    function checkPlatformCollisions() {
      state.onGround = false;
      for (var i = 0; i < platforms.length; i++) {
        if (!platformExists(i)) continue;
        var p = platforms[i];
        var px1 = state.x, px2 = state.x + PLAYER_W;
        var py2 = state.y + PLAYER_H;
        if (px2 > p.x && px1 < p.x + p.w && py2 >= p.y && py2 <= p.y + 30 && state.vy > 0) {
          state.y = p.y - PLAYER_H;
          state.vy = 0;
          state.onGround = true;
          state.currentPlatform = i;
          if (i > state.maxPlatformReached) state.maxPlatformReached = i;
        }
      }
    }

    function checkGapReach() {
      if (state.modalOpen) return;
      var cur = platforms[state.currentPlatform];
      var next = platforms[state.currentPlatform + 1];
      if (!next) return;
      var rightEdge = cur.x + cur.w;
      var playerRight = state.x + PLAYER_W;
      if (state.onGround && playerRight >= rightEdge - 10 && state.maxPlatformReached === state.currentPlatform) {
        var isLastGap = (state.currentPlatform === platforms.length - 2);
        state.x = rightEdge - PLAYER_W - 15;
        state.vx = 0;
        showModal(false, function() {
          state.maxPlatformReached++;
          hud.setPlatforms(state.maxPlatformReached, platforms.length - 1);
          if (isLastGap) { state.atBoss = true; hud.setBoss(state.bossHP); startBossLoop(); }
        });
      }
    }

    function checkFall() {
      if (state.y > CANVAS_H + 100) {
        state.falls++;
        fallOverlay.classList.add('gg-bb-fading');
        setTimeout(function() {
          var resp = platforms[state.maxPlatformReached];
          state.x = resp.x + 20;
          state.y = resp.y - PLAYER_H;
          state.vx = 0; state.vy = 0;
          state.onGround = true;
          state.currentPlatform = state.maxPlatformReached;
          fallOverlay.classList.remove('gg-bb-fading');
        }, 250);
      }
    }

    function startBossLoop() {
      showModal(true, function() {
        state.bossHP--;
        state.bossHitFlash = 1;
        hud.setBoss(state.bossHP);
        if (state.bossHP > 0) {
          startBossLoop();
        } else {
          state.bossDefeated = true;
          state.bossDefeatedAt = state.animTime;
          setTimeout(function() {
            var stars = state.falls === 0 ? 3 : state.falls <= 2 ? 2 : 1;
            GG.biasBreakerCelebration.show(stageEl, {
              stars: stars,
              onContinue: function() {
                cleanup();
                onComplete({ cleared: true, stars: stars });
              }
            });
          }, 1100);
        }
      });
    }

    function buildHUD() {
      var root = document.createElement('div');
      root.className = 'gg-bb-hud';
      var pl = document.createElement('span'); pl.className = 'gg-bb-hud-platforms'; root.appendChild(pl);
      var bs = document.createElement('span'); bs.className = 'gg-bb-hud-boss'; bs.hidden = true; root.appendChild(bs);
      function setPlatforms(cur, total) { pl.textContent = 'Platforms: ' + cur + '/' + total; }
      function setBoss(hp) {
        if (hp === null || hp === undefined) { bs.hidden = true; return; }
        bs.hidden = false;
        var hearts = '';
        for (var i = 0; i < hp; i++) hearts += '♥';
        for (var j = 0; j < 3 - hp; j++) hearts += '♡';
        bs.textContent = 'Gatekeeper HP: ' + hearts;
      }
      setPlatforms(0, platforms.length - 1);
      return { root: root, setPlatforms: setPlatforms, setBoss: setBoss };
    }

    function drawBackground() {
      var g = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      g.addColorStop(0, '#0a0820');
      g.addColorStop(1, '#1a1247');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      for (var y = 0; y < CANVAS_H; y += 4) ctx.fillRect(0, y, CANVAS_W, 1);
      ctx.fillStyle = 'rgba(67, 233, 255, 0.15)';
      for (var i = 0; i < 15; i++) {
        var rx = (i * 67 + state.animTime * 0.5) % CANVAS_W;
        var ry = (state.animTime * 1.2 + i * 50) % (CANVAS_H + 60);
        ctx.fillRect(rx, CANVAS_H - ry, 2, 20);
      }
    }

    function drawPlatforms() {
      for (var i = 0; i < platforms.length; i++) {
        if (!platformExists(i)) continue;
        var p = platforms[i];
        ctx.shadowColor = 'rgba(67, 233, 123, 0.6)';
        ctx.shadowBlur = 18;
        ctx.fillStyle = '#43e97b';
        ctx.beginPath();
        roundRect(ctx, p.x - state.camX, p.y, p.w, p.h, 14);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.fillRect(p.x - state.camX + 8, p.y + 4, p.w - 16, 4);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(p.x - state.camX, p.y + p.h - 4, p.w, 4);
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
        x: disp.x,
        y: disp.y,
        facing: state.facing,
        animState: anim,
        animTime: state.animTime
      });
    }

    function updateCamera() {
      var target = state.x - CANVAS_W / 3;
      state.camX += (Math.max(0, target) - state.camX) * 0.1;
    }

    function tick() {
      if (!state.running) return;
      requestAnimationFrame(tick);
      if (state.isPaused) return;
      state.animTime++;

      var goLeft  = keys.KeyA || keys.ArrowLeft;
      var goRight = keys.KeyD || keys.ArrowRight;
      var jump    = keys.Space || keys.KeyW || keys.ArrowUp;

      if (goLeft)  { state.vx = -WALK_SPEED; state.facing = 'left';  }
      else if (goRight) { state.vx =  WALK_SPEED; state.facing = 'right'; }
      else if (state.onGround) state.vx *= FRICTION;
      if (jump && state.onGround) { state.vy = JUMP_SPEED; state.onGround = false; }

      state.vy += GRAVITY;
      state.x  += state.vx;
      state.y  += state.vy;
      checkPlatformCollisions();
      checkGapReach();
      checkFall();
      updateCamera();

      if (state.bossHitFlash > 0) state.bossHitFlash -= 0.06;

      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      drawBackground();
      drawPlatforms();
      if (state.atBoss) {
        GG.biasBreakerBoss.draw(ctx, {
          x: state.bossX - state.camX, y: state.bossY,
          hp: state.bossHP, animTime: state.animTime,
          hitFlash: state.bossHitFlash,
          defeated: state.bossDefeated, defeatedAt: state.bossDefeatedAt
        });
      }
      updateAvatar();
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
