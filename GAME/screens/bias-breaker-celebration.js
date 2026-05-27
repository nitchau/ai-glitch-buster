// GAME/screens/bias-breaker-celebration.js — Win screen with confetti + stars.
window.GG = window.GG || {};

GG.biasBreakerCelebration = (function() {

  function show(stageEl, opts) {
    var overlay = document.createElement('div');
    overlay.className = 'gg-bb-celebration';

    var confettiCanvas = document.createElement('canvas');
    confettiCanvas.className = 'gg-bb-confetti-canvas';
    confettiCanvas.width = stageEl.clientWidth;
    confettiCanvas.height = stageEl.clientHeight;

    var h1 = document.createElement('h1');
    h1.textContent = 'You freed the city!';
    overlay.appendChild(h1);

    var p = document.createElement('p');
    p.textContent = 'Bias Breaker is healed. Fair AI treats everyone the same — you helped Datapolis learn that.';
    overlay.appendChild(p);

    var starsEl = document.createElement('div');
    starsEl.className = 'gg-bb-celebration-stars';
    var filled = Math.max(1, Math.min(3, opts.stars || 1));
    var s = '';
    for (var i = 0; i < filled; i++) s += '⭐';
    for (var j = 0; j < 3 - filled; j++) s += '☆';
    starsEl.textContent = s;
    overlay.appendChild(starsEl);

    var unlocked = document.createElement('div');
    unlocked.className = 'gg-bb-celebration-unlocked';
    unlocked.textContent = '🌊 Bad-Habit Harbor unlocked!';
    overlay.appendChild(unlocked);

    var btn = document.createElement('button');
    btn.className = 'gg-button gg-secondary';
    btn.type = 'button';
    btn.textContent = '🏠 Back to Map';
    btn.addEventListener('click', function() {
      stopConfetti();
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (confettiCanvas.parentNode) confettiCanvas.parentNode.removeChild(confettiCanvas);
      opts.onContinue();
    });
    overlay.appendChild(btn);

    stageEl.appendChild(confettiCanvas);
    stageEl.appendChild(overlay);

    var handle = startConfetti(confettiCanvas);
    function stopConfetti() { cancelAnimationFrame(handle.raf); handle.alive = false; }
  }

  function startConfetti(canvas) {
    var ctx = canvas.getContext('2d');
    var w = canvas.width, h = canvas.height;
    var COLORS = ['#43e97b', '#ffd700', '#f5576c', '#38f9d7', '#f093fb'];
    var particles = [];
    for (var i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * w,
        y: -Math.random() * h,
        vx: (Math.random() - 0.5) * 3,
        vy: 2 + Math.random() * 4,
        size: 5 + Math.random() * 6,
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.2,
        color: COLORS[(Math.random() * COLORS.length) | 0]
      });
    }

    var handle = { raf: 0, alive: true };
    function tick() {
      if (!handle.alive) return;
      ctx.clearRect(0, 0, w, h);
      particles.forEach(function(p) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.rot += p.vr;
        if (p.y > h + 20) { p.y = -10; p.x = Math.random() * w; p.vy = 2; }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });
      handle.raf = requestAnimationFrame(tick);
    }
    handle.raf = requestAnimationFrame(tick);
    return handle;
  }

  return { show: show };
})();
