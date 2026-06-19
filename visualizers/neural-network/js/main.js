// ══════════════════════════════════════════
//  Neural Network — pure Vanilla JS
// ══════════════════════════════════════════

// ── Activation functions ──
const ACT = {
  tanh: {
    f: x => Math.tanh(x),
    d: x => 1 - Math.tanh(x)**2
  },
  relu: {
    f: x => Math.max(0, x),
    d: x => x > 0 ? 1 : 0
  },
  sigmoid: {
    f: x => 1 / (1 + Math.exp(-x)),
    d: x => { const s = 1/(1+Math.exp(-x)); return s*(1-s); }
  }
};

// ── Matrix ops ──
function matMul(A, B) {
  const r=A.length, k=A[0].length, c=B[0].length;
  const C=Array.from({length:r},()=>new Array(c).fill(0));
  for(let i=0;i<r;i++) for(let j=0;j<c;j++) for(let l=0;l<k;l++) C[i][j]+=A[i][l]*B[l][j];
  return C;
}
function transpose(A){return A[0].map((_,j)=>A.map(r=>r[j]));}

// ── Network class ──
class Network {
  constructor(sizes, actName) {
    this.sizes = sizes;
    this.actName = actName;
    this.act = ACT[actName];
    this.reset();
  }

  reset() {
    this.weights = [];
    this.biases  = [];
    this.act = ACT[this.actName];
    for (let i = 0; i < this.sizes.length - 1; i++) {
      const fan_in = this.sizes[i];
      const fan_out = this.sizes[i+1];
      const scale = Math.sqrt(2.0 / fan_in); // He init
      this.weights.push(
        Array.from({length: fan_out}, () =>
          Array.from({length: fan_in}, () => (Math.random()*2-1)*scale))
      );
      this.biases.push(new Array(fan_out).fill(0));
    }
  }

  forward(x) {
    // x: [n, input_size]
    let a = x;
    const As = [a], Zs = [];
    for (let l = 0; l < this.weights.length; l++) {
      const W = this.weights[l]; // [out, in]
      const b = this.biases[l];  // [out]
      const z = a.map(row => W.map((wRow, j) =>
        wRow.reduce((s,w,k) => s + w*row[k], 0) + b[j]
      ));
      Zs.push(z);
      const isLast = l === this.weights.length - 1;
      a = isLast
        ? z.map(row => row.map(v => ACT.sigmoid.f(v))) // sigmoid output for binary
        : z.map(row => row.map(v => this.act.f(v)));
      As.push(a);
    }
    return { As, Zs };
  }

  loss(pred, y) {
    // Binary cross-entropy
    let l = 0;
    for (let i = 0; i < pred.length; i++) {
      const p = Math.max(1e-7, Math.min(1-1e-7, pred[i][0]));
      l -= y[i]*Math.log(p) + (1-y[i])*Math.log(1-p);
    }
    return l / pred.length;
  }

  backward(As, Zs, y, lr) {
    const L = this.weights.length;
    const n = As[0].length;
    const dW = this.weights.map(w => w.map(r => r.map(()=>0)));
    const db = this.biases.map(b => b.map(()=>0));

    // Output delta (BCE + sigmoid combined)
    let delta = As[L].map((row, i) => row.map((a,j) => (a - y[i])));

    for (let l = L-1; l >= 0; l--) {
      // dW[l] = delta^T . As[l] / n
      const At = transpose(As[l]);
      const dw = matMul(transpose(delta), At).map(r => r.map(v => v/n));
      const dbv = delta[0].map((_,j) => delta.reduce((s,r)=>s+r[j],0)/n);
      dW[l] = dw; db[l] = dbv;

      if (l > 0) {
        // Propagate: delta = (delta . W[l]) * act'(Z[l-1])
        const isLast_hidden = l-1 === L-2;
        delta = delta.map((row, i) =>
          this.weights[l][0].map((_, k) =>
            row.reduce((s, d, j) => s + d * this.weights[l][j][k], 0) *
            this.act.d(Zs[l-1][i][k])
          )
        );
      }

      // Update
      for (let j = 0; j < this.weights[l].length; j++) {
        for (let k = 0; k < this.weights[l][j].length; k++) {
          this.weights[l][j][k] -= lr * dW[l][j][k];
        }
        this.biases[l][j] -= lr * db[l][j];
      }
    }
  }

  trainBatch(X, y, lr) {
    const {As, Zs} = this.forward(X);
    const pred = As[As.length-1];
    const l = this.loss(pred, y);
    this.backward(As, Zs, y, lr);
    return l;
  }

