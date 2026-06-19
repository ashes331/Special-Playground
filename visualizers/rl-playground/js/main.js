// ============================================================
// CONFIG & STATE
// ============================================================
const CELL = 72;
const ACTIONS = [[-1,0],[1,0],[0,-1],[0,1]]; // up down left right
const ACTION_NAMES = ['↑','↓','←','→'];
const DIRS = ['up','down','left','right'];

let GRID_SIZE = 5;
let grid, Q, agentPos, startPos, goalPos;
let running = false, paused = false, editing = false;
let episode = 0, totalStep = 0, currentReturn = 0, stepInEp = 0;
let episodeReturns = [], episodeSteps = [];
let animId = null, stepsPerFrame = 5;
let epsilon, selectedCell = null;

// default layouts per size
const DEFAULT_LAYOUTS = {
  5: {
    start: [4,0], goal: [0,4],
    walls: [[1,1],[2,1],[3,3],[1,3]],
    traps: [[2,3],[3,1]]
  },
  8: {
    start: [7,0], goal: [0,7],
    walls: [[2,1],[2,2],[2,3],[5,4],[5,5],[5,6],[3,6],[3,5]],
    traps: [[1,4],[4,2],[6,3],[2,6]]
  },
  10: {
    start: [9,0], goal: [0,9],
    walls: [[2,1],[2,2],[2,3],[2,4],[5,5],[5,6],[5,7],[7,2],[7,3],[7,4],[4,8],[4,7]],
    traps: [[1,5],[3,2],[6,4],[8,6],[5,1],[1,8]]
  }
};

// ============================================================
// GRID INIT
// ============================================================
function initGrid(size) {
  GRID_SIZE = size;
  const layout = DEFAULT_LAYOUTS[size];
  grid = Array.from({length: size}, () => Array(size).fill('empty'));
  Q = Array.from({length: size}, () =>
    Array.from({length: size}, () => [0,0,0,0])
  );
  startPos = [...layout.start];
  goalPos = [...layout.goal];
  layout.walls.forEach(([r,c]) => grid[r][c] = 'wall');
  layout.traps.forEach(([r,c]) => grid[r][c] = 'trap');
  grid[goalPos[0]][goalPos[1]] = 'goal';
  agentPos = [...startPos];
  episode = 0; totalStep = 0; currentReturn = 0; stepInEp = 0;
  episodeReturns = []; episodeSteps = [];
  epsilon = parseFloat(document.getElementById('eps').value);
  updateHUD();
  resizeCanvases();
  drawGrid();
  drawOverlay();
  clearCharts();
  document.getElementById('episodeLog').innerHTML = '<div class="log-line">Ready</div>';
  document.getElementById('qTable').innerHTML = '<div style="color:var(--text-muted); font-size:10px;">Click a cell to inspect</div>';
  selectedCell = null;
}

// ============================================================
// CANVAS SETUP
// ============================================================
const gridCanvas = document.getElementById('gridCanvas');
const overlayCanvas = document.getElementById('overlayCanvas');
const gctx = gridCanvas.getContext('2d');
const octx = overlayCanvas.getContext('2d');

function resizeCanvases() {
  const sz = GRID_SIZE * CELL;
  gridCanvas.width = overlayCanvas.width = sz;
  gridCanvas.height = overlayCanvas.height = sz;
  gridCanvas.style.width = overlayCanvas.style.width = sz + 'px';
  gridCanvas.style.height = overlayCanvas.style.height = sz + 'px';
}

// ============================================================
// DRAW GRID
// ============================================================
const CELL_COLORS = {
  empty: '#111827',
  wall: '#1e293b',
  goal: '#14532d',
  trap: '#450a0a',
  start: '#1e1b4b'
};

