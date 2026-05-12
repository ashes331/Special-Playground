'use strict';

// ── Constants ────────────────────────────────────────────────
const COLS         = 10;
const ROWS_VISIBLE = 20;
const BUFFER       = 4;
const ROWS_TOTAL   = ROWS_VISIBLE + BUFFER;
const CELL         = 36;

const COLORS = {
  I: '#00d4ff', O: '#ffe600', T: '#b44cff',
  S: '#00ff88', Z: '#ff006e', J: '#4488ff', L: '#ff8800',
};

const SHAPES = {
  I: [
    [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
    [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
  ],
  O: [[[1,1],[1,1]]],
  T: [
    [[0,1,0],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,1],[0,1,0]],
    [[0,0,0],[1,1,1],[0,1,0]],
    [[0,1,0],[1,1,0],[0,1,0]],
  ],
  S: [
    [[0,1,1],[1,1,0],[0,0,0]],
    [[0,1,0],[0,1,1],[0,0,1]],
  ],
  Z: [
    [[1,1,0],[0,1,1],[0,0,0]],
    [[0,0,1],[0,1,1],[0,1,0]],
  ],
  J: [
    [[1,0,0],[1,1,1],[0,0,0]],
    [[0,1,1],[0,1,0],[0,1,0]],
    [[0,0,0],[1,1,1],[0,0,1]],
    [[0,1,0],[0,1,0],[1,1,0]],
  ],
  L: [
    [[0,0,1],[1,1,1],[0,0,0]],
    [[0,1,0],[0,1,0],[0,1,1]],
    [[0,0,0],[1,1,1],[1,0,0]],
    [[1,1,0],[0,1,0],[0,1,0]],
  ],
};

// 점수 테이블 (× level)
const LINE_SCORES = [0, 100, 300, 500, 800];
const TSPIN_SCORES = { mini: 100, single: 800, double: 1200, triple: 1600 };
const ALL_CLEAR_BONUS = 3500;
const LEVEL_SPEEDS = [800,700,600,500,400,300,250,200,150,100,80];

// ── DOM ──────────────────────────────────────────────────────
const gameCanvas = document.getElementById('game-canvas');
const nextCanvas = document.getElementById('next-canvas');
const holdCanvas = document.getElementById('hold-canvas');
const ctx        = gameCanvas.getContext('2d');
const nextCtx    = nextCanvas.getContext('2d');
const holdCtx    = holdCanvas.getContext('2d');

const overlay    = document.getElementById('overlay');
const overlayMsg = document.getElementById('overlay-msg');
const finalScore = document.getElementById('final-score');
const scoreEl    = document.getElementById('score');
const linesEl    = document.getElementById('lines');
const levelEl    = document.getElementById('level');
const comboEl    = document.getElementById('combo');
const noticeEl   = document.getElementById('notice');
const pauseMenu  = document.getElementById('pause-menu');

document.getElementById('btn-resume') .addEventListener('click', resumeGame);
document.getElementById('btn-restart').addEventListener('click', () => { closePauseMenu(); startGame(); });
document.getElementById('btn-quit')   .addEventListener('click', quitGame);
pauseMenu.addEventListener('click', e => { if (e.target === pauseMenu) resumeGame(); });

// ── Game state ───────────────────────────────────────────────
let board, current, ghost, nextPiece, hold;
let score, lines, level;
let dropTimer, lastTime;
let state;       // 'idle' | 'playing' | 'paused' | 'over'
let holdUsed, bag;

// 콤보 / 스페셜
let combo;       // 연속 클리어 횟수 (-1 = 없음)
let btbActive;   // Back-to-Back 활성 여부
let lastWasTspin;   // 마지막 액션이 T-스핀이었는지
let lastWasTetris;  // 마지막 클리어가 테트리스였는지

let noticeTimer = null;

// ── Notice 표시 ───────────────────────────────────────────────
function showNotice(text, color = '#fff') {
  noticeEl.textContent = text;
  noticeEl.style.color = color;
  noticeEl.style.textShadow = `0 0 10px ${color}`;
  noticeEl.classList.add('show');
  if (noticeTimer) clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => noticeEl.classList.remove('show'), 1200);
}

// ── Bag randomizer ───────────────────────────────────────────
function refillBag() {
  bag = Object.keys(SHAPES);
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
}
function nextFromBag() {
  if (!bag || bag.length === 0) refillBag();
  return createPiece(bag.pop());
}
function createPiece(type) {
  const shape = SHAPES[type][0];
  const x = Math.floor((COLS - shape[0].length) / 2);
  const y = BUFFER - 2;
  return { type, shape, rotIdx: 0, x, y, color: COLORS[type] };
}

