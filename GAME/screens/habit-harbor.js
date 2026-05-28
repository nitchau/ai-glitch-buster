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
      var x = cx(c), y = cy(r);
      ctx.fillStyle = '#6b4a2b';                 // dock wood
      roundRect(ctx, x + 2, y + 2, CELL - 4, CELL - 4, 8);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 220, 160, 0.18)'; // top plank highlight
      ctx.fillRect(x + 6, y + 6, CELL - 12, 6);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 2, y + 2, CELL - 4, CELL - 4);
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

    function drawBoat() {
      if (!model.spawn) return;
      var x = cx(model.spawn.c), y = cy(model.spawn.r);
      var bob = Math.sin(state.t * 0.06) * 2;
      ctx.save();
      ctx.translate(x + CELL / 2, y + CELL / 2 + bob);
      // hull (pointed bow facing right)
      ctx.fillStyle = '#b5793b';
      ctx.beginPath();
      ctx.moveTo(-CELL * 0.32, -CELL * 0.18);
      ctx.lineTo(CELL * 0.22, -CELL * 0.18);
      ctx.lineTo(CELL * 0.40, 0);
      ctx.lineTo(CELL * 0.22, CELL * 0.18);
      ctx.lineTo(-CELL * 0.32, CELL * 0.18);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,230,180,0.25)';
      ctx.fillRect(-CELL * 0.30, -CELL * 0.16, CELL * 0.5, 5);
      // seated kid (top-down: shirt + head)
      ctx.fillStyle = '#43e97b';
      ctx.beginPath(); ctx.arc(-CELL * 0.02, 0, CELL * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fce8b8';
      ctx.beginPath(); ctx.arc(-CELL * 0.02, 0, CELL * 0.07, 0, Math.PI * 2); ctx.fill();
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