function drawGrid() {
  gctx.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      const x = c * CELL, y = r * CELL;
      const type = grid[r][c];
      gctx.fillStyle = CELL_COLORS[type] || '#111827';
      gctx.fillRect(x, y, CELL, CELL);

      // subtle inner border
      gctx.strokeStyle = '#1e2d45';
      gctx.lineWidth = 1;
      gctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);

      // cell labels
      if (type === 'goal') {
        gctx.fillStyle = '#22c55e';
        gctx.font = `bold ${CELL * 0.45}px sans-serif`;
        gctx.textAlign = 'center';
        gctx.textBaseline = 'middle';
        gctx.fillText('G', x + CELL/2, y + CELL/2);
      } else if (type === 'trap') {
        gctx.fillStyle = '#ef4444';
        gctx.font = `${CELL * 0.38}px sans-serif`;
        gctx.textAlign = 'center';
        gctx.textBaseline = 'middle';
        gctx.fillText('✕', x + CELL/2, y + CELL/2);
      } else if (r === startPos[0] && c === startPos[1] && type !== 'goal') {
        gctx.fillStyle = '#6366f1';
        gctx.font = `bold ${CELL * 0.28}px Space Mono, monospace`;
        gctx.textAlign = 'center';
        gctx.textBaseline = 'middle';
        gctx.fillText('S', x + CELL/2, y + CELL/2);
      }
    }
  }

  // selection highlight
  if (selectedCell) {
    const [sr, sc] = selectedCell;
    gctx.strokeStyle = '#00e5ff';
    gctx.lineWidth = 2;
    gctx.strokeRect(sc * CELL + 1, sr * CELL + 1, CELL - 2, CELL - 2);
  }

  // draw agent
  drawAgent();
}

function drawAgent() {
  const [r, c] = agentPos;
  const x = c * CELL + CELL / 2;
  const y = r * CELL + CELL / 2;
  const R = CELL * 0.28;

  gctx.save();
  // glow
  gctx.shadowColor = '#fbbf24';
  gctx.shadowBlur = 12;
  gctx.fillStyle = '#fbbf24';
  gctx.beginPath();
  gctx.arc(x, y, R, 0, Math.PI * 2);
  gctx.fill();
  gctx.shadowBlur = 0;
  // inner dot
  gctx.fillStyle = '#000';
  gctx.beginPath();
  gctx.arc(x, y, R * 0.35, 0, Math.PI * 2);
  gctx.fill();
  gctx.restore();
}

// ============================================================
// DRAW OVERLAY (heatmap + arrows + numbers)
// ============================================================
function drawOverlay() {
  octx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  const showHeat = document.getElementById('heatmapToggle').classList.contains('on');
  const showArrow = document.getElementById('arrowToggle').classList.contains('on');
  const showNum = document.getElementById('numToggle').classList.contains('on');

  // compute max Q for normalization
  let maxQ = 0.001;
  for (let r = 0; r < GRID_SIZE; r++)
    for (let c = 0; c < GRID_SIZE; c++)
      if (grid[r][c] === 'empty' || (r === startPos[0] && c === startPos[1]))
        maxQ = Math.max(maxQ, ...Q[r][c].map(Math.abs));

  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      if (grid[r][c] === 'wall' || grid[r][c] === 'goal' || grid[r][c] === 'trap') continue;
      const x = c * CELL, y = r * CELL;
      const qs = Q[r][c];
      const maxA = Math.max(...qs);
      const norm = (maxA + maxQ) / (2 * maxQ);

      if (showHeat) {
        // cyan-to-purple heatmap
        const t = Math.max(0, Math.min(1, norm));
        octx.fillStyle = `rgba(${lerp(124,0,t)},${lerp(58,229,t)},${lerp(237,255,t)},${0.12 + t * 0.28})`;
        octx.fillRect(x + 1, y + 1, CELL - 2, CELL - 2);
      }

      if (showArrow && maxA > 0.001) {
        drawArrow(octx, r, c, qs);
      }

      if (showNum) {
        octx.fillStyle = '#94a3b8';
        octx.font = `${CELL * 0.18}px Space Mono, monospace`;
        octx.textAlign = 'center';
        octx.textBaseline = 'bottom';
        octx.fillText(maxA.toFixed(2), x + CELL/2, y + CELL - 4);
      }
    }
  }
}