// ── Board ─────────────────────────────────────────────────────
function emptyBoard() {
  return Array.from({ length: ROWS_TOTAL }, () => Array(COLS).fill(null));
}

// ── Collision ─────────────────────────────────────────────────
function collides(piece, dx = 0, dy = 0, shape = piece.shape) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = piece.x + c + dx;
      const ny = piece.y + r + dy;
      if (nx < 0 || nx >= COLS || ny >= ROWS_TOTAL) return true;
      if (ny < 0) continue;
      if (board[ny][nx]) return true;
    }
  }
  return false;
}

// ── T-스핀 감지 ───────────────────────────────────────────────
// T 피스의 4 모서리 중 3개 이상이 막혀있으면 T-스핀
function detectTSpin(piece, rotated) {
  if (piece.type !== 'T') return null;

  // T 피스 중심 좌표
  const cx = piece.x + 1;
  const cy = piece.y + 1;

  // 4 모서리 체크
  const corners = [
    [cy - 1, cx - 1], [cy - 1, cx + 1],
    [cy + 1, cx - 1], [cy + 1, cx + 1],
  ];
  let blocked = 0;
  for (const [r, c] of corners) {
    if (r < 0 || r >= ROWS_TOTAL || c < 0 || c >= COLS) { blocked++; continue; }
    if (board[r] && board[r][c]) blocked++;
  }
  if (blocked < 3) return null;

  // 앞면 모서리 (T 방향에 따라 다름)
  const facing = piece.rotIdx;
  const frontCorners = [
    [[cy - 1, cx - 1], [cy - 1, cx + 1]], // 위 facing
    [[cy - 1, cx + 1], [cy + 1, cx + 1]], // 오른쪽 facing
    [[cy + 1, cx - 1], [cy + 1, cx + 1]], // 아래 facing
    [[cy - 1, cx - 1], [cy + 1, cx - 1]], // 왼쪽 facing
  ];
  let frontBlocked = 0;
  for (const [r, c] of frontCorners[facing]) {
    if (r < 0 || r >= ROWS_TOTAL || c < 0 || c >= COLS) { frontBlocked++; continue; }
    if (board[r] && board[r][c]) frontBlocked++;
  }

  return frontBlocked >= 2 ? 'tspin' : 'mini';
}

// ── Rotation (SRS wall-kick) ───────────────────────────────────
// SRS 공식 wall-kick 테이블
const WALL_KICKS = {
  normal: [
    [[0,0],[-1,0],[-1,1],[0,-2],[-1,-2]],  // 0→1
    [[0,0],[1,0],[1,-1],[0,2],[1,2]],        // 1→2
    [[0,0],[1,0],[1,1],[0,-2],[1,-2]],       // 2→3
    [[0,0],[-1,0],[-1,-1],[0,2],[-1,2]],    // 3→0
  ],
  I: [
    [[0,0],[-2,0],[1,0],[-2,-1],[1,2]],     // 0→1
    [[0,0],[-1,0],[2,0],[-1,2],[2,-1]],     // 1→2
    [[0,0],[2,0],[-1,0],[2,1],[-1,-2]],     // 2→3
    [[0,0],[1,0],[-2,0],[1,-2],[-2,1]],     // 3→0
  ],
};

function rotate(piece, dir = 1) {
  const shapes = SHAPES[piece.type];
  const newIdx = ((piece.rotIdx + dir) % shapes.length + shapes.length) % shapes.length;
  const newShape = shapes[newIdx];
  const kicks = (piece.type === 'I' ? WALL_KICKS.I : WALL_KICKS.normal);

  // 회전 방향에 맞는 kick 테이블 인덱스
  let kickIdx = piece.rotIdx;
  if (dir === -1) kickIdx = ((piece.rotIdx - 1) % shapes.length + shapes.length) % shapes.length;

  const kickTable = kicks[kickIdx % kicks.length] || [[0,0]];
  for (const [dx, dy] of kickTable) {
    const newX = piece.x + (dir === 1 ? dx : -dx);
    const newY = piece.y + (dir === 1 ? dy : -dy);
    const testPiece = { ...piece, x: newX, y: newY };
    if (!collides(testPiece, 0, 0, newShape)) {
      return { ...piece, shape: newShape, rotIdx: newIdx, x: newX, y: newY, _rotated: true };
    }
  }
  return piece;
}

