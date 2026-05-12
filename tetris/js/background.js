'use strict';

(function () {
  const canvas = document.getElementById('bg-canvas');
  const ctx    = canvas.getContext('2d');

  let W, H;
  let streams = [];

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
  // ── 도시 빌딩 ─────────────────────────────────────────────
  // [x비율, 너비비율, 높이px]  — by = H - h 로 항상 하단 고정
  let cityBlocks = [];

  function buildCity() {
    cityBlocks = [];
    const back = [
      [.00,.07,260],[.06,.05,320],[.10,.08,280],[.17,.06,380],
      [.22,.09,300],[.30,.05,400],[.34,.07,340],[.40,.06,360],
      [.45,.08,260],[.52,.05,400],[.56,.07,340],[.62,.08,280],
      [.70,.05,380],[.74,.08,300],[.81,.06,360],[.86,.07,260],
      [.92,.08,370],
    ];
    back.forEach(([x,w,h]) => cityBlocks.push({ x, w, h, layer:0 }));

    const front = [
      [.00,.09,180],[.08,.07,220],[.14,.10,200],[.23,.08,240],
      [.30,.11,210],[.40,.09,230],[.48,.07,180],[.54,.12,260],
      [.65,.08,220],[.72,.10,180],[.81,.09,230],[.89,.11,200],
    ];
    front.forEach(([x,w,h]) => cityBlocks.push({ x, w, h, layer:1 }));
  }

  function drawBuildings() {
    cityBlocks.forEach(b => {
      const bx = b.x * W;
      const bw = Math.max(30, b.w * W);
      const bh = b.h;
      const by = H - bh;

      // 본체
      ctx.fillStyle = b.layer === 0 ? '#080d18' : '#050b12';
      ctx.fillRect(bx, by, bw, bh);

      // 창문
      const wW     = Math.max(8, Math.min(bw * 0.18, 18));
      const wH     = wW * 1.5;
      const gap    = Math.max(5, wW * 0.8);
      const cols   = Math.max(1, Math.floor((bw - gap) / (wW + gap)));
      const rows   = Math.max(1, Math.floor((bh - wH * 1.5) / (wH + gap)));
      const startX = (bw - cols * (wW + gap) + gap) / 2;
      const startY = wH * 0.8;
      const winColors = [
        'rgba(255,210,90,0.75)',
        'rgba(130,190,255,0.65)',
        'rgba(190,160,255,0.60)',
      ];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const seed = Math.floor(b.x * 1000 + r * 23 + c * 41) % 100;
          if (seed < 60) {
            ctx.fillStyle = winColors[seed % 3];
            ctx.fillRect(
              bx + startX + c * (wW + gap),
              by + startY + r * (wH + gap),
              wW, wH
            );
          }
        }
      }

      // 윤곽선
      ctx.strokeStyle = 'rgba(20,50,90,0.3)';
      ctx.lineWidth   = 0.5;
      ctx.strokeRect(bx, by, bw, bh);
    });
  }
  function drawBackground() {

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
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    buildCity();
    initStreams();
    spawnTimer = 0;
  }

  window.addEventListener('resize', resize);
  resize();
  requestAnimationFrame(loop);
})();