function lerp(a, b, t) { return Math.round(a + (b - a) * t); }

function drawArrow(ctx, r, c, qs) {
  const x = c * CELL + CELL / 2;
  const y = r * CELL + CELL / 2;
  const best = qs.indexOf(Math.max(...qs));
  const dr = ACTIONS[best][0], dc = ACTIONS[best][1];
  const len = CELL * 0.26;
  const ex = x + dc * len, ey = y + dr * len;

  ctx.save();
  ctx.strokeStyle = 'rgba(0,229,255,0.7)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x - dc * len * 0.4, y - dr * len * 0.4);
  ctx.lineTo(ex, ey);
  ctx.stroke();

  // arrowhead
  const angle = Math.atan2(dr, dc);
  const hs = CELL * 0.12;
  ctx.fillStyle = 'rgba(0,229,255,0.85)';
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex - hs * Math.cos(angle - 0.5), ey - hs * Math.sin(angle - 0.5));
  ctx.lineTo(ex - hs * Math.cos(angle + 0.5), ey - hs * Math.sin(angle + 0.5));
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// ============================================================
// RL LOGIC
// ============================================================
function getReward(r, c) {
  if (grid[r][c] === 'goal') return 10;
  if (grid[r][c] === 'trap') return -1;
  return -0.01; // small step penalty
}

function isTerminal(r, c) {
  return grid[r][c] === 'goal' || grid[r][c] === 'trap';
}

function chooseAction(r, c) {
  if (Math.random() < epsilon) {
    // random valid action
    const valid = [];
    for (let a = 0; a < 4; a++) {
      const nr = r + ACTIONS[a][0], nc = c + ACTIONS[a][1];
      if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && grid[nr][nc] !== 'wall')
        valid.push(a);
    }
    return valid.length ? valid[Math.floor(Math.random() * valid.length)] : 0;
  }
  // greedy - prefer valid
  let best = -1, bestQ = -Infinity;
  for (let a = 0; a < 4; a++) {
    const nr = r + ACTIONS[a][0], nc = c + ACTIONS[a][1];
    if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && grid[nr][nc] !== 'wall') {
      if (Q[r][c][a] > bestQ) { bestQ = Q[r][c][a]; best = a; }
    }
  }
  return best === -1 ? 0 : best;
}

function step(action) {
  const [r, c] = agentPos;
  const lr = parseFloat(document.getElementById('lr').value);
  const gamma = parseFloat(document.getElementById('gamma').value);
  const algo = document.getElementById('algoSelect').value;

  let nr = r + ACTIONS[action][0];
  let nc = c + ACTIONS[action][1];

  // boundary / wall check
  if (nr < 0 || nr >= GRID_SIZE || nc < 0 || nc >= GRID_SIZE || grid[nr][nc] === 'wall') {
    nr = r; nc = c;
  }

  const reward = getReward(nr, nc);
  currentReturn += reward;
  totalStep++;
  stepInEp++;

  let nextQ = 0;
  if (!isTerminal(nr, nc)) {
    if (algo === 'qlearning') {
      nextQ = Math.max(...Q[nr][nc]);
    } else {
      // SARSA: next action from policy
      const nextA = chooseAction(nr, nc);
      nextQ = Q[nr][nc][nextA];
    }
  }

  // TD update
  const td = reward + gamma * nextQ - Q[r][c][action];
  Q[r][c][action] += lr * td;

  agentPos = [nr, nc];
  return isTerminal(nr, nc);
}

function runEpisode() {
  const algo = document.getElementById('algoSelect').value;
  let action = chooseAction(agentPos[0], agentPos[1]);

  const done = step(action);
  if (done || stepInEp > GRID_SIZE * GRID_SIZE * 4) {
    endEpisode(done && grid[agentPos[0]][agentPos[1]] === 'goal');
    agentPos = [...startPos];
    action = chooseAction(agentPos[0], agentPos[1]);
    stepInEp = 0;
  }
}

