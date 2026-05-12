'use strict';

(function () {
  const canvas = document.getElementById('bg-canvas');
  const ctx    = canvas.getContext('2d');

  let W, H;
  let streams   = [];
  let buildings = [];

  const FONT_SIZE      = 14;
  const SPAWN_INTERVAL = 180;
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
    const count = Math.floor(W / 35);
    for (let i = 0; i < count; i++) {
      const s = createStream();
      s.y = Math.random() * H * 0.55;
      streams.push(s);
    }
  }

  // ── 도시 빌딩 ─────────────────────────────────────────────
  function buildCity() {
    const list = [];
    // [x비율, 높이비율, 너비비율]
    const back = [
      [.00,.45,.07],[.06,.52,.05],[.10,.47,.08],[.17,.55,.06],
      [.22,.49,.09],[.30,.57,.05],[.34,.51,.07],[.40,.53,.06],
      [.45,.45,.08],[.52,.57,.05],[.56,.51,.07],[.62,.47,.09],
      [.70,.55,.05],[.74,.49,.08],[.81,.53,.06],[.86,.45,.07],
      [.92,.54,.08],
    ];
    back.forEach(([x,h,w]) => list.push({ x, h, w, layer:0 }));

    const front = [
      [.00,.35,.09],[.08,.39,.07],[.14,.37,.10],[.23,.41,.08],
      [.30,.38,.11],[.40,.40,.09],[.48,.35,.07],[.54,.43,.12],
      [.65,.39,.08],[.72,.35,.10],[.81,.40,.09],[.89,.37,.11],
    ];
    front.forEach(([x,h,w]) => list.push({ x, h, w, layer:1 }));
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
      const bx = b.x * W;
      const bw = b.w * W;
      // 빌딩 높이: 화면 높이의 일정 비율, 최소 120px
      const bh = Math.max(120, H * b.h);
      // 빌딩 시작 y: 항상 화면 하단에서 bh만큼 위
      const by = H - bh;

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

      // 숫자 반복 변경 (더 자주)
      s.chTimer += dt;
      if (s.chTimer >= s.chInterval) {
        // 2~3개 랜덤 위치 동시에 변경
        const changeCount = 2 + Math.floor(Math.random() * 2);
        for (let k = 0; k < changeCount; k++) {
          const idx = Math.floor(Math.random() * s.len);
          s.chars[idx] = s.chars[idx] === '1' ? '0' : '1'; // 반전
        }
        s.chTimer    = 0;
        s.chInterval = 400 + Math.random() * 600;
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