  predict(x) {
    const {As} = this.forward(x);
    return As[As.length-1];
  }
}

// ══════════════════════════════════════════
//  Dataset generators
// ══════════════════════════════════════════
function generateData(type, n, noise) {
  const X=[], y=[];
  const nf = noise/100;
  function rn() { return (Math.random()-0.5)*2*nf; }

  if (type === 'xor') {
    for (let i=0;i<n;i++) {
      const x1=(Math.random()*2-1), x2=(Math.random()*2-1);
      const label = (x1*x2>0)?0:1;
      X.push([x1+rn(), x2+rn()]); y.push(label);
    }
  } else if (type === 'circle') {
    for (let i=0;i<n;i++) {
      const r = Math.random(), theta = Math.random()*2*Math.PI;
      const x1=r*Math.cos(theta)+rn(), x2=r*Math.sin(theta)+rn();
      y.push(r<0.5?0:1); X.push([x1,x2]);
    }
  } else if (type === 'spiral') {
    for (let c=0;c<2;c++) {
      for (let i=0;i<n/2;i++) {
        const t = i/(n/2)*Math.PI*3;
        const r = t/(Math.PI*3)*0.9;
        const x1 = r*Math.cos(t+c*Math.PI)+rn()*0.3;
        const x2 = r*Math.sin(t+c*Math.PI)+rn()*0.3;
        X.push([x1,x2]); y.push(c);
      }
    }
  } else { // gaussian
    for (let i=0;i<n/2;i++) {
      X.push([gauss(-0.5,0.3)+rn(), gauss(0,0.3)+rn()]); y.push(0);
      X.push([gauss(0.5,0.3)+rn(), gauss(0,0.3)+rn()]); y.push(1);
    }
  }
  return {X, y};
}

function gauss(mu, sigma) {
  let u=0,v=0;
  while(!u) u=Math.random();
  while(!v) v=Math.random();
  return mu+sigma*Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
}

// ══════════════════════════════════════════
//  UI State
// ══════════════════════════════════════════
let hiddenLayers = [4, 4]; // hidden layer sizes
let data = null;
let net  = null;
let running = false;
let animId  = null;
let epoch   = 0;
let lossHistory = [];

const bCanvas  = document.getElementById('boundaryCanvas');
const bCtx     = bCanvas.getContext('2d');
const lCanvas  = document.getElementById('lossCanvas');
const lCtx     = lCanvas.getContext('2d');
const nCanvas  = document.getElementById('netCanvas');
const nCtx     = nCanvas.getContext('2d');
const dCanvas  = document.getElementById('dataCanvas');
const dCtx     = dCanvas.getContext('2d');

// ── Layer builder UI ──
function buildLayerUI() {
  const builder = document.getElementById('layerBuilder');
  builder.innerHTML = '';

  // Input layer
  const inputRow = makeLayerRow('INPUT', 2, false, false);
  builder.appendChild(inputRow);

  // Hidden layers
  hiddenLayers.forEach((n, i) => {
    const row = makeLayerRow(`H${i+1}`, n, true, hiddenLayers.length > 1);
    row.querySelector('input[type=number]').addEventListener('change', e => {
      hiddenLayers[i] = Math.max(1, Math.min(8, +e.target.value));
      rebuildNet();
      buildLayerUI();
    });
    row.querySelector('.layer-rm-btn')?.addEventListener('click', () => {
      hiddenLayers.splice(i, 1);
      rebuildNet();
      buildLayerUI();
    });
    builder.appendChild(row);
  });

  // Output layer
  const outRow = makeLayerRow('OUT', 1, false, false);
  builder.appendChild(outRow);
}

function makeLayerRow(label, n, editable, removable) {
  const row = document.createElement('div');
  row.className = 'layer-row';
  row.innerHTML = `<span class="ltype">${label}</span>`;

  if (editable) {
    const inp = document.createElement('input');
    inp.type='number'; inp.min=1; inp.max=8; inp.value=n;
    row.appendChild(inp);
  } else {
    const span = document.createElement('span');
    span.style.cssText='font-family:IBM Plex Mono,monospace;font-size:12px;font-weight:500;width:40px;text-align:center';
    span.textContent=n;
    row.appendChild(span);
  }

  const dots = document.createElement('div');
  dots.className = 'lnodes';
  const shown = Math.min(n, 6);
  for (let i=0;i<shown;i++) {
    const d = document.createElement('div');
    d.className='node-dot'+(label==='OUT'?' out-pos':'');
    dots.appendChild(d);
  }
  if (n > 6) {
    const m=document.createElement('span');
    m.style.cssText='font-size:9px;color:#888';
    m.textContent=`+${n-6}`;
    dots.appendChild(m);
  }
  row.appendChild(dots);

  if (removable) {
    const rm = document.createElement('button');
    rm.className='layer-rm-btn'; rm.textContent='×';
    row.appendChild(rm);
  }
  return row;
}