function endEpisode(success) {
  episodeReturns.push(currentReturn);
  episodeSteps.push(stepInEp);
  episode++;

  const decayVal = parseFloat(document.getElementById('decay').value);
  const epsMinVal = parseFloat(document.getElementById('epsMin').value);
  epsilon = Math.max(epsMinVal, epsilon * decayVal);

  updateHUD();
  updateCharts();
  addLog(episode, currentReturn, success);
  currentReturn = 0;
}

// ============================================================
// ANIMATION LOOP
// ============================================================
let lastTime = 0;
function loop(ts) {
  if (!running || paused) return;
  const spf = parseInt(document.getElementById('speed').value);
  for (let i = 0; i < spf; i++) runEpisode();
  drawGrid();
  drawOverlay();
  if (selectedCell) showQTable(...selectedCell);
  animId = requestAnimationFrame(loop);
}

// ============================================================
// HUD & UI UPDATES
// ============================================================
function updateHUD() {
  document.getElementById('hEp').textContent = episode;
  document.getElementById('hStep').textContent = totalStep;
  document.getElementById('hEps').textContent = epsilon.toFixed(3);
  document.getElementById('hReturn').textContent = currentReturn.toFixed(2);
  document.getElementById('statusBar').textContent =
    running && !paused
      ? `Training — episode ${episode}, ε = ${epsilon.toFixed(3)}`
      : paused ? 'Paused' : 'Ready';
}

// Mini charts
const returnChartCtx = document.getElementById('returnChart').getContext('2d');
const stepsChartCtx = document.getElementById('stepsChart').getContext('2d');

function clearCharts() {
  [returnChartCtx, stepsChartCtx].forEach(ctx => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  });
}

function updateCharts() {
  drawMiniChart(returnChartCtx, episodeReturns, '#00e5ff', '#7c3aed');
  drawMiniChart(stepsChartCtx, episodeSteps, '#fbbf24', '#f97316');
}

function drawMiniChart(ctx, data, color1, color2) {
  const W = ctx.canvas.offsetWidth || 200;
  const H = 80;
  ctx.canvas.width = W; ctx.canvas.height = H;
  ctx.clearRect(0, 0, W, H);
  if (data.length < 2) return;

  const tail = data.slice(-120);
  const mn = Math.min(...tail), mx = Math.max(...tail);
  const range = mx - mn || 1;

  ctx.beginPath();
  tail.forEach((v, i) => {
    const x = (i / (tail.length - 1)) * W;
    const y = H - ((v - mn) / range) * (H - 8) - 4;
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });

  const grad = ctx.createLinearGradient(0, 0, W, 0);
  grad.addColorStop(0, color2 + '80');
  grad.addColorStop(1, color1);
  ctx.strokeStyle = grad;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // fill under
  ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
  const fillGrad = ctx.createLinearGradient(0, 0, 0, H);
  fillGrad.addColorStop(0, color1 + '22');
  fillGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = fillGrad;
  ctx.fill();
}

function showQTable(r, c) {
  selectedCell = [r, c];
  const qs = Q[r][c];
  const best = qs.indexOf(Math.max(...qs));
  let html = `<div style="color:var(--text-dim); margin-bottom:6px; font-size:9px;">CELL (${r},${c})</div>`;
  ACTION_NAMES.forEach((name, i) => {
    const highlight = i === best ? 'color:var(--accent)' : '';
    html += `<div class="q-row"><span class="q-dir">${name}</span><span class="q-val" style="${highlight}">${qs[i].toFixed(4)}</span></div>`;
  });
  document.getElementById('qTable').innerHTML = html;
}

function addLog(ep, ret, success) {
  const log = document.getElementById('episodeLog');
  const line = document.createElement('div');
  line.className = `log-line ${success ? 'success' : ret < -0.5 ? 'fail' : ''}`;
  line.textContent = `EP ${String(ep).padStart(4,' ')}  R=${ret.toFixed(2).padStart(7,' ')}  ε=${epsilon.toFixed(3)}`;
  log.appendChild(line);
  if (log.children.length > 50) log.removeChild(log.firstChild);
  log.scrollTop = log.scrollHeight;
}

