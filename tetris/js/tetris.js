'use strict';

// ── Constants ────────────────────────────────────────────────
const COLS   = 10;
const ROWS   = 20;
const CELL   = 36;  // px per cell
const COLORS = {
  I: '#00d4ff',
  O: '#ffe600',
  T: '#b44cff',
  S: '#00ff88',
  Z: '#ff006e',
  J: '#0066ff',
  L: '#ff8800',
};

// Tetrominoes: shape matrices (각 회전 저장, 실제 블록만 포함)
const SHAPES = {
  I: [
    [[1,1,1,1]],
    [[1],[1],[1],[1]],
  ],
  O: [
    [[1,1],[1,1]],
  ],
  T: [
    [[0,1,0],[1,1,1]],
    [[1,0],[1,1],[1,0]],
    [[1,1,1],[0,1,0]],
    [[0,1],[1,1],[0,1]],
  ],
  S: [
    [[0,1,1],[1,1,0]],
    [[1,0],[1,1],[0,1]],
  ],
  Z: [
    [[1,1,0],[0,1,1]],
    [[0,1],[1,1],[1,0]],
  ],
  J: [
    [[1,0,0],[1,1,1]],
    [[1,1],[1,0],[1,0]],
    [[1,1,1],[0,0,1]],
    [[0,1],[0,1],[1,1]],
  ],
  L: [
    [[0,0,1],[1,1,1]],
    [[1,0],[1,0],[1,1]],
    [[1,1,1],[1,0,0]],
    [[1,1],[0,1],[0,1]],
  ],
};

const PIECE_TYPES = Object.keys(SHAPES);

// Score table (lines cleared → points, multiplied by level)
const LINE_SCORES = [0, 100, 300, 500, 800];

// Drop intervals per level (ms)
const LEVEL_SPEEDS = [800,700,600,500,400,300,250,200,150,100,80];

// ── Canvas setup ─────────────────────────────────────────────
const gameCanvas  = document.getElementById('game-canvas');
const nextCanvas  = document.getElementById('next-canvas');
const holdCanvas  = document.getElementById('hold-canvas');
const ctx         = gameCanvas.getContext('2d');
const nextCtx     = nextCanvas.getContext('2d');
const holdCtx     = holdCanvas.getContext('2d');

const overlay     = document.getElementById('overlay');
const overlayMsg  = document.getElementById('overlay-msg');
const finalScore  = document.getElementById('final-score');
const scoreEl     = document.getElementById('score');
const linesEl     = document.getElementById('lines');
const levelEl     = document.getElementById('level');
const pauseMenu   = document.getElementById('pause-menu');

// ── Pause menu buttons ────────────────────────────────────────
document.getElementById('btn-resume').addEventListener('click', resumeGame);
document.getElementById('btn-restart').addEventListener('click', () => { closePauseMenu(); startGame(); });
document.getElementById('btn-quit').addEventListener('click', quitGame);

// 설정창 바깥 클릭 시 재개
pauseMenu.addEventListener('click', e => {
  if (e.target === pauseMenu) resumeGame();
});

// ── Game state ───────────────────────────────────────────────
let board, current, ghost, next, hold;
let score, lines, level;
let dropTimer, lastTime;
let state; // 'idle' | 'playing' | 'paused' | 'over'
let holdUsed;
let bag;

// ── Bag randomizer ───────────────────────────────────────────
function refillBag() {
  bag = [...PIECE_TYPES];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
}

function nextPieceFromBag() {
  if (!bag || bag.length === 0) refillBag();
  const type = bag.pop();
  return createPiece(type);
}

function createPiece(type) {
  const shape = SHAPES[type][0];
  const x = Math.floor((COLS - shape[0].length) / 2);
  return {
    type,
    shape,
    rotIdx: 0,
    x,
    y: 0,
    color: COLORS[type],
  };
}

// ── Board ─────────────────────────────────────────────────────
function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

// ── Collision ─────────────────────────────────────────────────
function collides(piece, dx = 0, dy = 0, shape = piece.shape) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = piece.x + c + dx;
      const ny = piece.y + r + dy;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny < 0) continue;  // 보드 위쪽은 충돌 무시 (스폰 공간)
      if (board[ny][nx]) return true;
    }
  }
  return false;
}

