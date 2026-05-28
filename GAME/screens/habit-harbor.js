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

    rootEl.appendChild(stageEl);

    var ctx = canvas.getContext('2d');
    var state = { running: true, t: 0 };

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

    function drawWall(c, r) {
      var x = cx(c) + 2, y = cy(r) + 2, w = CELL - 4, h = CELL - 4;
      var g = ctx.createLinearGradient(0, y, 0, y + h);
      g.addColorStop(0, '#7c5734');
      g.addColorStop(1, '#563c22');
      ctx.fillStyle = g;
      roundRect(ctx, x, y, w, h, 7);
      ctx.fill();
      // horizontal plank seams
      ctx.strokeStyle = 'rgba(38, 24, 11, 0.5)';
      ctx.lineWidth = 1.5;
      for (var i = 1; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(x + 4, y + (h / 3) * i);
        ctx.lineTo(x + w - 4, y + (h / 3) * i);
        ctx.stroke();
      }
      // top plank highlight + crisp outline
      ctx.fillStyle = 'rgba(255, 226, 172, 0.16)';
      ctx.fillRect(x + 5, y + 4, w - 10, 4);
      ctx.strokeStyle = 'rgba(18, 11, 5, 0.5)';
      ctx.lineWidth = 1.5;
      roundRect(ctx, x, y, w, h, 7);
      ctx.stroke();
    }

    function drawGate(gate) {
      var x = cx(gate.c), y = cy(gate.r);
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
      if (!model.spawn) return;
      var x = cx(model.spawn.c), y = cy(model.spawn.r);
      var bob = Math.sin(state.t * 0.06) * 1.5;
      var L = CELL * 0.58;   // half length (bow points +x, into the maze)
      var W = CELL * 0.30;   // half width
      ctx.save();
      ctx.translate(x + CELL / 2, y + CELL / 2 + bob);

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
      for (var r = 0; r < ROWS; r++) {
        for (var c = 0; c < COLS; c++) {
          if (model.grid[r][c] === '#') drawWall(c, r);
        }
      }
      model.gates.forEach(drawGate);
      drawExit();
      model.bots.forEach(drawBot);
      drawBoat();
    }

    function tick() {
      if (!state.running) return;
      state.t++;
      drawScene();
      requestAnimationFrame(tick);
    }

    function cleanup() {
      state.running = false;
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