// ── Ghost piece ───────────────────────────────────────────────
function computeGhost() {
  let g = { ...current };
  while (!collides(g, 0, 1)) g = { ...g, y: g.y + 1 };
  return g;
}

// ── Lock piece ────────────────────────────────────────────────
function lockPiece() {
  // T-스핀 감지 (회전 후 착지한 경우)
  const tspinType = (current._rotated) ? detectTSpin(current) : null;

  for (let r = 0; r < current.shape.length; r++) {
    for (let c = 0; c < current.shape[r].length; c++) {
      if (!current.shape[r][c]) continue;
      const y = current.y + r;
      if (y < 0) continue;
      board[y][current.x + c] = current.color;
    }
  }

  // 버퍼에 블록이 쌓이면 게임오버
  for (let r = 0; r < BUFFER; r++) {
    if (board[r].some(c => c !== null)) { gameOver(); return; }
  }

  const cleared = clearLines();
  calcScore(cleared, tspinType);
  spawnPiece();
}

// ── Line clear ────────────────────────────────────────────────
function clearLines() {
  let cleared = 0;
  for (let r = ROWS_TOTAL - 1; r >= 0; r--) {
    if (board[r].every(c => c !== null)) {
      board.splice(r, 1);
      board.unshift(Array(COLS).fill(null));
      cleared++;
      r++;
    }
  }
  return cleared;
}

// ── Score calculation ─────────────────────────────────────────
function calcScore(cleared, tspinType) {
  let points = 0;
  let notices = [];
  let isSpecial = false; // BTB 대상 여부

  if (tspinType && cleared === 0) {
    // T-스핀 (클리어 없음)
    points = TSPIN_SCORES.mini * level;
    notices.push(tspinType === 'mini' ? 'T-SPIN MINI' : 'T-SPIN');
    isSpecial = true;
  } else if (tspinType === 'tspin' && cleared > 0) {
    // T-스핀 + 클리어
    const key = ['', 'single', 'double', 'triple'][cleared] || 'triple';
    points = TSPIN_SCORES[key] * level;
    notices.push(`T-SPIN ${key.toUpperCase()}`);
    isSpecial = true;
  } else if (cleared > 0) {
    points = LINE_SCORES[cleared] * level;
    if (cleared === 4) {
      notices.push('TETRIS!');
      isSpecial = true;
    } else {
      const names = ['', 'SINGLE', 'DOUBLE', 'TRIPLE'];
      notices.push(names[cleared]);
    }
  }

  // Back-to-Back
  if (isSpecial) {
    if (btbActive && cleared > 0) {
      points = Math.floor(points * 1.5);
      notices.unshift('BACK-TO-BACK');
    }
    btbActive = true;
  } else if (cleared > 0) {
    btbActive = false;
  }

  // 콤보
  if (cleared > 0) {
    combo++;
    if (combo > 0) {
      const comboBonus = 50 * combo * level;
      points += comboBonus;
      if (combo >= 2) notices.push(`${combo} COMBO!`);
    }
  } else {
    combo = -1;
  }

  // All Clear
  const allClear = board.every(row => row.every(c => c === null));
  if (allClear && cleared > 0) {
    points += ALL_CLEAR_BONUS * level;
    notices.unshift('ALL CLEAR!!');
  }

  // 플래시 & 알림
  if (cleared > 0) {
    gameCanvas.classList.add('flash');
    setTimeout(() => gameCanvas.classList.remove('flash'), 120);
  }
  if (notices.length > 0) {
    const colors = { 'T-SPIN': '#b44cff', 'TETRIS!': '#00d4ff', 'ALL CLEAR!!': '#ffe600', 'BACK-TO-BACK': '#ff8800' };
    const mainNotice = notices[0];
    const color = Object.entries(colors).find(([k]) => mainNotice.includes(k))?.[1] || '#ffffff';
    showNotice(notices.join(' + '), color);
  }

  score += points;
  lines += cleared;
  level  = Math.floor(lines / 10) + 1;
  updateHUD();
}

// ── Spawn ─────────────────────────────────────────────────────
function spawnPiece() {
  current   = nextPiece;
  nextPiece = nextFromBag();
  holdUsed  = false;
  drawNext();

  if (collides(current)) { gameOver(); return; }
  ghost = computeGhost();
}

