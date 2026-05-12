'use strict';

(function () {
  const canvas = document.getElementById('bg-canvas');
  const ctx    = canvas.getContext('2d');

  let W, H;
  let streams   = [];
  let buildings = [];

  const FONT_SIZE      = 14;
  const SPAWN_INTERVAL = 300;
  let   spawnTimer     = 0;

  // ── 스트림 생성 ───────────────────────────────────────────
  // 각 스트림: x 고정, 7~15개의 0/1이 세로로 붙어서 한 덩어리로 내려옴
  function createStream() {
    const len = 7 + Math.floor(Math.random() * 9); // 7~15
    const chars = Array.from({ length: len }, () => Math.random() > 0.5 ? '1' : '0');
    return {
      x:        20 + Math.random() * (W - 40),
      y:        -FONT_SIZE * (len + 2 + Math.random() * 4),
      speed:    50 + Math.random() * 60,
      chars,
      len,
      // 숫자 변경 타이머
      chTimer:    0,
      chInterval: 900 + Math.random() * 1100,
    };
  }

  // 초기 화면 채우기
  function initStreams() {
    streams = [];
    const count = Math.floor(W / 60);
    for (let i = 0; i < count; i++) {
      const s = createStream();
      s.y = Math.random() * H * 0.5; // 이미 내려오는 중으로 시작
      streams.push(s);
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

      // 창문
      const wW = Math.max(8, Math.min(bw * 0.20, 20));
      const wH = wW * 1.4;
      const gap = wW * 0.9;
      const cCols = Math.max(1, Math.floor((bw - gap) / (wW + gap)));
      const cRows = Math.max(2, Math.floor((bh * 0.72) / (wH + gap)));
      const padX  = (bw - cCols * (wW + gap) + gap) / 2;
      const padY  = wH * 0.5;
      const colors = [
        'rgba(255,215,100,0.70)',
        'rgba(140,195,255,0.60)',
        'rgba(195,170,255,0.55)',
      ];

      for (let r = 0; r < cRows; r++) {
        for (let c = 0; c < cCols; c++) {
          const seed = (b.x * 997 + r * 19 + c * 37) % 100;
          if (seed < 58) {
            ctx.fillStyle = colors[seed % 3];
            ctx.fillRect(
              bx + padX + c * (wW + gap),
              by + padY + r * (wH + gap),
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

  // ── 스트림 업데이트 & 그리기 ──────────────────────────────
  function updateStreams(dt) {
    ctx.font         = `bold ${FONT_SIZE}px monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'top';

    const fadeEnd = H * 0.60;

    for (let i = streams.length - 1; i >= 0; i--) {
      const s = streams[i];

      // 이동
      s.y += s.speed * dt / 1000;

      // 숫자 랜덤 변경 (천천히)
      s.chTimer += dt;
      if (s.chTimer >= s.chInterval) {
        const idx = Math.floor(Math.random() * s.len);
        s.chars[idx] = Math.random() > 0.5 ? '1' : '0';
        s.chTimer = 0;
      }

      // 스트림 전체가 화면 아래로 벗어나면 제거
      if (s.y > H + s.len * FONT_SIZE) {
        streams.splice(i, 1);
        continue;
      }

      // 각 글자 그리기
      for (let j = 0; j < s.len; j++) {
        const charY = s.y + j * FONT_SIZE;
        if (charY < -FONT_SIZE || charY > H) continue;

        // 페이드: 위쪽은 밝고 아래로 갈수록 투명
        const fadeAlpha = Math.max(0, 1 - charY / fadeEnd);
        if (fadeAlpha <= 0) continue;

        // 맨 위 글자(헤드)는 밝게, 아래로 갈수록 어둡게
        const posRatio = j / s.len;
        const brightness = 1 - posRatio * 0.75;

        if (j === 0) {
          // 헤드: 흰색
          ctx.globalAlpha = fadeAlpha * 0.95;
          ctx.fillStyle   = '#e0ffe0';
        } else if (j < 3) {
          // 상단: 밝은 초록
          ctx.globalAlpha = fadeAlpha * brightness * 0.75;
          ctx.fillStyle   = '#00ff41';
        } else {
          // 하단: 어두운 초록
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
    drawBuildings();
    updateStreams(dt);

    requestAnimationFrame(loop);
  }

  // ── 리사이즈 ──────────────────────────────────────────────
  function resize() {
    W         = canvas.width  = window.innerWidth;
    H         = canvas.height = window.innerHeight;
    buildings = buildCity();
    initStreams();
    spawnTimer = 0;
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(loop);
})();
