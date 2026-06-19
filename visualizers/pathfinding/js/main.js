// ── i18n ──
const STRINGS = {
  ko: {
    label_algo: '알고리즘',
    label_tool: '도구',
    label_speed: '속도',
    btn_maze: '미로 ▾',
    btn_run: '▶ 실행',
    btn_clear_path: '경로 지우기',
    btn_reset: '초기화',
    stat_visited: '방문',
    stat_path: '경로 길이',
    stat_cost: '비용',
    leg_start: '시작',
    leg_end: '도착',
    leg_wall: '벽',
    leg_weight: '가중치',
    leg_visited: '방문',
    leg_path: '경로',
    tool_wall_tip: '벽 그리기',
    tool_weight_tip: '가중치 (+5)',
    tool_erase_tip: '지우기',
    maze_recursive: '재귀 분할',
    maze_random: '랜덤 벽',
    maze_spiral: '나선형',
    algo_astar: 'A* (맨해튼)',
    algo_astar_e: 'A* (유클리드)',
    algo_greedy: 'Greedy Best-First',
    status_init: '벽 그리기 (클릭/드래그) · S/E 드래그로 이동 · SPACE로 실행',
    status_running: '실행 중',
    status_done: '완료',
    status_visited: '방문',
    status_pathlen: '경로 길이',
    status_cancelled: '취소됨',
    status_no_path: '경로 없음!',
    status_maze: '미로 생성 완료 · 실행 버튼을 누르세요',
    status_reset: '초기화 완료 · 벽을 그리고 실행하세요',
    algo_name_astar: 'A* 맨해튼',
    algo_name_astar_e: 'A* 유클리드',
    algo_name_dijkstra: 'Dijkstra',
    algo_name_bfs: 'BFS',
    algo_name_dfs: 'DFS',
    algo_name_greedy: 'Greedy Best-First',
  },
  en: {
    label_algo: 'ALGO',
    label_tool: 'TOOL',
    label_speed: 'SPEED',
    btn_maze: 'MAZE ▾',
    btn_run: '▶ RUN',
    btn_clear_path: 'CLEAR PATH',
    btn_reset: 'RESET',
    stat_visited: 'VISITED',
    stat_path: 'PATH LEN',
    stat_cost: 'COST',
    leg_start: 'Start',
    leg_end: 'End',
    leg_wall: 'Wall',
    leg_weight: 'Weight',
    leg_visited: 'Visited',
    leg_path: 'Path',
    tool_wall_tip: 'Wall',
    tool_weight_tip: 'Weight (+5)',
    tool_erase_tip: 'Erase',
    maze_recursive: 'Recursive Division',
    maze_random: 'Random Walls',
    maze_spiral: 'Spiral',
    algo_astar: 'A* (Manhattan)',
    algo_astar_e: 'A* (Euclidean)',
    algo_greedy: 'Greedy Best-First',
    status_init: 'Draw walls (click/drag) · Drag S/E to move · Press SPACE to run',
    status_running: 'Running',
    status_done: 'Done',
    status_visited: 'visited',
    status_pathlen: 'path length',
    status_cancelled: 'Cancelled',
    status_no_path: 'No path found!',
    status_maze: 'Maze generated · Press RUN',
    status_reset: 'Grid reset · Draw walls · Press RUN',
    algo_name_astar: 'A* Manhattan',
    algo_name_astar_e: 'A* Euclidean',
    algo_name_dijkstra: 'Dijkstra',
    algo_name_bfs: 'BFS',
    algo_name_dfs: 'DFS',
    algo_name_greedy: 'Greedy Best-First',
  }
};

let lang = 'ko';

function t(key) { return STRINGS[lang][key] || key; }