// ============================================================
// CONTROLS
// ============================================================
document.getElementById('btnStart').addEventListener('click', () => {
  if (!running) {
    running = true; paused = false;
    document.getElementById('btnStart').disabled = true;
    document.getElementById('btnPause').disabled = false;
    document.getElementById('btnStep').disabled = false;
    updateHUD();
    animId = requestAnimationFrame(loop);
  }
});

document.getElementById('btnPause').addEventListener('click', () => {
  paused = !paused;
  document.getElementById('btnPause').textContent = paused ? '▶ RESUME' : '⏸ PAUSE';
  if (!paused) animId = requestAnimationFrame(loop);
  updateHUD();
});

document.getElementById('btnStep').addEventListener('click', () => {
  if (!running) return;
  paused = true;
  document.getElementById('btnPause').textContent = '▶ RESUME';
  runEpisode();
  drawGrid(); drawOverlay();
  if (selectedCell) showQTable(...selectedCell);
  updateHUD();
});

document.getElementById('btnReset').addEventListener('click', () => {
  running = false; paused = false;
  if (animId) cancelAnimationFrame(animId);
  document.getElementById('btnStart').disabled = false;
  document.getElementById('btnPause').disabled = true;
  document.getElementById('btnStep').disabled = true;
  document.getElementById('btnPause').textContent = '⏸ PAUSE';
  initGrid(GRID_SIZE);
  updateHUD();
});

// sliders
['lr','gamma','eps','decay','epsMin','speed'].forEach(id => {
  const el = document.getElementById(id);
  const labels = {lr:'lrVal',gamma:'gammaVal',eps:'epsVal',decay:'decayVal',epsMin:'epsMinVal',speed:'speedVal'};
  const formatters = {speed: v => `×${v}`, default: v => parseFloat(v).toFixed(id === 'decay' ? 3 : 2)};
  el.addEventListener('input', () => {
    const fmt = id === 'speed' ? formatters.speed : formatters.default;
    document.getElementById(labels[id]).textContent = fmt(el.value);
  });
});

// size tabs
['tab5','tab8','tab10'].forEach(id => {
  document.getElementById(id).addEventListener('click', () => {
    if (running) { running = false; if(animId) cancelAnimationFrame(animId); }
    document.querySelectorAll('.mode-tab').forEach(t => t.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.getElementById('btnStart').disabled = false;
    document.getElementById('btnPause').disabled = true;
    document.getElementById('btnStep').disabled = true;
    document.getElementById('btnPause').textContent = '⏸ PAUSE';
    const size = {'tab5':5,'tab8':8,'tab10':10}[id];
    initGrid(size);
  });
});

// toggles
['heatmapToggle','arrowToggle','numToggle'].forEach(id => {
  document.getElementById(id).addEventListener('click', () => {
    document.getElementById(id).classList.toggle('on');
    drawOverlay();
  });
});

document.getElementById('editToggle').addEventListener('click', () => {
  editing = !editing;
  document.getElementById('editToggle').classList.toggle('on', editing);
});

// grid click — edit or inspect
overlayCanvas.addEventListener('click', (e) => {
  const rect = overlayCanvas.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  const c = Math.floor(mx / CELL), r = Math.floor(my / CELL);
  if (r < 0 || r >= GRID_SIZE || c < 0 || c >= GRID_SIZE) return;

  if (editing) {
    const mode = document.getElementById('paintMode').value;
    if (r === startPos[0] && c === startPos[1]) return;
    if (r === goalPos[0] && c === goalPos[1]) return;
    const map = {wall:'wall', trap:'trap', reward:'goal', erase:'empty'};
    grid[r][c] = map[mode];
    Q[r][c] = [0,0,0,0];
    drawGrid(); drawOverlay();
  } else {
    showQTable(r, c);
    drawGrid(); drawOverlay();
  }
});

// ============================================================
// INIT
// ============================================================
initGrid(5);
