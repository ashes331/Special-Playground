'use strict';

(function () {
  const canvas = document.getElementById('bg-canvas');
  const ctx    = canvas.getContext('2d');

  let W, H;
  let drops     = [];   // 개별 빗방울
  let buildings = [];

  const FONT_SIZE   = 14;
  const SPAWN_INTERVAL = 400; // ms마다 새 그룹 생성
  let   spawnTimer  = 0;

  // ── 그룹 생성 (7~15개 랜덤) ──────────────────────────────
  function spawnGroup() {
    const count = 7 + Math.floor(Math.random() * 9); // 7~15
    for (let i = 0; i < count; i++) {
      const x = Math.random() * W;
      drops.push({
        x,
        y:      -FONT_SIZE * (1 + Math.random() * 6),
        speed:  55 + Math.random() * 70,   // px/sec
        ch:     Math.random() > 0.5 ? '1' : '0',  // 고정 숫자
        chTimer: 0,
        chInterval: 800 + Math.random() * 1200,    // 0.8~2초마다 변경
      });
    }
  }

  // ── 도시 빌딩 ─────────────────────────────────────────────
  function buildCity() {
    const list = [];
    const back = [
      [.00,.72,.07],[.06,.65,.05],[.10,.70,.08],[.17,.62,.06],
      [.22,.68,.09],[.30,.60,.05],[.34,.66,.07],[.40,.64,.06],
      [.45,.72,.08],[.52,.60,.05],[.56,.66,.07],[.62,.70,.09],
      [.70,.62,.05],[.74,.68,.08],[.81,.64,.06],[.86,.72,.07],
      [.92,.63,.08],
    ];
    back.forEach(([x,y,w]) => list.push({ x, y, w, h:1-y, layer:0 }));

    const front = [
      [.00,.80,.09],[.08,.76,.07],[.14,.78,.10],[.23,.74,.08],
      [.30,.77,.11],[.40,.75,.09],[.48,.80,.07],[.54,.72,.12],
      [.65,.76,.08],[.72,.80,.10],[.81,.75,.09],[.89,.78,.11],
    ];
    front.forEach(([x,y,w]) => list.push({ x, y, w, h:1-y, layer:1 }));
    return list;
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

  // ── 빌딩 그리기 ───────────────────────────────────────────
  function drawBuildings() {
    buildings.forEach(b => {
      const bx = b.x * W, by = b.y * H;
      const bw = b.w * W, bh = b.h * H;

      ctx.fillStyle = b.layer === 0 ? '#090e1a' : '#060b13';
      ctx.fillRect(bx, by, bw, bh);

      const wW = Math.max(4, bw * 0.17);
      const wH = wW * 1.3;
      const cCols = Math.max(1, Math.floor((bw - wW) / (wW * 1.7)));
      const cRows = Math.max(1, Math.floor((bh * 0.68) / (wH * 1.6)));
      const colors = [
        'rgba(255,215,100,0.55)',
        'rgba(140,195,255,0.45)',
        'rgba(195,170,255,0.40)',
      ];

      for (let r = 0; r < cRows; r++) {
        for (let c = 0; c < cCols; c++) {
          const seed = (b.x * 997 + r * 19 + c * 37) % 100;
          if (seed < 55) {
            ctx.fillStyle = colors[seed % 3];
            ctx.fillRect(
              bx + wW * 0.6 + c * (wW * 1.7),
              by + wH * 0.6 + r * (wH * 1.6),
              wW, wH
            );
          }
        }
      }

      ctx.strokeStyle = 'rgba(20,50,90,0.3)';
      ctx.lineWidth   = 0.5;
      ctx.strokeRect(bx, by, bw, bh);
    });
  }

  // ── 비 업데이트 & 그리기 ──────────────────────────────────
  function updateRain(dt) {
    ctx.font         = `${FONT_SIZE}px monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';

    const fadeEnd = H * 0.58;

    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];

      // 위치 & 숫자 타이머 업데이트
      d.y         += d.speed * dt / 1000;
      d.chTimer   += dt;
      if (d.chTimer >= d.chInterval) {
        d.ch      = Math.random() > 0.5 ? '1' : '0';
        d.chTimer = 0;
      }

      // 화면 벗어나면 제거
      if (d.y > H) {
        drops.splice(i, 1);
        continue;
      }

      // 페이드
      const alpha = Math.max(0, 1 - d.y / fadeEnd);
      if (alpha <= 0) continue;

      // 헤드
      ctx.globalAlpha = alpha * 0.88;
      ctx.fillStyle   = '#dfffdf';
      ctx.fillText(d.ch, d.x, d.y);

      // 꼬리 1
      ctx.globalAlpha = alpha * 0.42;
      ctx.fillStyle   = '#00ff41';
      ctx.fillText(d.ch, d.x, d.y - FONT_SIZE);

      // 꼬리 2
      ctx.globalAlpha = alpha * 0.16;
      ctx.fillStyle   = '#00aa28';
      ctx.fillText(d.ch, d.x, d.y - FONT_SIZE * 2);

      ctx.globalAlpha = 1;
    }
  }

  // ── 메인 루프 ─────────────────────────────────────────────
  let lastT = 0;

  function loop(t) {
    const dt = Math.min(t - lastT, 50);
    lastT = t;

    // 그룹 스폰
    spawnTimer += dt;
    if (spawnTimer >= SPAWN_INTERVAL) {
      spawnGroup();
      spawnTimer = 0;
    }

    ctx.clearRect(0, 0, W, H);
    drawBackground();
    drawBuildings();
    updateRain(dt);

    requestAnimationFrame(loop);
  }

  // ── 리사이즈 ──────────────────────────────────────────────
  function resize() {
    W         = canvas.width  = window.innerWidth;
    H         = canvas.height = window.innerHeight;
    buildings = buildCity();
    drops     = [];
    spawnTimer = SPAWN_INTERVAL; // 즉시 첫 그룹 생성
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(loop);
})();
