'use strict';

(function () {
  const canvas = document.getElementById('bg-canvas');
  const ctx    = canvas.getContext('2d');

  let W, H;
  let streams  = [];

  const FONT_SIZE      = 14;
  const SPAWN_INTERVAL = 180;
  let   spawnTimer     = 0;

  // ── 스트림 생성 ───────────────────────────────────────────
  function createStream() {
    const len   = 7 + Math.floor(Math.random() * 9);
    const chars = Array.from({ length: len }, () => Math.random() > 0.5 ? '1' : '0');
    return {
      x:           20 + Math.random() * (W - 40),
      y:           -FONT_SIZE * (len + 2 + Math.random() * 4),
      speed:       50 + Math.random() * 60,
      chars, len,
      chTimer:     0,
      chInterval:  400 + Math.random() * 600,
    };
  }

  function initStreams() {
    streams = [];
    const count = Math.floor(W / 35);
    for (let i = 0; i < count; i++) {
      const s = createStream();
      s.y = Math.random() * H * 0.55;
      streams.push(s);
    }
  }

  // ── 배경 하늘 ─────────────────────────────────────────────
  function drawBackground() {
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0,   '#020610');
    sky.addColorStop(0.5, '#05101e');
    sky.addColorStop(1,   '#0a1628');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    const g1 = ctx.createRadialGradient(W*.7, H*.2, 0, W*.7, H*.2, W*.4);
    g1.addColorStop(0, 'rgba(180,76,255,0.07)');
    g1.addColorStop(1, 'transparent');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, W, H);

    const g2 = ctx.createLinearGradient(0, H*.65, 0, H*.82);
    g2.addColorStop(0, 'rgba(255,0,110,0.08)');
    g2.addColorStop(1, 'transparent');
    ctx.fillStyle = g2;
    ctx.fillRect(0, H*.65, W, H*.17);
  }

  // ── 스트림 업데이트 & 그리기 ──────────────────────────────
  function updateStreams(dt) {
    ctx.font         = `bold ${FONT_SIZE}px monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';

    const fadeEnd = H * 0.60;

    for (let i = streams.length - 1; i >= 0; i--) {
      const s = streams[i];

      s.y += s.speed * dt / 1000;

      s.chTimer += dt;
      if (s.chTimer >= s.chInterval) {
        const changeCount = 2 + Math.floor(Math.random() * 2);
        for (let k = 0; k < changeCount; k++) {
          const idx = Math.floor(Math.random() * s.len);
          s.chars[idx] = s.chars[idx] === '1' ? '0' : '1';
        }
        s.chTimer    = 0;
        s.chInterval = 400 + Math.random() * 600;
      }

      if (s.y > H + s.len * FONT_SIZE) {
        streams.splice(i, 1);
        continue;
      }

      for (let j = 0; j < s.len; j++) {
        const charY = s.y + j * FONT_SIZE;
        if (charY < -FONT_SIZE || charY > H) continue;

        const fadeAlpha = Math.max(0, 1 - charY / fadeEnd);
        if (fadeAlpha <= 0) continue;

        const brightness = 1 - (j / s.len) * 0.75;

        if (j === 0) {
          ctx.globalAlpha = fadeAlpha * 0.95;
          ctx.fillStyle   = '#e0ffe0';
        } else if (j < 3) {
          ctx.globalAlpha = fadeAlpha * brightness * 0.75;
          ctx.fillStyle   = '#00ff41';
        } else {
          ctx.globalAlpha = fadeAlpha * brightness * 0.45;
          ctx.fillStyle   = '#00bb30';
        }

        ctx.fillText(s.chars[j], s.x, charY);
      }

      ctx.globalAlpha = 1;
    }
  }

  // ── 메인 루프 ─────────────────────────────────────────────
  let lastT = 0;

  function loop(t) {
    const dt = Math.min(t - lastT, 50);
    lastT = t;

    spawnTimer += dt;
    if (spawnTimer >= SPAWN_INTERVAL) {
      streams.push(createStream());
      spawnTimer = 0;
    }

    ctx.clearRect(0, 0, W, H);
    drawBackground();
    updateStreams(dt);

    requestAnimationFrame(loop);
  }

  // ── 리사이즈 ──────────────────────────────────────────────
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    initStreams();
    spawnTimer = 0;
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(loop);
})();