// ── Hold ──────────────────────────────────────────────────────
function holdPiece() {
  if (holdUsed) return;
  holdUsed = true;
  if (hold) {
    const tmp = hold;
    hold    = createPiece(current.type);
    current = createPiece(tmp.type);
  } else {
    hold = createPiece(current.type);
    spawnPiece();
    return;
  }
  ghost = computeGhost();
  drawHold();
}

// ── HUD ───────────────────────────────────────────────────────
function updateHUD() {
  scoreEl.textContent = score;
  linesEl.textContent = lines;
  levelEl.textContent = level;
  comboEl.textContent = combo >= 1 ? `x${combo + 1}` : '-';
}

// ── Drawing ───────────────────────────────────────────────────
function drawCell(context, x, y, color) {
  context.fillStyle = color;
  context.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
  context.fillStyle = 'rgba(255,255,255,0.18)';
  context.fillRect(x * CELL + 2, y * CELL + 2, CELL - 4, 5);
  context.strokeStyle = color;
  context.lineWidth = 1;
  context.shadowColor = color;
  context.shadowBlur = 8;
  context.strokeRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
  context.shadowBlur = 0;
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(40,80,120,0.35)';
  ctx.lineWidth = 0.5;
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath(); ctx.moveTo(c * CELL, 0); ctx.lineTo(c * CELL, ROWS_VISIBLE * CELL); ctx.stroke();
  }
  for (let r = 0; r <= ROWS_VISIBLE; r++) {
    ctx.beginPath(); ctx.moveTo(0, r * CELL); ctx.lineTo(COLS * CELL, r * CELL); ctx.stroke();
  }
}

function drawBoard() {
  ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
  ctx.fillStyle = '#0d1520';
  ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
  drawGrid();

  // 보드 (버퍼 제외)
  for (let r = BUFFER; r < ROWS_TOTAL; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c]) drawCell(ctx, c, r - BUFFER, board[r][c]);
    }
  }

  // ghost
  if (ghost && state === 'playing') {
    for (let r = 0; r < ghost.shape.length; r++) {
      for (let c = 0; c < ghost.shape[r].length; c++) {
        if (!ghost.shape[r][c]) continue;
        const drawY = ghost.y + r - BUFFER;
        if (drawY < 0) continue;
        ctx.globalAlpha = 0.18;
        ctx.fillStyle = current.color;
        ctx.fillRect((ghost.x + c) * CELL + 1, drawY * CELL + 1, CELL - 2, CELL - 2);
        ctx.strokeStyle = current.color;
        ctx.lineWidth = 1;
        ctx.strokeRect((ghost.x + c) * CELL + 1, drawY * CELL + 1, CELL - 2, CELL - 2);
        ctx.globalAlpha = 1;
      }
    }
  }

  // current piece
  if (current) {
    for (let r = 0; r < current.shape.length; r++) {
      for (let c = 0; c < current.shape[r].length; c++) {
        if (!current.shape[r][c]) continue;
        const drawY = current.y + r - BUFFER;
        if (drawY < 0) continue;
        drawCell(ctx, current.x + c, drawY, current.color);
      }
    }
  }
}

function drawPreview(context, piece) {
  context.clearRect(0, 0, 144, 144);
  context.fillStyle = '#0d1520';
  context.fillRect(0, 0, 144, 144);
  if (!piece) return;

  const s = piece.shape;
  const pc = 30;
  const cols = s[0].length, rows = s.length;
  const startX = Math.floor((144 - cols * pc) / 2);
  const startY = Math.floor((144 - rows * pc) / 2);

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!s[r][c]) continue;
      const px = startX + c * pc;
      const py = startY + r * pc;
      context.fillStyle = piece.color;
      context.fillRect(px + 1, py + 1, pc - 2, pc - 2);
      context.fillStyle = 'rgba(255,255,255,0.18)';
      context.fillRect(px + 2, py + 2, pc - 4, 5);
      context.strokeStyle = piece.color;
      context.lineWidth = 1;
      context.shadowColor = piece.color;
      context.shadowBlur = 8;
      context.strokeRect(px + 1, py + 1, pc - 2, pc - 2);
      context.shadowBlur = 0;
    }
  }
}

function drawNext() { drawPreview(nextCtx, nextPiece); }
function drawHold() { drawPreview(holdCtx, hold); }

