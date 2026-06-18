/* ════════════════════════════
   공통 - 탭 전환
   ════════════════════════════ */
function switchTab(t) {
  const keys = ['coin','dice','number','ladder'];
  document.querySelectorAll('.tab-btn').forEach((b,i) => b.classList.toggle('active', keys[i]===t));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-'+t).classList.add('active');
}

/* ════════════════════════════
   동전 던지기
   - flipCoin()  : 애니메이션 + 앞/뒷면 판정
   - resetCoin() : 카운트 초기화
   ════════════════════════════ */
/* ── COIN ── */
let heads=0, tails=0;
function flipCoin() {
  const svg = document.getElementById('coinSvg');
  svg.classList.remove('flip');
  void svg.offsetWidth;
  svg.classList.add('flip');
  setTimeout(() => {
    const r = Math.random() < 0.5;
    document.getElementById('coinSymbol').textContent = r ? '👑' : '⭐';
    document.getElementById('coinResult').textContent = r ? '앞면 👑' : '뒷면 ⭐';
    if (r) heads++; else tails++;
    document.getElementById('headCount').textContent = heads;
    document.getElementById('tailCount').textContent = tails;
    document.getElementById('totalCount').textContent = heads + tails;
  }, 350);
}
function resetCoin() {
  heads = tails = 0;
  document.getElementById('coinSymbol').textContent = '👑';
  document.getElementById('coinResult').textContent = '눌러서 던지기';
  ['headCount','tailCount','totalCount'].forEach(id => document.getElementById(id).textContent = 0);
}

/* ════════════════════════════
   주사위 굴리기
   - setDiceType()    : 다면체 선택
   - changeDiceCount(): 주사위 개수 조절
   - rollDice()       : 굴리기 애니메이션 + 합계
   ════════════════════════════ */
/* ── DICE ── */
let diceType=4, diceCount=1;
function setDiceType(btn, t) {
  document.querySelectorAll('.dice-type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  diceType = t;
}
function changeDiceCount(d) {
  diceCount = Math.max(1, Math.min(6, diceCount + d));
  document.getElementById('diceCountVal').textContent = diceCount;
  const disp = document.getElementById('diceDisplay');
  disp.innerHTML = '';
  for (let i=0; i<diceCount; i++) {
    const div = document.createElement('div');
    div.className = 'die'; div.id = 'die'+i; div.textContent = '?';
    disp.appendChild(div);
  }
  document.getElementById('diceTotal').textContent = '';
}
function rollDice() {
  const vals = [];
  for (let i=0; i<diceCount; i++) {
    const die = document.getElementById('die'+i);
    die.classList.remove('roll'); void die.offsetWidth; die.classList.add('roll');
    const v = Math.floor(Math.random()*diceType)+1;
    vals.push(v);
    setTimeout((d,v) => { d.textContent = v; }, 250, die, v);
  }
  setTimeout(() => {
    const tot = vals.reduce((a,b)=>a+b,0);
    document.getElementById('diceTotal').innerHTML = diceCount>1 ? `합계: <span>${tot}</span>` : '';
  }, 260);
}

/* ════════════════════════════
   숫자 뽑기
   - pickNumber() : 범위 내 랜덤 정수 생성 + 기록 유지
   ════════════════════════════ */
/* ── NUMBER ── */
let numHistory = [];
function pickNumber() {
  const mn = parseInt(document.getElementById('numMin').value);
  const mx = parseInt(document.getElementById('numMax').value);
  if (isNaN(mn)||isNaN(mx)||mn>mx) { document.getElementById('numResult').textContent='?'; return; }
  const v = Math.floor(Math.random()*(mx-mn+1))+mn;
  const el = document.getElementById('numResult');
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  el.textContent = v;
  numHistory.unshift(v);
  if (numHistory.length > 8) numHistory.pop();
  document.getElementById('numHistory').innerHTML =
    numHistory.slice(1).map(n=>`<span class="num-chip">${n}</span>`).join('');
}

/* ════════════════════════════
   사다리타기
   - initLadderCountBtns() : 인원 수 버튼 생성
   - selectLadderCount()   : 인원 수 선택 → 사다리 빌드
   - generateRungs()       : 가지 생성 (열마다 최소 2개 보장)
   - buildLadder()         : 사다리 구조 계산 + 초기 렌더
   - buildLadderNameInputs(): 이름 입력칸 생성
   - drawLadder()          : Canvas 렌더러 (showRungs, progress)
   - startLadder()         : 가지 공개 + 경로 애니메이션
   - resetLadder()         : 초기 상태로 복원
   ════════════════════════════ */
let ladderN=0, ladderRungs=[], ladderPaths=[], ladderLabels=[], ladderResultMap={};
const LADDER_W=580, LADDER_H=320, LADDER_ROWS=6;

const PASTEL = [
  {bg:'#fde8f5',border:'#f0c0e0',text:'#b05090'},
  {bg:'#e8d8ff',border:'#c9b3f0',text:'#7c4dca'},
  {bg:'#d8f0ff',border:'#a8d8f8',text:'#2878b0'},
  {bg:'#d8f8e8',border:'#a0e0b8',text:'#287850'},
  {bg:'#fff0d8',border:'#f8d898',text:'#a06020'},
  {bg:'#ffd8d8',border:'#f8b0b0',text:'#b04040'},
  {bg:'#e0f0e0',border:'#b0d8b0',text:'#407040'},
  {bg:'#f8e8d0',border:'#e8c898',text:'#906030'},
];

function shuffle(a) {
  const b=[...a];
  for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}
  return b;
}

