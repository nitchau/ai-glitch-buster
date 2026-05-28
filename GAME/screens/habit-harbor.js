// GAME/screens/habit-harbor.js — Bad-Habit Harbor island screen (Phase 1).
//
// Phase 1 scope: render the STATIC top-down maze (water, dock walls, closed
// gates, 5 glitch-bots, harbor-mouth exit) with the boat parked at the spawn.
// NO movement, rescue, or win yet — those land in Phases 2-4. The minimal
// requestAnimationFrame loop only animates ambient water/glitch shimmer and
// gives Phase 2 a place to add input without restructuring.
//
// Mirrors the bias-breaker screen's render/cleanup/persist pattern:
//   - adds 'gg-hh-active' to #gg-root for the dark edge-to-edge level theme
//   - persists 'gg.activeIsland' so a browser refresh resumes the maze
//   - registers GG._activeCleanup so the router's Back-to-App tears it down
window.GG = window.GG || {};
GG.screens = GG.screens || {};

GG.screens.habitHarbor = (function() {

  function clearChildren(el) { while (el.firstChild) el.removeChild(el.firstChild); }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function render(rootEl, profile, onComplete) {
    clearChildren(rootEl);

    // Level mode: dark gg-root + edge-to-edge stage (cleaned up in cleanup()).
    var ggRoot = document.getElementById('gg-root');
    if (ggRoot) ggRoot.classList.add('gg-hh-active');

    // Persist "currently inside Bad-Habit Harbor" so a refresh restores it.
    try { localStorage.setItem('gg.activeIsland', 'habit-harbor'); } catch (e) {}

    var maze = GG.habitHarborMaze;
    var model = maze.build();
    var CELL = maze.CELL, COLS = maze.COLS, ROWS = maze.ROWS;
    var CANVAS_W = COLS * CELL, CANVAS_H = ROWS * CELL;

    var stageEl = document.createElement('div');
    stageEl.className = 'gg-hh-stage';

    var canvas = document.createElement('canvas');
    canvas.className = 'gg-hh-canvas';
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    stageEl.appendChild(canvas);

    // On-screen D-pad (built before append so it sits inside the stage).
    // Its buttons feed the SAME `keys` object as the keyboard — one input
    // model, two surfaces (touch/mouse + keys).
    var keys = {};
    var dpad = document.createElement('div');
    dpad.className = 'gg-hh-dpad';
    function mkBtn(label, code, cls) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'gg-hh-dbtn ' + cls;
      b.textContent = label;
      function on(e) { e.preventDefault(); keys[code] = true; }
      function off(e) { e.preventDefault(); keys[code] = false; }
      b.addEventListener('pointerdown', on);
      b.addEventListener('pointerup', off);
      b.addEventListener('pointerleave', off);
      b.addEventListener('pointercancel', off);
      return b;
    }
    dpad.appendChild(mkBtn('▲', 'ArrowUp', 'gg-hh-up'));
    dpad.appendChild(mkBtn('◄', 'ArrowLeft', 'gg-hh-left'));
    dpad.appendChild(mkBtn('►', 'ArrowRight', 'gg-hh-right'));
    dpad.appendChild(mkBtn('▼', 'ArrowDown', 'gg-hh-down'));
    stageEl.appendChild(dpad);

    rootEl.appendChild(stageEl);

    var ctx = canvas.getContext('2d');
    var state = {
      running: true,
      t: 0,
      px: model.spawn ? model.spawn.c * CELL + CELL / 2 : CELL,
      py: model.spawn ? model.spawn.r * CELL + CELL / 2 : CELL,
      angle: 0,          // bow faces +x
      openGates: {},     // populated on each rescue (consumed by isWall)
      paused: false,     // true while a quiz modal is open
      rescuedCount: 0,
      timeMs: 0,
      lastSec: -1,
      activeBot: null,
      qPool: []          // shuffled question pool, refilled when empty
    };
    // Each bot starts un-rescued (glitching).
    model.bots.forEach(function (b) { b.rescued = false; });

    // Keyboard input (arrows + WASD) feeds the same `keys` object as the D-pad.
    function onKeyDown(e) {
      keys[e.code] = true;
      if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyA', 'KeyD', 'KeyW', 'KeyS'].indexOf(e.code) >= 0) {
        e.preventDefault();
      }
    }
    function onKeyUp(e) { keys[e.code] = false; }
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // ---- movement + per-axis wall collision (uses the maze's isWall) ----
    var BOAT_SPEED = 3, BOAT_R = CELL * 0.30;   // radius < half-corridor so it fits 1-cell channels
    function hitsWall(px, py) {
      var c0 = Math.floor((px - BOAT_R) / CELL), c1 = Math.floor((px + BOAT_R) / CELL);
      var r0 = Math.floor((py - BOAT_R) / CELL), r1 = Math.floor((py + BOAT_R) / CELL);
      for (var rr = r0; rr <= r1; rr++) {
        for (var cc = c0; cc <= c1; cc++) {
          if (maze.isWall(model, cc, rr, state.openGates)) return true;
        }
      }
      return false;
    }
    function updateBoat() {
      if (state.paused) return;   // frozen while a quiz modal is open
      var goL = keys.ArrowLeft || keys.KeyA, goR = keys.ArrowRight || keys.KeyD,
          goU = keys.ArrowUp || keys.KeyW,   goD = keys.ArrowDown || keys.KeyS;
      var dx = (goR ? 1 : 0) - (goL ? 1 : 0), dy = (goD ? 1 : 0) - (goU ? 1 : 0);
      // resolve axes separately so the boat slides along walls instead of sticking
      if (dx) { var nx = state.px + dx * BOAT_SPEED; if (!hitsWall(nx, state.py)) state.px = nx; }
      if (dy) { var ny = state.py + dy * BOAT_SPEED; if (!hitsWall(state.px, ny)) state.py = ny; }
      if (dx > 0) state.angle = 0;
      else if (dx < 0) state.angle = Math.PI;
      else if (dy > 0) state.angle = Math.PI / 2;
      else if (dy < 0) state.angle = -Math.PI / 2;
    }

    // ---- HUD (rescued count + count-up timer) ----
    function buildHUD() {
      var root = document.createElement('div');
      root.className = 'gg-hh-hud';
      var rc = document.createElement('span'); rc.className = 'gg-hh-hud-rescued'; root.appendChild(rc);
      var tm = document.createElement('span'); tm.className = 'gg-hh-hud-timer'; root.appendChild(tm);
      function setRescued(n, total) { rc.textContent = '🤖 Rescued ' + n + '/' + total; }
      function setTimer(s) { tm.textContent = '⏱ ' + s + 's'; }
      setRescued(0, model.bots.length);
      setTimer(0);
      return { root: root, setRescued: setRescued, setTimer: setTimer };
    }
    var hud = buildHUD();
    stageEl.appendChild(hud.root);

    // ---- floating banner ----
    var banner = document.createElement('div');
    banner.className = 'gg-hh-banner';
    banner.hidden = true;
    stageEl.appendChild(banner);
    var bannerTimer = null;
    function showBanner(text, kind) {
      banner.textContent = text;
      banner.className = 'gg-hh-banner gg-hh-banner-' + (kind || 'info');
      banner.hidden = false;
      if (bannerTimer) clearTimeout(bannerTimer);
      bannerTimer = setTimeout(function () { banner.hidden = true; }, 1700);
    }

    // ---- quiz modal + rescue ----
    function nextQuestion() {
      if (!state.qPool.length) state.qPool = GG.habitHarborQuestions.pickN(GG.habitHarborQuestions.size());
      return state.qPool.pop();
    }
    var modalEl = null;
    function openQuiz(bot) {
      state.paused = true;
      state.activeBot = bot;
      renderQuiz(nextQuestion(), bot, null);
    }
    function renderQuiz(q, bot, explainText) {
      if (modalEl && modalEl.parentNode) modalEl.parentNode.removeChild(modalEl);
      modalEl = document.createElement('div');
      modalEl.className = 'gg-hh-modal';

      var lead = document.createElement('p');
      lead.className = 'gg-hh-modal-lead';
      lead.textContent = 'This helper-bot picked up a bad habit:';
      modalEl.appendChild(lead);

      if (explainText) {
        var ex = document.createElement('p');
        ex.className = 'gg-hh-explain';
        ex.textContent = explainText;
        modalEl.appendChild(ex);
      }

      var qEl = document.createElement('p');
      qEl.className = 'gg-hh-modal-q';
      qEl.textContent = q.question;
      modalEl.appendChild(qEl);

      var choices = GG.habitHarborQuestions.toChoices(q);
      choices.forEach(function (ch) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'gg-hh-opt';
        b.textContent = ch.text;
        b.addEventListener('click', function () { answer(ch, bot); });
        modalEl.appendChild(b);
      });
      stageEl.appendChild(modalEl);
    }
    function answer(choice, bot) {
      if (choice.isCorrect) {
        rescue(bot);
        closeModal();
      } else {
        // never punishes — friendly nudge + a fresh question
        renderQuiz(nextQuestion(), bot, "🙅 Not quite — that's still a bad habit. Look for the kind, clear, honest choice!");
      }
    }
    function closeModal() {
      if (modalEl && modalEl.parentNode) modalEl.parentNode.removeChild(modalEl);
      modalEl = null;
      state.paused = false;
      state.activeBot = null;
    }
    function rescue(bot) {
      bot.rescued = true;
      state.openGates[bot.gate] = true;   // movement collision reads this immediately
      state.rescuedCount++;
      hud.setRescued(state.rescuedCount, model.bots.length);
      if (state.rescuedCount >= model.bots.length) {
        showBanner('🎉 All bots freed! Find the harbor mouth →', 'good');
      } else {
        showBanner('🤖 Fixed! A gate opened ✓', 'good');
      }
    }
    function checkBotCollision() {
      if (state.paused) return;
      for (var i = 0; i < model.bots.length; i++) {
        var b = model.bots[i];
        if (b.rescued) continue;
        var bxc = b.c * CELL + CELL / 2, byc = b.r * CELL + CELL / 2;
        var dx = state.px - bxc, dy = state.py - byc;
        if (dx * dx + dy * dy < (CELL * 0.6) * (CELL * 0.6)) { openQuiz(b); return; }
      }
    }

    // ---- drawing helpers (top-down) ----
    function cx(c) { return c * CELL; }
    function cy(r) { return r * CELL; }

    function drawWater() {
      var g = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      g.addColorStop(0, '#0c3a4a');
      g.addColorStop(1, '#0a2738');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      // gentle ripple lines (animated by state.t)
      ctx.strokeStyle = 'rgba(120, 220, 230, 0.06)';
      ctx.lineWidth = 2;
      for (var y = 0; y < CANVAS_H; y += 22) {
        ctx.beginPath();
        for (var x = 0; x <= CANVAS_W; x += 12) {
          var yy = y + Math.sin((x * 0.04) + (state.t * 0.03) + (y * 0.1)) * 3;
          if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
        }
        ctx.stroke();
      }
    }

    function isWallCell(c, r) {
      if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return true; // canvas border counts as wall
      return model.grid[r][c] === '#';
    }

    function strokeLine(x0, y0, x1, y1) {
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }

    // Render all '#' cells as CONTINUOUS wooden docks: seamless fill + plank
    // texture, with outlines/shadows drawn ONLY where a dock meets open water.
    // (No seams between adjacent walls — so it reads as solid piers, not a
    // grid of blocks.)
    function drawDocks() {
      var r, c, x, y;
      // Pass 1: seamless wood fill (no rounding, no per-cell outline) + faint
      // deterministic tint variation so large dock areas aren't flat.
      for (r = 0; r < ROWS; r++) {
        for (c = 0; c < COLS; c++) {
          if (model.grid[r][c] !== '#') continue;
          x = cx(c); y = cy(r);
          var g = ctx.createLinearGradient(0, y, 0, y + CELL);
          g.addColorStop(0, '#7c5734');
          g.addColorStop(1, '#5a3f24');
          ctx.fillStyle = g;
          ctx.fillRect(x, y, CELL, CELL);
          var v = ((c * 5 + r * 3) % 3) * 0.04;
          if (v > 0) { ctx.fillStyle = 'rgba(0,0,0,' + v + ')'; ctx.fillRect(x, y, CELL, CELL); }
        }
      }
      // Pass 2: plank seams + corner nail dots
      ctx.strokeStyle = 'rgba(40, 26, 12, 0.30)';
      ctx.lineWidth = 1;
      for (r = 0; r < ROWS; r++) {
        for (c = 0; c < COLS; c++) {
          if (model.grid[r][c] !== '#') continue;
          x = cx(c); y = cy(r);
          strokeLine(x, y + CELL * 0.5, x + CELL, y + CELL * 0.5);
          ctx.fillStyle = 'rgba(28, 17, 7, 0.40)';
          ctx.fillRect(x + 5, y + 5, 2, 2);
          ctx.fillRect(x + CELL - 7, y + 5, 2, 2);
          ctx.fillRect(x + 5, y + CELL - 7, 2, 2);
          ctx.fillRect(x + CELL - 7, y + CELL - 7, 2, 2);
        }
      }
      // Pass 3: shoreline — soft shadow cast onto the water + sunlit/dark rims,
      // only on edges adjacent to a non-wall cell.
      var S = 7, sg;
      for (r = 0; r < ROWS; r++) {
        for (c = 0; c < COLS; c++) {
          if (model.grid[r][c] !== '#') continue;
          x = cx(c); y = cy(r);
          var top = !isWallCell(c, r - 1), bot = !isWallCell(c, r + 1),
              lef = !isWallCell(c - 1, r), rig = !isWallCell(c + 1, r);
          if (bot) { sg = ctx.createLinearGradient(0, y + CELL, 0, y + CELL + S); sg.addColorStop(0, 'rgba(0,0,0,0.30)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = sg; ctx.fillRect(x, y + CELL, CELL, S); }
          if (rig) { sg = ctx.createLinearGradient(x + CELL, 0, x + CELL + S, 0); sg.addColorStop(0, 'rgba(0,0,0,0.30)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = sg; ctx.fillRect(x + CELL, y, S, CELL); }
          if (top) { sg = ctx.createLinearGradient(0, y, 0, y - S); sg.addColorStop(0, 'rgba(0,0,0,0.22)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = sg; ctx.fillRect(x, y - S, CELL, S); }
          if (lef) { sg = ctx.createLinearGradient(x, 0, x - S, 0); sg.addColorStop(0, 'rgba(0,0,0,0.22)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = sg; ctx.fillRect(x - S, y, S, CELL); }
          ctx.lineWidth = 2;
          if (top) { ctx.strokeStyle = 'rgba(255,228,170,0.45)'; strokeLine(x, y + 1, x + CELL, y + 1); }
          if (lef) { ctx.strokeStyle = 'rgba(255,228,170,0.22)'; strokeLine(x + 1, y, x + 1, y + CELL); }
          if (bot) { ctx.strokeStyle = 'rgba(18,11,5,0.55)';     strokeLine(x, y + CELL - 1, x + CELL, y + CELL - 1); }
          if (rig) { ctx.strokeStyle = 'rgba(18,11,5,0.45)';     strokeLine(x + CELL - 1, y, x + CELL - 1, y + CELL); }
        }
      }
    }

    function drawGate(gate) {
      var x = cx(gate.c), y = cy(gate.r);
      if (state.openGates[gate.id]) {
        // opened — two faded side posts show the gate has lifted
        ctx.fillStyle = 'rgba(120, 90, 50, 0.5)';
        ctx.fillRect(x + 4, y + CELL / 2 - 12, 6, 24);
        ctx.fillRect(x + CELL - 10, y + CELL / 2 - 12, 6, 24);
        return;
      }
      // closed boom barrier with hazard stripes
      ctx.save();
      ctx.fillStyle = '#1a1a22';
      roundRect(ctx, x + 6, y + CELL / 2 - 9, CELL - 12, 18, 5);
      ctx.fill();
      ctx.fillStyle = '#ffce3a';
      for (var i = 0; i < 5; i++) {
        ctx.beginPath();
        var sx = x + 8 + i * ((CELL - 16) / 5);
        ctx.moveTo(sx, y + CELL / 2 - 8);
        ctx.lineTo(sx + 7, y + CELL / 2 - 8);
        ctx.lineTo(sx + 2, y + CELL / 2 + 8);
        ctx.lineTo(sx - 5, y + CELL / 2 + 8);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    function drawExit() {
      if (!model.exit) return;
      var x = cx(model.exit.c), y = cy(model.exit.r);
      var pulse = 0.5 + 0.5 * Math.sin(state.t * 0.08);
      ctx.save();
      ctx.shadowColor = 'rgba(67, 233, 123, ' + (0.5 + 0.4 * pulse) + ')';
      ctx.shadowBlur = 18;
      ctx.fillStyle = 'rgba(67, 233, 123, 0.85)';
      roundRect(ctx, x + 6, y + 6, CELL - 12, CELL - 12, 10);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#0a2738';
      ctx.font = (CELL * 0.42) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⛵', x + CELL / 2, y + CELL / 2 + 2);
    }

    function drawBot(b) {
      if (b.rescued) {
        // healed: calm green bot, smiling, no glitch jitter or "?"
        var hx = cx(b.c), hy = cy(b.r);
        ctx.save();
        ctx.fillStyle = '#43e97b';
        ctx.shadowColor = 'rgba(67, 233, 123, 0.6)';
        ctx.shadowBlur = 10;
        roundRect(ctx, hx + 12, hy + 16, CELL - 24, CELL - 28, 8);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#0a2738';
        ctx.beginPath(); ctx.arc(hx + CELL / 2 - 9, hy + 30, 3, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(hx + CELL / 2 + 9, hy + 30, 3, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#0a2738'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(hx + CELL / 2, hy + 34, 8, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
        ctx.restore();
        return;
      }
      var jitter = Math.sin(state.t * 0.25 + b.c * 1.7) * 2;
      var x = cx(b.c) + jitter, y = cy(b.r);
      ctx.save();
      // glitch-red body
      ctx.fillStyle = '#e7402f';
      ctx.shadowColor = 'rgba(231, 64, 47, 0.7)';
      ctx.shadowBlur = 10;
      roundRect(ctx, x + 12, y + 16, CELL - 24, CELL - 28, 8);
      ctx.fill();
      ctx.shadowBlur = 0;
      // antenna
      ctx.strokeStyle = '#e7402f';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + CELL / 2, y + 16);
      ctx.lineTo(x + CELL / 2, y + 7);
      ctx.stroke();
      ctx.fillStyle = '#ffce3a';
      ctx.beginPath();
      ctx.arc(x + CELL / 2, y + 6, 3, 0, Math.PI * 2);
      ctx.fill();
      // eyes
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(x + CELL / 2 - 9, y + 30, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + CELL / 2 + 9, y + 30, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1a1a22';
      ctx.beginPath(); ctx.arc(x + CELL / 2 - 9, y + 30, 2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + CELL / 2 + 9, y + 30, 2, 0, Math.PI * 2); ctx.fill();
      // "?" thought
      ctx.fillStyle = '#fff';
      ctx.font = 'bold ' + (CELL * 0.32) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', x + CELL / 2, y + CELL - 14);
      ctx.restore();
    }

    // Reusable hull outline (rounded stern at -x, pointed bow at +x).
    function hullPath(L, W, insetL, insetW) {
      var hl = L - insetL, hw = W - insetW;
      ctx.beginPath();
      ctx.moveTo(-hl * 0.82, -hw);
      ctx.quadraticCurveTo(hl * 0.55, -hw * 1.10, hl, 0);          // stern-top -> bow tip
      ctx.quadraticCurveTo(hl * 0.55, hw * 1.10, -hl * 0.82, hw);  // bow tip -> stern-bottom
      ctx.quadraticCurveTo(-hl * 1.14, 0, -hl * 0.82, -hw);        // round the stern
      ctx.closePath();
    }

    function drawBoat() {
      var bob = Math.sin(state.t * 0.06) * 1.5;
      var L = CELL * 0.58;   // half length (bow points +x at angle 0)
      var W = CELL * 0.30;   // half width
      ctx.save();
      ctx.translate(state.px, state.py + bob);
      ctx.rotate(state.angle);

      // wake foam trailing off the stern
      ctx.fillStyle = 'rgba(220, 245, 255, 0.16)';
      for (var wf = 0; wf < 3; wf++) {
        ctx.beginPath();
        ctx.arc(-L - 6 - wf * 7, 0, 7 - wf * 1.6, 0, Math.PI * 2);
        ctx.fill();
      }

      // oars — the key top-down "rowboat" cue
      ctx.strokeStyle = '#7a4f25';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.fillStyle = '#caa06a';
      ctx.beginPath(); ctx.moveTo(-L * 0.10, -W * 0.5); ctx.lineTo(-L * 0.55, -W * 1.7); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(-L * 0.60, -W * 1.9, 7, 4, -0.6, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-L * 0.10,  W * 0.5); ctx.lineTo(-L * 0.55,  W * 1.7); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(-L * 0.60,  W * 1.9, 7, 4, 0.6, 0, Math.PI * 2); ctx.fill();

      // hull: shaded gradient fill + dark outline
      var hg = ctx.createLinearGradient(0, -W, 0, W);
      hg.addColorStop(0, '#bd8550');
      hg.addColorStop(0.5, '#9c6633');
      hg.addColorStop(1, '#7d4f27');
      ctx.fillStyle = hg;
      ctx.strokeStyle = '#46290f';
      ctx.lineWidth = 3;
      hullPath(L, W, 0, 0);
      ctx.fill();
      ctx.stroke();

      // inner deck (lighter wood) + plank seams
      ctx.fillStyle = '#ceac74';
      hullPath(L, W, 7, 6);
      ctx.fill();
      ctx.strokeStyle = 'rgba(90, 58, 26, 0.45)';
      ctx.lineWidth = 1.5;
      for (var pk = -1; pk <= 1; pk++) {
        ctx.beginPath();
        ctx.moveTo(-L * 0.68, pk * (W * 0.42));
        ctx.lineTo(L * 0.74, pk * (W * 0.42));
        ctx.stroke();
      }

      // seat plank (thwart) the kid sits on
      ctx.fillStyle = '#8a5a2b';
      ctx.fillRect(-L * 0.20, -W * 0.80, L * 0.20, W * 1.60);

      // seated kid, facing the bow (+x): shirt body, then hair, then face
      ctx.fillStyle = '#43e97b';
      roundRect(ctx, -L * 0.30, -W * 0.45, L * 0.36, W * 0.90, 6);
      ctx.fill();
      ctx.fillStyle = '#e3a86b';                                  // hair
      ctx.beginPath(); ctx.arc(L * 0.04, 0, W * 0.50, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fce8b8';                                  // face/skin
      ctx.beginPath(); ctx.arc(L * 0.07, 0, W * 0.38, 0, Math.PI * 2); ctx.fill();

      ctx.restore();
    }

    function drawScene() {
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      drawWater();
      drawDocks();
      model.gates.forEach(drawGate);
      drawExit();
      model.bots.forEach(drawBot);
      drawBoat();
    }

    function tick() {
      if (!state.running) return;
      state.t++;
      // count-up timer, paused while a quiz modal is open (feeds Phase 4 stars)
      if (!state.paused) {
        state.timeMs += 1000 / 60;
        var s = Math.floor(state.timeMs / 1000);
        if (s !== state.lastSec) { hud.setTimer(s); state.lastSec = s; }
      }
      updateBoat();
      checkBotCollision();
      drawScene();
      requestAnimationFrame(tick);
    }

    function cleanup() {
      state.running = false;
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
      var gr = document.getElementById('gg-root');
      if (gr) gr.classList.remove('gg-hh-active');
      try { localStorage.removeItem('gg.activeIsland'); } catch (e) {}
      if (window.GG && window.GG._activeCleanup === cleanup) window.GG._activeCleanup = null;
    }

    // Register cleanup so the router's doExit() (Back-to-App / browser-back)
    // can tear the level down before hiding gg-root.
    window.GG._activeCleanup = cleanup;

    // NOTE: onComplete is intentionally NOT called in Phase 1 — there is no
    // win path yet. Exit happens via the persistent Back-to-App button.

    requestAnimationFrame(tick);
  }

  return { render: render };
})();
