// GAME/screens/bias-breaker-boss.js — Unfair Gatekeeper. Canvas-drawn.
window.GG = window.GG || {};

GG.biasBreakerBoss = (function() {
  var WIDTH  = 130;
  var HEIGHT = 220;

  function draw(ctx, state) {
    var x = state.x;
    var y = state.y + Math.sin(state.animTime * 0.06) * 4;
    var hp = state.hp;
    var flash = Math.max(0, Math.min(1, state.hitFlash || 0));

    ctx.save();

    if (state.defeated) {
      var t = state.animTime - (state.defeatedAt || state.animTime);
      var alpha = Math.max(0, 1 - t / 60);
      ctx.globalAlpha = alpha;
      for (var i = 0; i < 20; i++) {
        var bitX = x + (i * 7) % WIDTH;
        var bitY = y + ((i * 13) % HEIGHT) - t * (1 + (i % 4));
        ctx.fillStyle = '#5b2c87';
        ctx.fillRect(bitX, bitY, 6, 6);
      }
      ctx.restore();
      return;
    }

    drawSegment(ctx, x + 10, y + 130, WIDTH - 20, 70, hp >= 1, flash);
    drawSegment(ctx, x +  5, y +  60, WIDTH - 10, 75, hp >= 2, flash);
    drawSegment(ctx, x + 15, y,       WIDTH - 30, 60, hp >= 3, flash);

    var eyeGlow = 0.4 + (hp / 3) * 0.6;
    drawXEye(ctx, x + 35,         y + 22, eyeGlow);
    drawXEye(ctx, x + WIDTH - 35, y + 22, eyeGlow);

    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('UNFAIR', x + WIDTH / 2, y + 100);

    ctx.restore();
  }

  function drawSegment(ctx, x, y, w, h, intact, flash) {
    if (flash > 0) {
      ctx.shadowColor = 'rgba(245, 87, 108, ' + flash + ')';
      ctx.shadowBlur = 24 * flash;
    } else {
      ctx.shadowBlur = 0;
    }
    ctx.fillStyle = intact ? '#5b2c87' : '#2c1742';
    ctx.beginPath();
    roundRect(ctx, x, y, w, h, 12);
    ctx.fill();
    ctx.strokeStyle = intact ? '#ffd700' : '#4a3060';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    roundRect(ctx, x, y, w, h, 12);
    ctx.stroke();
    if (!intact) {
      ctx.strokeStyle = 'rgba(245, 87, 108, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.3, y + 4);
      ctx.lineTo(x + w * 0.5, y + h * 0.5);
      ctx.lineTo(x + w * 0.2, y + h - 4);
      ctx.moveTo(x + w * 0.6, y + 2);
      ctx.lineTo(x + w * 0.7, y + h * 0.6);
      ctx.lineTo(x + w * 0.85, y + h - 2);
      ctx.stroke();
    }
  }

  function drawXEye(ctx, cx, cy, glow) {
    ctx.save();
    ctx.shadowColor = 'rgba(245, 87, 108, ' + glow + ')';
    ctx.shadowBlur = 12 * glow;
    ctx.strokeStyle = 'rgb(' + Math.round(245 * glow + 60) + ', 87, 108)';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 8, cy - 8); ctx.lineTo(cx + 8, cy + 8);
    ctx.moveTo(cx + 8, cy - 8); ctx.lineTo(cx - 8, cy + 8);
    ctx.stroke();
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

  return { draw: draw, WIDTH: WIDTH, HEIGHT: HEIGHT };
})();