function applyLang() {
  document.documentElement.lang = lang;
  // data-i18n 텍스트
  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  // data-i18n-title (tool-btn tooltips)
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });
  // select options
  const algoSelect = document.getElementById('algoSelect');
  algoSelect.querySelectorAll('[data-i18n-opt]').forEach(opt => {
    opt.textContent = t(opt.dataset.i18nOpt);
  });
  // 언어 버튼 표시
  document.getElementById('langBtn').textContent = lang === 'ko' ? 'EN' : '한';
}

document.getElementById('langBtn').onclick = () => {
  lang = lang === 'ko' ? 'en' : 'ko';
  applyLang();
  // 현재 상태 메시지 재출력
  setStatus(t('status_init'));
};

// ── Constants & State ──
const CELL = 24;
const canvas = document.getElementById('grid');
const ctx = canvas.getContext('2d');
const EMPTY=0, WALL=1, START=2, END=3, VISITED=4, PATH=5, WEIGHT=6;
let grid=[], cols=0, rows=0;
let startPos={r:0,c:0}, endPos={r:0,c:0};
let running=false, currentTool='wall', dragging=null, mouseDown=false;
let animSpeed=3, cancelFlag=false;

// ── Init ──
function initGrid() {
  const wrap = document.getElementById('canvasWrap');
  cols = Math.floor(wrap.clientWidth / CELL);
  rows = Math.floor(wrap.clientHeight / CELL);
  canvas.width = cols * CELL;
  canvas.height = rows * CELL;
  grid = Array.from({length:rows}, () => new Array(cols).fill(EMPTY));
  startPos = {r: Math.floor(rows/2), c: Math.floor(cols*0.15)};
  endPos   = {r: Math.floor(rows/2), c: Math.floor(cols*0.85)};
  grid[startPos.r][startPos.c] = START;
  grid[endPos.r][endPos.c] = END;
  resetStats();
  render();
}

// ── Render ──
function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#0d0d14';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#ffffff06';
  ctx.lineWidth = 0.5;
  for (let r=0;r<=rows;r++){ctx.beginPath();ctx.moveTo(0,r*CELL);ctx.lineTo(cols*CELL,r*CELL);ctx.stroke();}
  for (let c=0;c<=cols;c++){ctx.beginPath();ctx.moveTo(c*CELL,0);ctx.lineTo(c*CELL,rows*CELL);ctx.stroke();}
  for (let r=0;r<rows;r++) for (let c=0;c<cols;c++) drawCell(r,c,grid[r][c]);
}

function drawCell(r, c, type) {
  const x=c*CELL, y=r*CELL, p=1;
  ctx.save();
  switch(type) {
    case WALL:
      ctx.fillStyle='#1e1e2a'; ctx.fillRect(x+p,y+p,CELL-2*p,CELL-2*p);
      ctx.strokeStyle='#3a3a4a'; ctx.lineWidth=0.5; ctx.strokeRect(x+p,y+p,CELL-2*p,CELL-2*p); break;
    case WEIGHT:
      ctx.fillStyle='#3d1a6e'; ctx.fillRect(x+p,y+p,CELL-2*p,CELL-2*p);
      ctx.strokeStyle='#7c3aed66'; ctx.lineWidth=1; ctx.strokeRect(x+p,y+p,CELL-2*p,CELL-2*p);
      ctx.fillStyle='#a78bfa'; ctx.font=`bold ${CELL*.45}px Space Mono`;
      ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('5',x+CELL/2,y+CELL/2); break;
    case VISITED: {
      const g=ctx.createRadialGradient(x+CELL/2,y+CELL/2,0,x+CELL/2,y+CELL/2,CELL/2);
      g.addColorStop(0,'#00e5ff22'); g.addColorStop(1,'#00e5ff08');
      ctx.fillStyle=g; ctx.fillRect(x+p,y+p,CELL-2*p,CELL-2*p);
      ctx.strokeStyle='#00e5ff18'; ctx.lineWidth=0.5; ctx.strokeRect(x+p,y+p,CELL-2*p,CELL-2*p); break;
    }
    case PATH: {
      const g=ctx.createLinearGradient(x,y,x+CELL,y+CELL);
      g.addColorStop(0,'#f59e0b'); g.addColorStop(1,'#fbbf24');
      ctx.fillStyle=g; ctx.fillRect(x+p,y+p,CELL-2*p,CELL-2*p);
      ctx.strokeStyle='#fde68a66'; ctx.lineWidth=0.5; ctx.strokeRect(x+p,y+p,CELL-2*p,CELL-2*p); break;
    }
    case START: drawSpecial(ctx,x,y,'#22c55e','#4ade80','▶'); break;
    case END:   drawSpecial(ctx,x,y,'#ef4444','#f87171','⬡'); break;
  }
  ctx.restore();
}