function generateRungs(n, rows) {
  const r=Array.from({length:rows},()=>Array(n-1).fill(false));
  for(let row=0;row<rows;row++){let c=0;while(c<n-1){if(Math.random()>0.4){r[row][c]=true;c+=2;}else c++;}}
  for(let col=0;col<n-1;col++){
    const cnt=r.reduce((s,row)=>s+(row[col]?1:0),0);
    if(cnt<2){
      const avail=[];
      for(let row=0;row<rows;row++){
        if(!r[row][col]&&(col===0||!r[row][col-1])&&(col>=n-2||!r[row][col+1])) avail.push(row);
      }
      shuffle(avail).slice(0,2-cnt).forEach(row=>{r[row][col]=true;});
    }
  }
  return r;
}

function rr(ctx,x,y,w,h,r){
  ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.arcTo(x+w,y,x+w,y+r,r);
  ctx.lineTo(x+w,y+h-r);ctx.arcTo(x+w,y+h,x+w-r,y+h,r);ctx.lineTo(x+r,y+h);
  ctx.arcTo(x,y+h,x,y+h-r,r);ctx.lineTo(x,y+r);ctx.arcTo(x,y,x+r,y,r);ctx.closePath();
}

(function initLadderCountBtns(){
  const wrap=document.getElementById('ladderCountBtns');
  for(let i=2;i<=8;i++){
    const b=document.createElement('button');
    b.className='ladder-count-btn';b.textContent=i;
    b.onclick=()=>selectLadderCount(i);
    wrap.appendChild(b);
  }
})();

function selectLadderCount(num) {
  ladderN=num;
  document.getElementById('ladderStep1').style.display='none';
  document.getElementById('ladderStep2').style.display='flex';
  buildLadder();
}

function buildLadder() {
  const n=ladderN;
  const margin=44, top=56, bottom=LADDER_H-52;
  const colW=(LADDER_W-margin*2)/(n-1);
  const rowH=(bottom-top)/(LADDER_ROWS+1);

  ladderLabels=shuffle(Array.from({length:n},(_,i)=>`${i+1}등`));
  ladderRungs=generateRungs(n,LADDER_ROWS);

  ladderPaths=Array.from({length:n},(_,startCol)=>{
    let col=startCol;
    const pts=[{x:margin+col*colW,y:top}];
    for(let r=0;r<LADDER_ROWS;r++){
      const y=top+(r+1)*rowH;
      if(col>0&&ladderRungs[r][col-1]){pts.push({x:margin+col*colW,y});col--;pts.push({x:margin+col*colW,y});}
      else if(col<n-1&&ladderRungs[r][col]){pts.push({x:margin+col*colW,y});col++;pts.push({x:margin+col*colW,y});}
      else pts.push({x:margin+col*colW,y});
    }
    pts.push({x:margin+col*colW,y:bottom});
    return{pts,endCol:col};
  });

  ladderResultMap={};
  ladderPaths.forEach((p,i)=>{ladderResultMap[i]=ladderLabels[p.endCol];});

  buildLadderNameInputs(margin,colW);
  const canvas=document.getElementById('ladderCanvas');
  canvas.width=LADDER_W; canvas.height=LADDER_H;
  drawLadder(false);
  document.getElementById('ladderResults').innerHTML='';
  document.getElementById('startLadderBtn').disabled=false;
}

function buildLadderNameInputs(margin,colW) {
  const row=document.getElementById('ladderNameRow');
  row.innerHTML='';
  const cw=document.getElementById('ladderCanvas').offsetWidth||LADDER_W;
  for(let i=0;i<ladderN;i++){
    const wrap=document.createElement('div');
    wrap.className='ladder-name-wrap';
    wrap.style.width=Math.round(colW*(cw/LADDER_W))+'px';
    const inp=document.createElement('input');
    inp.type='text';inp.maxLength=5;inp.placeholder=(i+1)+'번';inp.id='lni'+i;
    const idx=document.createElement('span');
    idx.className='ladder-name-idx';idx.textContent=(i+1);
    wrap.appendChild(inp);wrap.appendChild(idx);
    row.appendChild(wrap);
  }
}