document.getElementById('addLayerBtn').onclick = () => {
  if (hiddenLayers.length >= 6) return;
  hiddenLayers.push(4);
  rebuildNet();
  buildLayerUI();
};

// ── Build network ──
function getNetSizes() {
  return [2, ...hiddenLayers, 1];
}

function rebuildNet() {
  const actName = document.getElementById('actSelect').value;
  net = new Network(getNetSizes(), actName);
  epoch = 0; lossHistory = [];
  updateMetrics(0, null, null);
  drawBoundary();
  drawLoss();
  drawNetDiagram();
}

function getLR()    { return parseFloat(document.getElementById('lrSelect').value); }
function getBatch() { return parseInt(document.getElementById('batchSelect').value); }

// ── Data ──
function regenData() {
  const type   = document.getElementById('datasetSelect').value;
  const noise  = parseInt(document.getElementById('noiseSlider').value);
  const n      = parseInt(document.getElementById('sampleSlider').value);
  data = generateData(type, n, noise);
  drawDataPreview();
  epoch = 0; lossHistory = [];
  updateMetrics(0, null, null);
  drawBoundary();
  drawLoss();
}

// ── Training loop ──
let stepsPerFrame = 5;

function trainStep() {
  if (!data || !net) return;
  const lr = getLR();
  const bs = getBatch();
  const {X, y} = data;

  // Shuffle mini-batch
  const idx = Array.from({length:X.length},(_,i)=>i).sort(()=>Math.random()-0.5);
  let totalLoss = 0, batches = 0;

  for (let i=0; i<X.length; i+=bs) {
    const slice = idx.slice(i,i+bs);
    const Xb = slice.map(j=>X[j]);
    const yb = slice.map(j=>[y[j]]);
    totalLoss += net.trainBatch(Xb, yb, lr);
    batches++;
  }

  epoch++;
  const avgLoss = totalLoss/batches;
  lossHistory.push(avgLoss);
  if (lossHistory.length > 300) lossHistory.shift();

  // Accuracy
  const pred = net.predict(X);
  const acc = pred.reduce((s,p,i)=> s+(+(p[0]>0.5)===y[i]?1:0),0)/y.length;

  updateMetrics(epoch, avgLoss, acc);
  return avgLoss;
}

function updateMetrics(ep, loss, acc) {
  document.getElementById('hEpoch').textContent = ep;
  document.getElementById('hLoss').textContent  = loss!=null ? loss.toFixed(4) : '—';
  document.getElementById('hAcc').textContent   = acc!=null ? (acc*100).toFixed(1)+'%' : '—';
  document.getElementById('mEpoch').textContent = ep;
  document.getElementById('mLoss').textContent  = loss!=null ? loss.toFixed(4) : '—';
  document.getElementById('mAcc').textContent   = acc!=null ? (acc*100).toFixed(1)+'%' : '—';
  document.getElementById('mLr').textContent    = getLR();
  document.getElementById('epochBadge').textContent = `epoch ${ep}`;
}

function loop() {
  if (!running) return;
  for (let s=0; s<stepsPerFrame; s++) trainStep();
  drawBoundary();
  drawLoss();
  drawNetDiagram();
  animId = requestAnimationFrame(loop);
}

// ── Render: Decision Boundary ──
const GRID = 60;