function drawSpecial(ctx,x,y,color,light,icon) {
  const p=2;
  ctx.fillStyle=color+'33'; ctx.fillRect(x+p,y+p,CELL-2*p,CELL-2*p);
  ctx.strokeStyle=color; ctx.lineWidth=1.5;
  ctx.shadowColor=color; ctx.shadowBlur=8;
  ctx.strokeRect(x+p,y+p,CELL-2*p,CELL-2*p);
  ctx.shadowBlur=0;
  ctx.fillStyle=light; ctx.font=`bold ${CELL*.5}px sans-serif`;
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(icon,x+CELL/2,y+CELL/2);
}

// ── Mouse ──
function getCellFromEvent(e) {
  const rect=canvas.getBoundingClientRect();
  return {r:Math.floor((e.clientY-rect.top)/CELL), c:Math.floor((e.clientX-rect.left)/CELL)};
}
function isValid(r,c){return r>=0&&r<rows&&c>=0&&c<cols;}

canvas.addEventListener('mousedown', e=>{
  if(running) return;
  mouseDown=true;
  const {r,c}=getCellFromEvent(e);
  if(!isValid(r,c)) return;
  if(grid[r][c]===START){dragging='start';return;}
  if(grid[r][c]===END){dragging='end';return;}
  applyTool(r,c); render();
});
canvas.addEventListener('mousemove', e=>{
  if(!mouseDown||running) return;
  const {r,c}=getCellFromEvent(e);
  if(!isValid(r,c)) return;
  if(dragging==='start'){
    if(grid[r][c]!==END){grid[startPos.r][startPos.c]=EMPTY;startPos={r,c};grid[r][c]=START;clearPathOnly();render();}return;
  }
  if(dragging==='end'){
    if(grid[r][c]!==START){grid[endPos.r][endPos.c]=EMPTY;endPos={r,c};grid[r][c]=END;clearPathOnly();render();}return;
  }
  applyTool(r,c); render();
});
canvas.addEventListener('mouseup',()=>{mouseDown=false;dragging=null;});
canvas.addEventListener('mouseleave',()=>{mouseDown=false;dragging=null;});

function applyTool(r,c){
  const cur=grid[r][c];
  if(cur===START||cur===END) return;
  if(currentTool==='wall')   grid[r][c]=(cur===WALL)?EMPTY:WALL;
  if(currentTool==='weight') grid[r][c]=(cur===WEIGHT)?EMPTY:WEIGHT;
  if(currentTool==='erase')  grid[r][c]=EMPTY;
  clearPathOnly();
}

// ── Tool buttons ──
document.getElementById('toolWall').onclick=()=>setTool('wall');
document.getElementById('toolWeight').onclick=()=>setTool('weight');
document.getElementById('toolErase').onclick=()=>setTool('erase');
function setTool(t){
  currentTool=t;
  document.getElementById('toolWall').classList.toggle('active',t==='wall');
  document.getElementById('toolWeight').classList.toggle('active',t==='weight');
  document.getElementById('toolErase').classList.toggle('active',t==='erase');
}
document.getElementById('speedSlider').oninput=e=>{animSpeed=+e.target.value;};

