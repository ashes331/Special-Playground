'use strict';

(function () {
  const canvas = document.getElementById('bg-canvas');
  const ctx    = canvas.getContext('2d');

  let W, H;

  // ── 도시 실루엣 데이터 ──────────────────────────────────────
  // 각 빌딩: [x비율, y비율(위치), w비율, h비율, 네온색]
  function buildCity() {
    return [
      // 뒷 레이어 (어두운 실루엣)
      { x:.00, y:.55, w:.07, h:.45, layer:0 },
      { x:.06, y:.42, w:.05, h:.58, layer:0 },
      { x:.10, y:.50, w:.08, h:.50, layer:0 },
      { x:.17, y:.38, w:.06, h:.62, layer:0 },
      { x:.22, y:.48, w:.09, h:.52, layer:0 },
      { x:.30, y:.35, w:.05, h:.65, layer:0 },
      { x:.34, y:.45, w:.07, h:.55, layer:0 },
      { x:.40, y:.40, w:.06, h:.60, layer:0 },
      { x:.45, y:.52, w:.08, h:.48, layer:0 },
      { x:.52, y:.36, w:.05, h:.64, layer:0 },
      { x:.56, y:.44, w:.07, h:.56, layer:0 },
      { x:.62, y:.50, w:.09, h:.50, layer:0 },
      { x:.70, y:.38, w:.05, h:.62, layer:0 },
      { x:.74, y:.46, w:.08, h:.54, layer:0 },
      { x:.81, y:.42, w:.06, h:.58, layer:0 },
      { x:.86, y:.55, w:.07, h:.45, layer:0 },
      { x:.92, y:.40, w:.08, h:.60, layer:0 },

      // 앞 레이어 (진한 실루엣)
      { x:.00, y:.62, w:.09, h:.38, layer:1 },
      { x:.08, y:.55, w:.07, h:.45, layer:1 },
      { x:.14, y:.60, w:.10, h:.40, layer:1 },
      { x:.23, y:.52, w:.08, h:.48, layer:1 },
      { x:.30, y:.58, w:.11, h:.42, layer:1 },
      { x:.40, y:.54, w:.09, h:.46, layer:1 },
      { x:.48, y:.60, w:.07, h:.40, layer:1 },
      { x:.54, y:.50, w:.12, h:.50, layer:1 },
      { x:.65, y:.56, w:.08, h:.44, layer:1 },
      { x:.72, y:.62, w:.10, h:.38, layer:1 },
      { x:.81, y:.55, w:.09, h:.45, layer:1 },
      { x:.89, y:.60, w:.11, h:.40, layer:1 },
    ];
  }

  // 네온 사인 위치들 [x비율, y비율, 색상, 텍스트]
  const NEON_SIGNS = [
    { rx:.08,  ry:.50, color:'#ff006e', label:'BAR'    },
    { rx:.20,  ry:.44, color:'#00d4ff', label:'HOTEL'  },
    { rx:.38,  ry:.46, color:'#ffe600', label:'24H'    },
    { rx:.55,  ry:.52, color:'#ff006e', label:'CLUB'   },
    { rx:.70,  ry:.42, color:'#00ff88', label:'OPEN'   },
    { rx:.85,  ry:.48, color:'#b44cff', label:'CAFE'   },
  ];

  // ── 빗방울 (바이너리) ──────────────────────────────────────
  const FONT_SIZE = 13;
  let columns = [];

  function initRain() {
    const cols = Math.floor(W / FONT_SIZE);
    columns = Array.from({ length: cols }, () => ({
      y:      Math.random() * -H,
      speed:  1.2 + Math.random() * 2.5,
      opacity: 0.15 + Math.random() * 0.4,
    }));
  }

  // ── 네온 깜빡임 ────────────────────────────────────────────
  const neonState = NEON_SIGNS.map(() => ({ flicker: 1, timer: Math.random() * 200 }));

  function updateNeon(dt) {
    neonState.forEach((s, i) => {
      s.timer -= dt;
      if (s.timer <= 0) {
        s.flicker = Math.random() > 0.15 ? 1 : (0.3 + Math.random() * 0.5);
        s.timer = 80 + Math.random() * 400;
      }
    });
  }

  // ── 그리기 ────────────────────────────────────────────────
  function drawBackground() {
    // 하늘: 깊은 도시 밤하늘 그라디언트
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.75);
    sky.addColorStop(0,   '#020610');
    sky.addColorStop(0.4, '#050d1f');
    sky.addColorStop(1,   '#0a1628');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // 달빛 / 도시 ambient glow
    const glow = ctx.createRadialGradient(W * 0.72, H * 0.18, 0, W * 0.72, H * 0.18, W * 0.35);
    glow.addColorStop(0,   'rgba(180,76,255,0.07)');
    glow.addColorStop(0.5, 'rgba(0,212,255,0.04)');
    glow.addColorStop(1,   'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // 지평선 네온 번짐
    const horizon = ctx.createLinearGradient(0, H * 0.5, 0, H * 0.75);
    horizon.addColorStop(0,   'rgba(255,0,110,0.06)');
    horizon.addColorStop(0.5, 'rgba(0,212,255,0.04)');
    horizon.addColorStop(1,   'rgba(0,0,0,0)');
    ctx.fillStyle = horizon;
    ctx.fillRect(0, H * 0.5, W, H * 0.3);
  }

  function drawBuildings(buildings) {
    buildings.forEach(b => {
      const bx = b.x * W;
      const by = b.y * H;
      const bw = b.w * W;
      const bh = b.h * H;

      // 빌딩 본체
      ctx.fillStyle = b.layer === 0 ? '#080d18' : '#050a12';
      ctx.fillRect(bx, by, bw, bh);

      // 빌딩 창문 (랜덤 불빛)
      const winW = bw * 0.18, winH = winW * 1.3;
      const cols = Math.floor(bw / (winW + winW * 0.6));
      const rows = Math.floor(bh * 0.7 / (winH + winH * 0.5));
      const winColors = ['rgba(255,220,120,0.6)', 'rgba(150,200,255,0.5)', 'rgba(200,180,255,0.4)'];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          // 시드 기반으로 창문 켜짐 결정 (매 프레임 바뀌지 않도록)
          const seed = (b.x * 1000 + r * 17 + c * 31) % 100;
          if (seed < 55) {
            ctx.fillStyle = winColors[seed % winColors.length];
            const wx = bx + winW * 0.5 + c * (winW + winW * 0.6);
            const wy = by + winH * 0.5 + r * (winH + winH * 0.5);
            ctx.fillRect(wx, wy, winW, winH);
          }
        }
      }

      // 빌딩 윤곽 (옅은 테두리)
      ctx.strokeStyle = b.layer === 0 ? 'rgba(30,60,100,0.3)' : 'rgba(20,40,80,0.5)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(bx, by, bw, bh);
    });
  }

  function drawNeonSigns(t) {
    NEON_SIGNS.forEach((sign, i) => {
      const sx = sign.rx * W;
      const sy = sign.ry * H;
      const flicker = neonState[i].flicker;

      ctx.save();
      ctx.globalAlpha = flicker;

      // 외부 글로우
      ctx.shadowColor  = sign.color;
      ctx.shadowBlur   = 18 * flicker;
      ctx.strokeStyle  = sign.color;
      ctx.lineWidth    = 1.5;

      const tw = sign.label.length * 9 + 12;
      const th = 18;
      ctx.strokeRect(sx - tw/2, sy - th/2, tw, th);

      // 텍스트
      ctx.fillStyle   = sign.color;
      ctx.font        = 'bold 9px monospace';
      ctx.textAlign   = 'center';
      ctx.textBaseline= 'middle';
      ctx.fillText(sign.label, sx, sy);

      ctx.shadowBlur  = 0;
      ctx.restore();
    });
  }

  function drawRain(dt) {
    ctx.font = `${FONT_SIZE}px monospace`;

    columns.forEach(col => {
      col.y += col.speed * dt * 0.06;
      if (col.y > H) {
        col.y     = -FONT_SIZE * (2 + Math.random() * 10);
        col.speed = 1.2 + Math.random() * 2.5;
      }

      // 헤드 (밝은 흰색)
      ctx.globalAlpha = col.opacity * 1.5;
      ctx.fillStyle   = '#ffffff';
      ctx.fillText(Math.random() > 0.5 ? '1' : '0', col.y % W, col.y);

      // 꼬리 (초록)
      ctx.globalAlpha = col.opacity * 0.6;
      ctx.fillStyle   = '#00ff41';
      ctx.fillText(Math.random() > 0.5 ? '1' : '0', col.y % W, col.y - FONT_SIZE);

      ctx.globalAlpha = col.opacity * 0.25;
      ctx.fillStyle   = '#00aa28';
      ctx.fillText(Math.random() > 0.5 ? '1' : '0', col.y % W, col.y - FONT_SIZE * 2);

      ctx.globalAlpha = 1;
    });
  }

  // ── 메인 루프 ─────────────────────────────────────────────
  let lastT = 0;
  const buildings = buildCity();

  function loop(t) {
    const dt = t - lastT;
    lastT = t;

    ctx.clearRect(0, 0, W, H);
    updateNeon(dt);

    drawBackground();
    drawBuildings(buildings);
    drawNeonSigns(t);
    drawRain(dt);

    requestAnimationFrame(loop);
  }

  // ── 리사이즈 ──────────────────────────────────────────────
  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    initRain();
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(loop);
})();
