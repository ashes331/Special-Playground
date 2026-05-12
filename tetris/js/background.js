'use strict';

(function () {
  const canvas = document.getElementById('bg-canvas');
  const ctx    = canvas.getContext('2d');

  let W, H;
  let columns  = [];
  let buildings = [];

  const FONT_SIZE = 14;

  // ── 비 초기화 ─────────────────────────────────────────────
  function initRain() {
    const count = Math.floor(W / FONT_SIZE);
    columns = [];
    for (let i = 0; i < count; i++) {
      columns.push({
        x:     i * FONT_SIZE + FONT_SIZE / 2,
        y:     Math.random() * -H * 1.5,
        speed: 60 + Math.random() * 80,   // px/sec
      });
    }
  }

  // ── 도시 빌딩 ─────────────────────────────────────────────
  function buildCity() {
    const list = [];

    // 뒷 레이어 (y = 화면 아래 70~80%)
    const back = [
      [.00,.72,.07],[.06,.65,.05],[.10,.70,.08],[.17,.62,.06],
      [.22,.68,.09],[.30,.60,.05],[.34,.66,.07],[.40,.64,.06],
      [.45,.72,.08],[.52,.60,.05],[.56,.66,.07],[.62,.70,.09],
      [.70,.62,.05],[.74,.68,.08],[.81,.64,.06],[.86,.72,.07],
      [.92,.63,.08],
    ];
    back.forEach(([x,y,w]) => list.push({ x, y, w, h:1-y, layer:0 }));

    // 앞 레이어 (y = 화면 아래 76~86%)
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

    // 보라 ambient
    const g1 = ctx.createRadialGradient(W*.7, H*.2, 0, W*.7, H*.2, W*.4);
    g1.addColorStop(0, 'rgba(180,76,255,0.07)');
    g1.addColorStop(1, 'transparent');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, W, H);

    // 지평선 핑크 글로우
    const g2 = ctx.createLinearGradient(0, H*.65, 0, H*.82);
    g2.addColorStop(0, 'rgba(255,0,110,0.08)');
    g2.addColorStop(1, 'transparent');
    ctx.fillStyle = g2;
    ctx.fillRect(0, H*.65, W, H*.17);
  }

  // ── 빌딩 그리기 ───────────────────────────────────────────
  function drawBuildings() {
    buildings.forEach(b => {
      const bx = b.x * W;
      const by = b.y * H;
      const bw = b.w * W;
      const bh = b.h * H;

      ctx.fillStyle = b.layer === 0 ? '#090e1a' : '#060b13';
      ctx.fillRect(bx, by, bw, bh);

      // 창문
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

  // ── 비 그리기 (수직, 아래로 페이드) ─────────────────────
  function drawRain(dt) {
    ctx.font = `${FONT_SIZE}px monospace`;
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'top';

    const fadeEnd = H * 0.60;  // 이 y 이하는 완전 투명

    columns.forEach(col => {
      // 위치 업데이트
      col.y += col.speed * dt / 1000;
      if (col.y > H) {
        col.y     = -FONT_SIZE * (1 + Math.random() * 8);
        col.speed = 60 + Math.random() * 80;
      }

      // 페이드: y=0 → alpha 최대, y=fadeEnd → alpha 0
      const alpha = Math.max(0, 1 - col.y / fadeEnd);
      if (alpha <= 0) return;

      const ch = Math.random() > 0.5 ? '1' : '0';

      // 헤드
      ctx.globalAlpha = alpha * 0.9;
      ctx.fillStyle   = '#dfffdf';
      ctx.fillText(ch, col.x, col.y);

      // 꼬리 1
      ctx.globalAlpha = alpha * 0.45;
      ctx.fillStyle   = '#00ff41';
      ctx.fillText(Math.random() > 0.5 ? '1' : '0', col.x, col.y - FONT_SIZE);

      // 꼬리 2
      ctx.globalAlpha = alpha * 0.18;
      ctx.fillStyle   = '#00aa28';
      ctx.fillText(Math.random() > 0.5 ? '1' : '0', col.x, col.y - FONT_SIZE * 2);

      ctx.globalAlpha = 1;
    });
  }

  // ── 메인 루프 ─────────────────────────────────────────────
  let lastT = 0;

  function loop(t) {
    const dt = Math.min(t - lastT, 50);
    lastT = t;

    ctx.clearRect(0, 0, W, H);
    drawBackground();
    drawBuildings();
    drawRain(dt);

    requestAnimationFrame(loop);
  }

  // ── 리사이즈 ──────────────────────────────────────────────
  function resize() {
    W         = canvas.width  = window.innerWidth;
    H         = canvas.height = window.innerHeight;
    buildings = buildCity();
    initRain();
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(loop);
})();