// ── Maze dropdown ──
document.getElementById('mazeBtn').onclick=e=>{
  e.stopPropagation();
  document.getElementById('mazeMenu').classList.toggle('open');
};
document.addEventListener('click',()=>document.getElementById('mazeMenu').classList.remove('open'));
document.querySelectorAll('.dropdown-item').forEach(item=>{
  item.onclick=()=>{
    if(running) return;
    generateMaze(item.dataset.maze);
    document.getElementById('mazeMenu').classList.remove('open');
  };
});

// ── Clear ──
document.getElementById('clearPathBtn').onclick=()=>{
  if(running){cancelFlag=true;return;}
  clearPathOnly(); resetStats(); render();
};
document.getElementById('clearAllBtn').onclick=()=>{
  if(running){cancelFlag=true;return;}
  initGrid(); setStatus(t('status_reset'));
};
function clearPathOnly(){
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++)
    if(grid[r][c]===VISITED||grid[r][c]===PATH) grid[r][c]=EMPTY;
  resetStats();
}
function resetStats(){
  document.getElementById('statVisited').textContent='0';
  document.getElementById('statPath').textContent='0';
  document.getElementById('statCost').textContent='0';
}
function setStatus(msg, type=''){
  const el=document.getElementById('statusMsg');
  el.textContent=msg;
  el.className='status-msg'+(type?' '+type:'');
}

// ── Run ──
document.getElementById('runBtn').onclick=async()=>{
  if(running) return;
  clearPathOnly(); render();
  await runAlgorithm(document.getElementById('algoSelect').value);
};

async function runAlgorithm(algo){
  running=true; cancelFlag=false;
  document.getElementById('runBtn').disabled=true;
  setStatus(`${t('status_running')} · ${algoName(algo)}...`);
  const result=await algorithmMap[algo]();
  running=false;
  document.getElementById('runBtn').disabled=false;
  if(cancelFlag){setStatus(t('status_cancelled'),'warn');return;}
  if(!result||result.path.length===0){setStatus(t('status_no_path'),'err');return;}
  setStatus(`${t('status_done')} · ${algoName(algo)} · ${result.visited} ${t('status_visited')} · ${t('status_pathlen')} ${result.path.length}`);
}

function algoName(a){
  const map={
    astar:'algo_name_astar', astar_euclidean:'algo_name_astar_e',
    dijkstra:'algo_name_dijkstra', bfs:'algo_name_bfs',
    dfs:'algo_name_dfs', greedy:'algo_name_greedy'
  };
  return t(map[a]);
}

// ── Animation ──
const speedDelay=()=>[0,20,10,4,1,0][animSpeed];
let animBatch=0;

async function animateVisit(r,c){
  if(cancelFlag) return;
  grid[r][c]=VISITED;
  document.getElementById('statVisited').textContent=++animBatch;
  drawCell(r,c,VISITED);
  if(speedDelay()>0) await sleep(speedDelay());
  else if(animBatch%20===0) await sleep(0);
}
async function animatePath(path,cost){
  animBatch=0;
  for(const [r,c] of path){
    if(cancelFlag) return;
    if(grid[r][c]!==START&&grid[r][c]!==END) grid[r][c]=PATH;
    animBatch++;
    drawCell(r,c,PATH);
    document.getElementById('statPath').textContent=animBatch;
    document.getElementById('statCost').textContent=cost;
    await sleep(18);
  }
}
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}

// ── Priority Queue ──
class PQ{
  constructor(){this.h=[];}
  push(item,prio){this.h.push({item,prio});this.h.sort((a,b)=>a.prio-b.prio);}
  pop(){return this.h.shift().item;}
  get size(){return this.h.length;}
}