function drawBoundary() {
  const wrap = document.getElementById('canvasWrap');
  const w = wrap.clientWidth - 32;
  const h = wrap.clientHeight - 32;
  const size = Math.min(w, h, 500);
  bCanvas.width = size; bCanvas.height = size;

  const imgData = bCtx.createImageData(size, size);

  if (net) {
    // Build grid inputs
    const pts = [];
    for (let py=0;py<size;py++) for (let px=0;px<size;px++) {
      pts.push([px/size*2-1, -(py/size*2-1)]);
    }
    // Batch predict (chunked to avoid stack overflow)
    const chunk = 2000;
    const preds = [];
    for (let i=0;i<pts.length;i+=chunk) {
      const p = net.predict(pts.slice(i,i+chunk));
      p.forEach(r=>preds.push(r[0]));
    }
    for (let i=0;i<preds.length;i++) {
      const v = preds[i];
      const r4 = i*4;
      if (v < 0.5) {
        // blue tint
        const t = (0.5-v)*2;
        imgData.data[r4]   = Math.round(255 - t*120);
        imgData.data[r4+1] = Math.round(255 - t*100);
        imgData.data[r4+2] = 255;
        imgData.data[r4+3] = 180;
      } else {
        // red tint
        const t = (v-0.5)*2;
        imgData.data[r4]   = 255;
        imgData.data[r4+1] = Math.round(255 - t*120);
        imgData.data[r4+2] = Math.round(255 - t*120);
        imgData.data[r4+3] = 180;
      }
    }
  } else {
    for (let i=0;i<size*size*4;i+=4) {
      imgData.data[i]=imgData.data[i+1]=imgData.data[i+2]=250;
      imgData.data[i+3]=255;
    }
  }
  bCtx.putImageData(imgData, 0, 0);

  // Draw data points
  if (data) {
    data.X.forEach((pt,i) => {
      const px = (pt[0]+1)/2*size;
      const py = (-pt[1]+1)/2*size;
      bCtx.beginPath();
      bCtx.arc(px, py, 4, 0, Math.PI*2);
      bCtx.fillStyle = data.y[i]===0 ? '#2563eb' : '#dc2626';
      bCtx.strokeStyle = '#fff';
      bCtx.lineWidth = 1.5;
      bCtx.fill();
      bCtx.stroke();
    });
  }

  // Grid lines
  bCtx.strokeStyle = 'rgba(0,0,0,0.06)';
  bCtx.lineWidth = 0.5;
  for (let i=1;i<4;i++) {
    bCtx.beginPath(); bCtx.moveTo(i*size/4,0); bCtx.lineTo(i*size/4,size); bCtx.stroke();
    bCtx.beginPath(); bCtx.moveTo(0,i*size/4); bCtx.lineTo(size,i*size/4); bCtx.stroke();
  }
  // Axes
  bCtx.strokeStyle='rgba(0,0,0,0.15)'; bCtx.lineWidth=1;
  bCtx.beginPath(); bCtx.moveTo(size/2,0); bCtx.lineTo(size/2,size); bCtx.stroke();
  bCtx.beginPath(); bCtx.moveTo(0,size/2); bCtx.lineTo(size,size/2); bCtx.stroke();
}

// ── Render: Loss curve ──
function drawLoss() {
  const W = lCanvas.clientWidth, H = lCanvas.height = 100;
  lCanvas.width = W;
  lCtx.clearRect(0,0,W,H);
  lCtx.fillStyle='#f7f7f5'; lCtx.fillRect(0,0,W,H);

  if (lossHistory.length < 2) {
    lCtx.fillStyle='#ccc'; lCtx.font='11px IBM Plex Mono';
    lCtx.textAlign='center'; lCtx.fillText('학습 시작 후 표시됩니다',W/2,H/2); return;
  }

  const maxL = Math.max(...lossHistory);
  const pad = {t:8,r:8,b:16,l:36};
  const pw = W-pad.l-pad.r, ph = H-pad.t-pad.b;

  // Y axis
  lCtx.strokeStyle='#e0e0dc'; lCtx.lineWidth=0.5;
  [0,0.5,1].forEach(t=>{
    const y=pad.t+ph*(1-t);
    lCtx.beginPath(); lCtx.moveTo(pad.l,y); lCtx.lineTo(W-pad.r,y); lCtx.stroke();
    lCtx.fillStyle='#888'; lCtx.font='9px IBM Plex Mono'; lCtx.textAlign='right';
    lCtx.fillText((maxL*t).toFixed(2), pad.l-4, y+3);
  });

  // Loss line
  lCtx.beginPath();
  lossHistory.forEach((v,i)=>{
    const x=pad.l+i/(lossHistory.length-1)*pw;
    const y=pad.t+ph*(1-v/maxL);
    i===0?lCtx.moveTo(x,y):lCtx.lineTo(x,y);
  });
  lCtx.strokeStyle='#1a56db'; lCtx.lineWidth=1.5; lCtx.stroke();
}