// ── Rotation (SRS wall-kick simplified) ───────────────────────
function rotate(piece, dir = 1) {
  const shapes = SHAPES[piece.type];
  const newIdx = ((piece.rotIdx + dir) % shapes.length + shapes.length) % shapes.length;
  const newShape = shapes[newIdx];

  // Try offsets: 0, -1, +1, -2, +2
  const offsets = [0, -1, 1, -2, 2];
  for (const dx of offsets) {
    if (!collides(piece, dx, 0, newShape)) {
      return { ...piece, shape: newShape, rotIdx: newIdx, x: piece.x + dx };
    }
  }
  return piece; // rotation failed
}

// ── Ghost piece ───────────────────────────────────────────────
function computeGhost() {
  let g = { ...current };
  while (!collides(g, 0, 1)) g = { ...g, y: g.y + 1 };
  return g;
}

// ── Lock piece ────────────────────────────────────────────────
function lockPiece() {
  let aboveBoard = true;
  for (let r = 0; r < current.shape.length; r++) {
    for (let c = 0; c < current.shape[r].length; c++) {
      if (!current.shape[r][c]) continue;
      const y = current.y + r;
      if (y >= 0) aboveBoard = false;
      if (y < 0) continue;
      board[y][current.x + c] = current.color;
    }
  }
  if (aboveBoard) { gameOver(); return; }
  clearLines();
  spawnPiece();
}

// ── Line clear ────────────────────────────────────────────────
function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(c => c !== null)) {
      board.splice(r, 1);
      board.unshift(Array(COLS).fill(null));
      cleared++;
      r++; // recheck same row index
    }
  }
  if (cleared > 0) {
    lines  += cleared;
    score  += LINE_SCORES[cleared] * level;
    level   = Math.floor(lines / 10) + 1;
    updateHUD();
    // flash effect
    gameCanvas.classList.add('flash');
    setTimeout(() => gameCanvas.classList.remove('flash'), 120);
  }
}

// ── Spawn ─────────────────────────────────────────────────────
function spawnPiece() {
  current  = next;
  next     = nextPieceFromBag();
  holdUsed = false;
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
    hold    = createPiece(current.type);
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
}

// ── Drawing helpers ───────────────────────────────────────────
function drawCell(context, x, y, color, alpha = 1) {
  context.globalAlpha = alpha;
  // fill
  context.fillStyle = color;
  context.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
  // inner shine
  context.fillStyle = 'rgba(255,255,255,0.15)';
  context.fillRect(x * CELL + 2, y * CELL + 2, CELL - 4, 4);
  // glow border
  context.strokeStyle = color;
  context.lineWidth = 1;
  context.shadowColor = color;
  context.shadowBlur = 6;
  context.strokeRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
  context.shadowBlur = 0;
  context.globalAlpha = 1;
}

function drawGrid() {
  ctx.strokeStyle = 'rgba(30,58,95,0.4)';
  ctx.lineWidth = 0.5;
  for (let c = 0; c <= COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * CELL, 0);
    ctx.lineTo(c * CELL, ROWS * CELL);
    ctx.stroke();
  }
  for (let r = 0; r <= ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * CELL);
    ctx.lineTo(COLS * CELL, r * CELL);
    ctx.stroke();
  }
}

function drawBoard() {
  ctx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);
  ctx.fillStyle = '#08080f';
  ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);
  drawGrid();

  // board cells
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c]) drawCell(ctx, c, r, board[r][c]);
    }
  }

  // ghost
  if (ghost && state === 'playing') {
    for (let r = 0; r < ghost.shape.length; r++) {
      for (let c = 0; c < ghost.shape[r].length; c++) {
        if (ghost.shape[r][c]) {
          ctx.globalAlpha = 0.2;
          ctx.fillStyle = current.color;
          ctx.fillRect((ghost.x + c) * CELL + 1, (ghost.y + r) * CELL + 1, CELL - 2, CELL - 2);
          ctx.strokeStyle = current.color;
          ctx.lineWidth = 1;
          ctx.strokeRect((ghost.x + c) * CELL + 1, (ghost.y + r) * CELL + 1, CELL - 2, CELL - 2);
          ctx.globalAlpha = 1;
        }
      }
    }
  }

  // current piece
  if (current) {
    for (let r = 0; r < current.shape.length; r++) {
      for (let c = 0; c < current.shape[r].length; c++) {
        if (current.shape[r][c]) drawCell(ctx, current.x + c, current.y + r, current.color);
      }
    }
  }
}