// ── Game loop ─────────────────────────────────────────────────
function gameLoop(timestamp) {
  if (state !== 'playing') return;
  const dt = Math.min(timestamp - (lastTime || timestamp), 200);
  lastTime = timestamp;
  dropTimer += dt;

  const speed = LEVEL_SPEEDS[Math.min(level - 1, LEVEL_SPEEDS.length - 1)];
  if (dropTimer >= speed) {
    dropTimer = 0;
    if (!collides(current, 0, 1)) {
      current.y++;
      current._rotated = false; // 자연낙하 시 회전 플래그 초기화
      ghost = computeGhost();
    } else {
      lockPiece();
    }
  }

  drawBoard();
  requestAnimationFrame(gameLoop);
}

// ── Start / Game over / Pause ─────────────────────────────────
function startGame() {
  board     = emptyBoard();
  score     = 0; lines = 0; level = 1;
  combo     = -1; btbActive = false;
  hold      = null; holdUsed = false;
  dropTimer = 0; lastTime = null;
  bag       = [];

  refillBag();
  nextPiece = nextFromBag();
  spawnPiece();
  drawNext(); drawHold(); updateHUD();

  state = 'playing';
  overlay.classList.add('hidden');
  requestAnimationFrame(gameLoop);
}

function gameOver() {
  state = 'over';
  overlayMsg.textContent = 'GAME OVER';
  finalScore.textContent = `SCORE: ${score}`;
  overlay.classList.remove('hidden');
}

function openPauseMenu() {
  if (state !== 'playing') return;
  state = 'paused';
  pauseMenu.classList.remove('hidden');
}
function closePauseMenu() { pauseMenu.classList.add('hidden'); }

function resumeGame() {
  if (state !== 'paused') return;
  closePauseMenu();
  state = 'playing'; lastTime = null; dropTimer = 0;
  requestAnimationFrame(gameLoop);
}

function quitGame() {
  closePauseMenu();
  state = 'idle';
  board = emptyBoard(); drawBoard();
  overlay.classList.remove('hidden');
  overlayMsg.textContent = 'PRESS SPACE';
  finalScore.textContent = '';
}

// ── Input ─────────────────────────────────────────────────────
const DAS_DELAY  = 160;
const DAS_REPEAT = 50;
let dasTimer = null, dasTimeout = null, dasKey = null;

function clearDAS() {
  if (dasTimeout) { clearTimeout(dasTimeout);  dasTimeout = null; }
  if (dasTimer)   { clearInterval(dasTimer);    dasTimer   = null; }
  dasKey = null;
}

function startDAS(key, action) {
  if (dasKey === key) return;
  clearDAS(); dasKey = key; action();
  dasTimeout = setTimeout(() => { dasTimer = setInterval(action, DAS_REPEAT); }, DAS_DELAY);
}

document.addEventListener('keydown', e => {
  if (state === 'idle' || state === 'over') {
    if (e.code === 'Space') { startGame(); return; }
  }
  if (e.code === 'Escape') { openPauseMenu(); return; }
  if (state !== 'playing') return;

  switch (e.code) {
    case 'ArrowLeft':
      e.preventDefault();
      startDAS('left', () => {
        if (!collides(current, -1, 0)) { current.x--; ghost = computeGhost(); drawBoard(); }
      });
      break;
    case 'ArrowRight':
      e.preventDefault();
      startDAS('right', () => {
        if (!collides(current, 1, 0)) { current.x++; ghost = computeGhost(); drawBoard(); }
      });
      break;
    case 'ArrowDown':
      e.preventDefault();
      if (!collides(current, 0, 1)) { current.y++; score += 1; updateHUD(); }
      else lockPiece();
      break;
    case 'ArrowUp':
    case 'KeyX':
      e.preventDefault();
      { const rotated = rotate(current, 1); if (rotated !== current) { current = rotated; ghost = computeGhost(); } }
      break;
    case 'KeyZ':
      e.preventDefault();
      { const rotated = rotate(current, -1); if (rotated !== current) { current = rotated; ghost = computeGhost(); } }
      break;
    case 'Space':
      e.preventDefault();
      while (!collides(current, 0, 1)) { current.y++; score += 2; }
      updateHUD();
      lockPiece();
      break;
    case 'KeyC':
      e.preventDefault();
      holdPiece();
      break;
  }
});

document.addEventListener('keyup', e => {
  if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') clearDAS();
});

// ── Init ──────────────────────────────────────────────────────
state = 'idle';
overlayMsg.textContent = 'PRESS SPACE';
finalScore.textContent = '';
board = emptyBoard();
drawBoard();