// ── Render: Network diagram ──
function drawNetDiagram() {
  const sizes = getNetSizes();
  const W = nCanvas.clientWidth;
  const H = Math.max(120, sizes.reduce((m,s)=>Math.max(m,s),0)*22+40);
  nCanvas.width = W; nCanvas.height = H;
  nCtx.clearRect(0,0,W,H);

  const layers = sizes.length;
  const xStep = W/(layers+1);

  const nodePos = sizes.map((n,li)=>{
    const x = xStep*(li+1);
    return Array.from({length:n},(_,j)=>{
      const y = H/2+(j-(n-1)/2)*Math.min(22, (H-40)/n);
      return {x,y};
    });
  });

  // Weights color
  if (net) {
    net.weights.forEach((W2,li)=>{
      W2.forEach((row,j)=>{
        row.forEach((w,k)=>{
          const from=nodePos[li][k], to=nodePos[li+1][j];
          if(!from||!to) return;
          const strength = Math.min(1, Math.abs(w)*0.5);
          nCtx.beginPath();
          nCtx.moveTo(from.x,from.y);
          nCtx.lineTo(to.x,to.y);
          nCtx.strokeStyle = w>0
            ? `rgba(37,99,235,${strength*0.6})`
            : `rgba(220,38,38,${strength*0.6})`;
          nCtx.lineWidth=0.8;
          nCtx.stroke();
        });
      });
    });
  }

  // Nodes
  nodePos.forEach((layer,li)=>{
    layer.forEach((pos,ni)=>{
      nCtx.beginPath();
      nCtx.arc(pos.x,pos.y,7,0,Math.PI*2);
      nCtx.fillStyle = li===0?'#f0f0ee':li===layers-1?'#1a56db':'#fff';
      nCtx.strokeStyle='#1a56db';
      nCtx.lineWidth=1;
      nCtx.fill(); nCtx.stroke();
    });
  });

  // Labels
  ['IN',...hiddenLayers.map((_,i)=>`H${i+1}`),'OUT'].forEach((label,li)=>{
    const x=xStep*(li+1);
    nCtx.fillStyle='#888'; nCtx.font='9px IBM Plex Mono';
    nCtx.textAlign='center'; nCtx.fillText(label,x,H-4);
  });
}

// ── Data preview ──
function drawDataPreview() {
  const W=dCanvas.clientWidth, H=80;
  dCanvas.width=W; dCanvas.height=H;
  dCtx.fillStyle='#f7f7f5'; dCtx.fillRect(0,0,W,H);
  if (!data) return;
  data.X.forEach((pt,i)=>{
    const px=(pt[0]+1)/2*W, py=(-pt[1]+1)/2*H;
    dCtx.beginPath(); dCtx.arc(px,py,2,0,Math.PI*2);
    dCtx.fillStyle=data.y[i]===0?'rgba(37,99,235,0.7)':'rgba(220,38,38,0.7)';
    dCtx.fill();
  });
}

// ── Controls ──
document.getElementById('runBtn').onclick = () => {
  if (running) {
    running=false;
    cancelAnimationFrame(animId);
    document.getElementById('runBtn').textContent='▶ 학습 시작';
    document.getElementById('runBtn').className='btn primary';
    document.getElementById('statusDot').className='status-dot done';
    document.getElementById('statusTxt').textContent='정지';
  } else {
    running=true;
    document.getElementById('runBtn').textContent='⏸ 정지';
    document.getElementById('runBtn').className='btn stop';
    document.getElementById('statusDot').className='status-dot running';
    document.getElementById('statusTxt').textContent='학습 중';
    loop();
  }
};

document.getElementById('stepBtn').onclick = () => {
  if (running) return;
  trainStep();
  drawBoundary(); drawLoss(); drawNetDiagram();
};

document.getElementById('resetBtn').onclick = () => {
  running=false; cancelAnimationFrame(animId);
  document.getElementById('runBtn').textContent='▶ 학습 시작';
  document.getElementById('runBtn').className='btn primary';
  document.getElementById('statusDot').className='status-dot';
  document.getElementById('statusTxt').textContent='대기';
  rebuildNet();
};

document.getElementById('regenBtn').onclick=regenData;
document.getElementById('datasetSelect').onchange=regenData;

document.getElementById('noiseSlider').oninput=e=>{
  document.getElementById('noiseVal').textContent=e.target.value;
};
document.getElementById('sampleSlider').oninput=e=>{
  document.getElementById('sampleVal').textContent=e.target.value;
};
document.getElementById('actSelect').onchange=rebuildNet;
document.getElementById('lrSelect').onchange=()=>{
  document.getElementById('mLr').textContent=getLR();
};

// ── Resize ──
let resizeTimer;
window.addEventListener('resize',()=>{
  clearTimeout(resizeTimer);
  resizeTimer=setTimeout(()=>{ drawBoundary(); drawLoss(); drawNetDiagram(); drawDataPreview(); },100);
});

// ── Init ──
buildLayerUI();
rebuildNet();
regenData();