function drawPreview(context, piece) {
  context.clearRect(0, 0, 144, 144);
  context.fillStyle = '#08080f';
  context.fillRect(0, 0, 144, 144);
  if (!piece) return;

  const s = piece.shape;
  const previewCell = 30;
  const offsetX = Math.floor((4 - s[0].length) / 2);
  const offsetY = Math.floor((4 - s.length) / 2);
  const startX = offsetX * previewCell + (144 - 4 * previewCell) / 2;
  const startY = offsetY * previewCell + (144 - 4 * previewCell) / 2;

  for (let r = 0; r < s.length; r++) {
    for (let c = 0; c < s[r].length; c++) {
      if (!s[r][c]) continue;
      const px = startX + c * previewCell;
      const py = startY + r * previewCell;
      context.fillStyle = piece.color;
      context.fillRect(px + 1, py + 1, previewCell - 2, previewCell - 2);
      context.fillStyle = 'rgba(255,255,255,0.15)';
      context.fillRect(px + 2, py + 2, previewCell - 4, 4);
      context.strokeStyle = piece.color;
      context.lineWidth = 1;
      context.shadowColor = piece.color;
      context.shadowBlur = 6;
      context.strokeRect(px + 1, py + 1, previewCell - 2, previewCell - 2);
      context.shadowBlur = 0;
    }
  }
}

function drawNext() { drawPreview(nextCtx, next); }
function drawHold() { drawPreview(holdCtx, hold); }

// ── Game loop ─────────────────────────────────────────────────
function gameLoop(timestamp) {
  if (state !== 'playing') return;
  const dt = Math.min(timestamp - (lastTime || timestamp), 200); // 탭 비활성화 후 복귀 시 누적 방지
  lastTime = timestamp;
  dropTimer += dt;

  const speed = LEVEL_SPEEDS[Math.min(level - 1, LEVEL_SPEEDS.length - 1)];
  if (dropTimer >= speed) {
    dropTimer = 0;
    if (!collides(current, 0, 1)) {
      current.y++;
      ghost = computeGhost();
    } else {
      lockPiece();
    }
  }

  drawBoard();
  requestAnimationFrame(gameLoop);
}

// ── Start / restart ───────────────────────────────────────────
function startGame() {
  board     = emptyBoard();
  score     = 0;
  lines     = 0;
  level     = 1;
  hold      = null;
  holdUsed  = false;
  dropTimer = 0;
  lastTime  = null;
  bag       = [];

  refillBag();
  next    = nextPieceFromBag();
  spawnPiece();
  drawNext();
  drawHold();
  updateHUD();

  state = 'playing';
  overlay.classList.add('hidden');
  requestAnimationFrame(gameLoop);
}

function gameOver() {
  state = 'over';
  overlayMsg.textContent  = 'GAME OVER';
  finalScore.textContent  = `SCORE: ${score}`;
  overlay.classList.remove('hidden');
}

function openPauseMenu() {
  if (state !== 'playing') return;
  state = 'paused';
  pauseMenu.classList.remove('hidden');
}

function closePauseMenu() {
  pauseMenu.classList.add('hidden');
}

function resumeGame() {
  if (state !== 'paused') return;
  closePauseMenu();
  state     = 'playing';
  lastTime  = null;
  dropTimer = 0;
  requestAnimationFrame(gameLoop);
}

function quitGame() {
  closePauseMenu();
  state = 'idle';
  board = emptyBoard();
  drawBoard();
  overlay.classList.remove('hidden');
  overlayMsg.textContent = 'PRESS SPACE';
  finalScore.textContent = '';
}

// ── Input ─────────────────────────────────────────────────────
const DAS_DELAY   = 160;
const DAS_REPEAT  = 50;
let dasTimer    = null;
let dasTimeout  = null;
let dasKey      = null;  // 'left' | 'right' | null

function clearDAS() {
  if (dasTimeout) { clearTimeout(dasTimeout);   dasTimeout = null; }
  if (dasTimer)   { clearInterval(dasTimer);     dasTimer   = null; }
  dasKey = null;
}

function startDAS(key, action) {
  if (dasKey === key) return;
  clearDAS();
  dasKey = key;
  action();
  dasTimeout = setTimeout(() => {
    dasTimer = setInterval(action, DAS_REPEAT);
  }, DAS_DELAY);
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
      current = rotate(current, 1);
      ghost = computeGhost();
      break;
    case 'KeyZ':
      e.preventDefault();
      current = rotate(current, -1);
      ghost = computeGhost();
      break;
    case 'Space':
      e.preventDefault();
      // Hard drop
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

// draw empty board on load
board = emptyBoard();
drawBoard();
