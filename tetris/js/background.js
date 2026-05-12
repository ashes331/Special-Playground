'use strict';

(function () {
  const canvas = document.getElementById('bg-canvas');
  const ctx    = canvas.getContext('2d');

  let W, H;

  // ── 빗방울 컬럼 ───────────────────────────────────────────
  const FONT_SIZE = 14;
  let columns = [];

  function initRain() {
    const cols = Math.floor(W / FONT_SIZE);
    columns = Array.from({ length: cols }, () => ({
      y:      Math.random() * -H,
      speed:  0.8 + Math.random() * 1.8,
    }));
  }

  // ── 도시 실루엣 ───────────────────────────────────────────
  function buildCity() {
    const buildings = [];
    // 뒷 레이어
    const back = [
      [.00,.82,.07],[.06,.76,.05],[.10,.80,.08],[.17,.72,.06],
      [.22,.78,.09],[.30,.70,.05],[.34,.76,.07],[.40,.74,.06],
      [.45,.82,.08],[.52,.70,.05],[.56,.76,.07],[.62,.80,.09],
      [.70,.72,.05],[.74,.78,.08],[.81,.74,.06],[.86,.82,.07],
      [.92,.73,.08],
    ];
    back.forEach(([x,y,w]) => buildings.push({ x, y, w, h: 1-y, layer:0 }));

    // 앞 레이어
    const front = [
      [.00,.88,.09],[.08,.84,.07],[.14,.86,.10],[.23,.82,.08],
      [.30,.85,.11],[.40,.83,.09],[.48,.87,.07],[.54,.80,.12],
      [.65,.84,.08],[.72,.88,.10],[.81,.83,.09],[.89,.86,.11],
    ];
    front.forEach(([x,y,w]) => buildings.push({ x, y, w, h: 1-y, layer:1 }));
    return buildings;
  }

  // ── 네온 사인 ─────────────────────────────────────────────
  const NEON_SIGNS = [
    { rx:.08,  ry:.87, color:'#ff006e', label:'BAR'   },
    { rx:.20,  ry:.80, color:'#00d4ff', label:'HOTEL' },
    { rx:.38,  ry:.82, color:'#ffe600', label:'24H'   },
    { rx:.55,  ry:.84, color:'#ff006e', label:'CLUB'  },
    { rx:.70,  ry:.79, color:'#00ff88', label:'OPEN'  },
    { rx:.85,  ry:.81, color:'#b44cff', label:'CAFE'  },
  ];
  const neonState = NEON_SIGNS.map(() => ({
    flicker: 1,
    timer: Math.random() * 200,
  }));

  function updateNeon(dt) {
    neonState.forEach(s => {
      s.timer -= dt;
      if (s.timer <= 0) {
        s.flicker = Math.random() > 0.15 ? 1 : (0.3 + Math.random() * 0.5);
        s.timer   = 80 + Math.random() * 400;
      }
    });
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
    const glow = ctx.createRadialGradient(W*.7, H*.2, 0, W*.7, H*.2, W*.4);
    glow.addColorStop(0,   'rgba(180,76,255,0.06)');
    glow.addColorStop(0.5, 'rgba(0,212,255,0.03)');
    glow.addColorStop(1,   'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // 지평선 네온 번짐
    const horizon = ctx.createLinearGradient(0, H*.72, 0, H*.88);
    horizon.addColorStop(0, 'rgba(255,0,110,0.07)');
    horizon.addColorStop(1, 'transparent');
    ctx.fillStyle = horizon;
    ctx.fillRect(0, H*.72, W, H*.16);
  }

  // ── 빌딩 그리기 ───────────────────────────────────────────
  function drawBuildings(buildings) {
    buildings.forEach(b => {
      const bx = b.x * W;
      const by = b.y * H;
      const bw = b.w * W;
      const bh = b.h * H;

      ctx.fillStyle = b.layer === 0 ? '#080d18' : '#050a12';
      ctx.fillRect(bx, by, bw, bh);

      // 창문
      const wW = bw * 0.18, wH = wW * 1.3;
      const cols = Math.max(1, Math.floor(bw / (wW * 1.6)));
      const rows = Math.max(1, Math.floor(bh * 0.65 / (wH * 1.5)));
      const winColors = ['rgba(255,220,120,0.55)','rgba(150,200,255,0.45)','rgba(200,180,255,0.38)'];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const seed = (b.x * 1000 + r * 17 + c * 31) % 100;
          if (seed < 58) {
            ctx.fillStyle = winColors[seed % winColors.length];
            const wx = bx + wW * 0.5 + c * (wW * 1.6);
            const wy = by + wH * 0.5 + r * (wH * 1.5);
            ctx.fillRect(wx, wy, wW, wH);
          }
        }
      }

      ctx.strokeStyle = b.layer === 0 ? 'rgba(30,60,100,0.25)' : 'rgba(20,40,80,0.4)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(bx, by, bw, bh);
    });
  }

  // ── 네온 사인 그리기 ──────────────────────────────────────
  function drawNeonSigns() {
    NEON_SIGNS.forEach((sign, i) => {
      const sx = sign.rx * W;
      const sy = sign.ry * H;
      const f  = neonState[i].flicker;

      ctx.save();
      ctx.globalAlpha  = f;
      ctx.shadowColor  = sign.color;
      ctx.shadowBlur   = 16 * f;
      ctx.strokeStyle  = sign.color;
      ctx.lineWidth    = 1.5;

      const tw = sign.label.length * 9 + 12;
      ctx.strokeRect(sx - tw/2, sy - 9, tw, 18);

      ctx.fillStyle    = sign.color;
      ctx.font         = 'bold 9px monospace';
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sign.label, sx, sy);

      ctx.shadowBlur = 0;
      ctx.restore();
    });
  }

  // ── 비 그리기 (수직, 아래로 페이드) ─────────────────────
  function drawRain(dt) {
    ctx.font = `${FONT_SIZE}px monospace`;

    columns.forEach((col, i) => {
      col.y += col.speed * dt * 0.05;
      if (col.y > H) {
        col.y     = -FONT_SIZE * (1 + Math.random() * 6);
        col.speed = 0.8 + Math.random() * 1.8;
      }

      const x = i * FONT_SIZE + FONT_SIZE / 2;

      // 아래로 갈수록 투명 (y=0 → 불투명, y=H*0.65 → 완전 투명)
      const fadeRatio = Math.max(0, 1 - col.y / (H * 0.62));
      if (fadeRatio <= 0) return;

      // 헤드 (흰색, 밝게)
      ctx.globalAlpha = fadeRatio * 0.85;
      ctx.fillStyle   = '#e0ffe0';
      ctx.fillText(Math.random() > 0.5 ? '1' : '0', x, col.y);

      // 꼬리 1
      ctx.globalAlpha = fadeRatio * 0.45;
      ctx.fillStyle   = '#00ff41';
      ctx.fillText(Math.random() > 0.5 ? '1' : '0', x, col.y - FONT_SIZE);

      // 꼬리 2
      ctx.globalAlpha = fadeRatio * 0.18;
      ctx.fillStyle   = '#00aa28';
      ctx.fillText(Math.random() > 0.5 ? '1' : '0', x, col.y - FONT_SIZE * 2);

      ctx.globalAlpha = 1;
    });
  }

  // ── 메인 루프 ─────────────────────────────────────────────
  let lastT    = 0;
  let buildings = [];

  function loop(t) {
    const dt = Math.min(t - lastT, 50);
    lastT = t;

    ctx.clearRect(0, 0, W, H);
    updateNeon(dt);
    drawBackground();
    drawBuildings(buildings);
    drawNeonSigns();
    drawRain(dt);

    requestAnimationFrame(loop);
  }

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