function drawLadder(showRungs, progress=1) {
  const canvas=document.getElementById('ladderCanvas');
  const ctx=canvas.getContext('2d');
  const n=ladderN;
  const margin=44,top=56,bottom=LADDER_H-52;
  const colW=(LADDER_W-margin*2)/(n-1);
  const rowH=(bottom-top)/(LADDER_ROWS+1);
  ctx.clearRect(0,0,LADDER_W,LADDER_H);

  for(let c=0;c<n;c++){
    ctx.beginPath();ctx.moveTo(margin+c*colW,top);ctx.lineTo(margin+c*colW,bottom);
    ctx.strokeStyle='#d4b3f0';ctx.lineWidth=2.5;ctx.stroke();
  }

  if(showRungs){
    for(let r=0;r<LADDER_ROWS;r++){
      for(let c=0;c<n-1;c++){
        if(ladderRungs[r][c]){
          const y=top+(r+1)*rowH;
          ctx.beginPath();ctx.moveTo(margin+c*colW,y);ctx.lineTo(margin+(c+1)*colW,y);
          ctx.strokeStyle='#c9b3f0';ctx.lineWidth=2;ctx.stroke();
        }
      }
    }
  }

  for(let c=0;c<n;c++){
    const x=margin+c*colW,p=PASTEL[c%PASTEL.length];
    const name=document.getElementById('lni'+c)?.value.trim()||(c+1)+'번';
    ctx.fillStyle=p.bg;rr(ctx,x-26,top-38,52,26,8);ctx.fill();
    ctx.strokeStyle=p.border;ctx.lineWidth=1.5;rr(ctx,x-26,top-38,52,26,8);ctx.stroke();
    ctx.fillStyle=p.text;ctx.font='500 12px Outfit,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(name,x,top-25);
  }

  for(let c=0;c<n;c++){
    const x=margin+c*colW,p=PASTEL[c%PASTEL.length];
    ctx.fillStyle=p.bg;rr(ctx,x-26,bottom+10,52,26,8);ctx.fill();
    ctx.strokeStyle=p.border;ctx.lineWidth=1.5;rr(ctx,x-26,bottom+10,52,26,8);ctx.stroke();
    ctx.fillStyle=p.text;ctx.font='500 11px Outfit,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(ladderLabels[c],x,bottom+23);
  }

  if(showRungs&&progress>0){
    ladderPaths.forEach((path,i)=>{
      const p=PASTEL[i%PASTEL.length],pts=path.pts;
      let totalLen=0;const segs=[];
      for(let j=1;j<pts.length;j++){const dx=pts[j].x-pts[j-1].x,dy=pts[j].y-pts[j-1].y;segs.push(Math.sqrt(dx*dx+dy*dy));totalLen+=segs[segs.length-1];}
      const drawLen=totalLen*progress;let drawn=0;
      ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);
      for(let j=0;j<segs.length;j++){
        const rem=drawLen-drawn;if(rem<=0)break;
        const t=Math.min(rem/segs[j],1);
        ctx.lineTo(pts[j].x+(pts[j+1].x-pts[j].x)*t,pts[j].y+(pts[j+1].y-pts[j].y)*t);
        drawn+=segs[j];if(drawn>=drawLen)break;
      }
      ctx.strokeStyle=p.border;ctx.lineWidth=3.5;ctx.stroke();
    });
  }
}

function startLadder() {
  document.getElementById('startLadderBtn').disabled=true;
  const nameArr=Array.from({length:ladderN},(_,i)=>{
    const v=document.getElementById('lni'+i)?.value.trim();
    return v||(i+1)+'번';
  });
  let frame=0;
  const anim=setInterval(()=>{
    frame++;
    drawLadder(true,frame/60);
    if(frame>=60){
      clearInterval(anim);
      const entries=nameArr.map((name,i)=>({name,label:ladderResultMap[i],idx:i}));
      entries.sort((a,b)=>parseInt(a.label)-parseInt(b.label));
      document.getElementById('ladderResults').innerHTML=entries.map(({name,label,idx})=>{
        const p=PASTEL[idx%PASTEL.length];
        return `<span class="ladder-result-chip" style="background:${p.bg};border-color:${p.border};color:${p.text}">${name} → ${label}</span>`;
      }).join('');
    }
  },18);
}

function resetLadder() {
  ladderN=0;ladderRungs=[];ladderPaths=[];ladderLabels=[];ladderResultMap={};
  document.getElementById('ladderStep2').style.display='none';
  document.getElementById('ladderStep1').style.display='';
  document.getElementById('ladderResults').innerHTML='';
}
changeDiceCount(0);