function neighbors(r,c){return[[r-1,c],[r+1,c],[r,c-1],[r,c+1]];}
function cellCost(r,c){return grid[r][c]===WEIGHT?5:1;}
const h_manhattan=(r1,c1,r2,c2)=>Math.abs(r1-r2)+Math.abs(c1-c2);
const h_euclidean=(r1,c1,r2,c2)=>Math.sqrt((r1-r2)**2+(c1-c2)**2);
const h_zero=()=>0;

function makeSearchFn(heuristic){
  return async()=>{
    const{r:sr,c:sc}=startPos,{r:er,c:ec}=endPos;
    const dist=Array.from({length:rows},()=>new Array(cols).fill(Infinity));
    const prev=Array.from({length:rows},()=>new Array(cols).fill(null));
    dist[sr][sc]=0;
    const pq=new PQ(); pq.push([sr,sc],0);
    let visitedCount=0;
    while(pq.size>0){
      if(cancelFlag) return null;
      const[r,c]=pq.pop();
      if(r===er&&c===ec) break;
      for(const[nr,nc] of neighbors(r,c)){
        if(!isValid(nr,nc)) continue;
        const t=grid[nr][nc];
        if(t===WALL||t===VISITED) continue;
        const nd=dist[r][c]+cellCost(nr,nc);
        if(nd<dist[nr][nc]){
          dist[nr][nc]=nd; prev[nr][nc]=[r,c];
          pq.push([nr,nc],nd+heuristic(nr,nc,er,ec));
        }
      }
      if(grid[r][c]!==START&&grid[r][c]!==END){await animateVisit(r,c);visitedCount++;}
    }
    const path=[]; let cur=[er,ec];
    while(cur&&!(cur[0]===sr&&cur[1]===sc)){path.unshift(cur);cur=prev[cur[0]][cur[1]];}
    if(!cur) return{path:[],visited:visitedCount};
    await animatePath(path,Math.round(dist[er][ec]));
    return{path,visited:visitedCount};
  };
}

async function bfs(){
  const{r:sr,c:sc}=startPos,{r:er,c:ec}=endPos;
  const vis=Array.from({length:rows},()=>new Array(cols).fill(false));
  const prev=Array.from({length:rows},()=>new Array(cols).fill(null));
  const queue=[[sr,sc]]; vis[sr][sc]=true; let vCount=0;
  while(queue.length>0){
    if(cancelFlag) return null;
    const[r,c]=queue.shift();
    if(r===er&&c===ec) break;
    for(const[nr,nc] of neighbors(r,c)){
      if(!isValid(nr,nc)||vis[nr][nc]||grid[nr][nc]===WALL) continue;
      vis[nr][nc]=true; prev[nr][nc]=[r,c]; queue.push([nr,nc]);
    }
    if(grid[r][c]!==START&&grid[r][c]!==END){await animateVisit(r,c);vCount++;}
  }
  const path=[]; let cur=[er,ec];
  while(cur&&!(cur[0]===sr&&cur[1]===sc)){path.unshift(cur);cur=prev[cur[0]][cur[1]];}
  if(!cur) return{path:[],visited:vCount};
  await animatePath(path,path.length);
  return{path,visited:vCount};
}

async function dfs(){
  const{r:sr,c:sc}=startPos,{r:er,c:ec}=endPos;
  const vis=Array.from({length:rows},()=>new Array(cols).fill(false));
  const prev=Array.from({length:rows},()=>new Array(cols).fill(null));
  const stack=[[sr,sc]]; let vCount=0,found=false;
  while(stack.length>0&&!found){
    if(cancelFlag) return null;
    const[r,c]=stack.pop();
    if(vis[r][c]) continue;
    vis[r][c]=true;
    if(grid[r][c]!==START&&grid[r][c]!==END){await animateVisit(r,c);vCount++;}
    if(r===er&&c===ec){found=true;break;}
    for(const[nr,nc] of neighbors(r,c)){
      if(!isValid(nr,nc)||vis[nr][nc]||grid[nr][nc]===WALL) continue;
      prev[nr][nc]=[r,c]; stack.push([nr,nc]);
    }
  }
  if(!found) return{path:[],visited:vCount};
  const path=[]; let cur=[er,ec];
  while(cur&&!(cur[0]===sr&&cur[1]===sc)){path.unshift(cur);cur=prev[cur[0]][cur[1]];}
  if(!cur) return{path:[],visited:vCount};
  await animatePath(path,path.length);
  return{path,visited:vCount};
}

const algorithmMap={
  astar:makeSearchFn(h_manhattan),
  astar_euclidean:makeSearchFn(h_euclidean),
  dijkstra:makeSearchFn(h_zero),
  bfs, dfs,
  greedy:makeSearchFn((r1,c1,r2,c2)=>h_manhattan(r1,c1,r2,c2)*100),
};

// ── Maze ──
function generateMaze(type){
  clearPathOnly();
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++)
    if(grid[r][c]!==START&&grid[r][c]!==END) grid[r][c]=EMPTY;
  if(type==='random') mazeRandom();
  else if(type==='recursive') mazeRecursive();
  else if(type==='spiral') mazeSpiral();
  grid[startPos.r][startPos.c]=START;
  grid[endPos.r][endPos.c]=END;
  render(); setStatus(t('status_maze'));
}
function mazeRandom(){
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++)
    if(Math.random()<0.3&&grid[r][c]!==START&&grid[r][c]!==END) grid[r][c]=WALL;
}
function mazeRecursive(){
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++) grid[r][c]=WALL;
  function carve(r,c){
    grid[r][c]=EMPTY;
    const dirs=[[0,2],[0,-2],[2,0],[-2,0]].sort(()=>Math.random()-0.5);
    for(const[dr,dc] of dirs){
      const nr=r+dr,nc=c+dc;
      if(isValid(nr,nc)&&grid[nr][nc]===WALL){grid[r+dr/2][c+dc/2]=EMPTY;carve(nr,nc);}
    }
  }
  const sr=1+2*Math.floor(Math.random()*Math.floor((rows-1)/2));
  const sc=1+2*Math.floor(Math.random()*Math.floor((cols-1)/2));
  carve(Math.min(sr,rows-2),Math.min(sc,cols-2));
}
function mazeSpiral(){
  let r1=0,c1=0,r2=rows-1,c2=cols-1,turn=0;
  while(r1<r2&&c1<c2){
    if(turn%4===0) for(let c=c1;c<c2;c++) setWall(r1,c);
    else if(turn%4===1) for(let r=r1;r<r2;r++) setWall(r,c2);
    else if(turn%4===2) for(let c=c2;c>c1;c--) setWall(r2,c);
    else for(let r=r2;r>r1;r--) setWall(r,c1);
    r1+=2;c1+=2;r2-=2;c2-=2;turn++;
  }
  for(let r=0;r<rows;r++) for(let c=0;c<cols;c++)
    if(grid[r][c]===WALL&&Math.random()<0.05) grid[r][c]=EMPTY;
}
function setWall(r,c){if(!isValid(r,c)||grid[r][c]===START||grid[r][c]===END) return; grid[r][c]=WALL;}

// ── Keyboard ──
document.addEventListener('keydown',e=>{
  if(e.code==='Space'){e.preventDefault();document.getElementById('runBtn').click();}
  if(e.code==='KeyR') document.getElementById('clearAllBtn').click();
  if(e.code==='KeyC') document.getElementById('clearPathBtn').click();
  if(e.code==='Digit1') setTool('wall');
  if(e.code==='Digit2') setTool('weight');
  if(e.code==='Digit3') setTool('erase');
  if(e.code==='KeyL'){ lang=lang==='ko'?'en':'ko'; applyLang(); setStatus(t('status_init')); }
});

// ── Resize ──
let resizeTimer;
window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(initGrid,150);});

// ── Start ──
applyLang();
initGrid();
setStatus(t('status_init'));
