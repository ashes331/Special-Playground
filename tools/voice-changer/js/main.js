// ─── i18n ─────────────────────────────────────────────────
const I18N = {
  ko: {
    subtitle:     '서버 없음 · 설치 없음 · 브라우저에서 바로 실행',
    presetLabel:  '프리셋',
    ctrlLabel:    '컨트롤',
    pitch:        '피치 조절',
    delay:        '에코 딜레이',
    feedback:     '에코 피드백',
    reverb:       '리버브 믹스',
    gain:         '출력 게인',
    effectsLabel: '이펙트',
    lofi:         '로우파이 (3kHz 컷)',
    ring:         '링 모듈레이터 (로봇 보이스)',
    gate:         '노이즈 게이트 (배경 소음 제거)',
    btnStart:     '마이크 시작',
    btnStop:      '중지',
    statusIdle:   '마이크 버튼을 눌러 시작하세요',
    statusLive:   '실행 중 — 헤드폰 사용 권장 (피드백 방지)',
    statusErr:    '마이크 접근 거부됨: ',
  },
  en: {
    subtitle:     'no server · no install · runs in browser',
    presetLabel:  'preset',
    ctrlLabel:    'controls',
    pitch:        'pitch shift',
    delay:        'echo delay',
    feedback:     'echo feedback',
    reverb:       'reverb mix',
    gain:         'output gain',
    effectsLabel: 'effects',
    lofi:         'lo-fi filter (3kHz cut)',
    ring:         'ring modulator (robot voice)',
    gate:         'noise gate (bg noise reduction)',
    btnStart:     'start microphone',
    btnStop:      'stop',
    statusIdle:   'press the button to start',
    statusLive:   'live — use headphones to prevent feedback',
    statusErr:    'microphone access denied: ',
  }
};

let currentLang = 'ko';

function setLang(lang) {
  currentLang = lang;
  const T = I18N[lang];
  document.getElementById('t-subtitle').textContent     = T.subtitle;
  document.getElementById('t-preset-label').textContent = T.presetLabel;
  document.getElementById('t-ctrl-label').textContent   = T.ctrlLabel;
  document.getElementById('t-pitch').textContent        = T.pitch;
  document.getElementById('t-delay').textContent        = T.delay;
  document.getElementById('t-feedback').textContent     = T.feedback;
  document.getElementById('t-reverb').textContent       = T.reverb;
  document.getElementById('t-gain').textContent         = T.gain;
  document.getElementById('t-effects-label').textContent = T.effectsLabel;
  document.getElementById('t-lofi').textContent         = T.lofi;
  document.getElementById('t-ring').textContent         = T.ring;
  document.getElementById('t-gate').textContent         = T.gate;
  document.getElementById('t-btn').textContent          = S.running ? T.btnStop : T.btnStart;
  if (!S.running) document.getElementById('status-text').textContent = T.statusIdle;
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.classList.toggle('active', b.textContent.toLowerCase() === lang);
  });
  document.documentElement.lang = lang;
}

function t(key) { return I18N[currentLang][key]; }

// ─── state ────────────────────────────────────────────────
const S = {
  pitch: 0, delay: 0, feedback: 0, reverb: 0, gain: 1.0,
  lofi: false, ring: false, gate: false, running: false
};

// ─── pitch grid ───────────────────────────────────────────
const GRID_VALS = [-12, -7, -5, -2, 0, 2, 5, 7, 10, 12];
const pitchGrid = document.getElementById('pitch-grid');
GRID_VALS.forEach(v => {
  const el = document.createElement('div');
  el.className = 'pitch-step' + (v === 0 ? ' active' : '');
  el.textContent = (v > 0 ? '+' : '') + v;
  el.dataset.v = v;
  el.onclick = () => {
    document.querySelectorAll('.pitch-step').forEach(e => e.classList.remove('active'));
    el.classList.add('active');
    S.pitch = v;
    document.getElementById('pitch-slider').value = v;
    document.getElementById('pitch-val').textContent = v + ' semitones';
    clearPreset();
    if (S.running) rebuildGraph();
  };
  pitchGrid.appendChild(el);
});

// ─── sliders ──────────────────────────────────────────────
function bindSlider(id, key, fmt, cb) {
  document.getElementById(id).addEventListener('input', e => {
    S[key] = parseFloat(e.target.value);
    document.getElementById(id.replace('slider', 'val')).textContent = fmt(S[key]);
    clearPreset();
    if (cb) cb();
    if (S.running) rebuildGraph();
  });
}
bindSlider('pitch-slider',    'pitch',    v => v + ' semitones', () => {
  document.querySelectorAll('.pitch-step').forEach(e => {
    e.classList.toggle('active', parseInt(e.dataset.v) === S.pitch);
  });
});
bindSlider('delay-slider',    'delay',    v => v.toFixed(2) + ' s');
bindSlider('feedback-slider', 'feedback', v => Math.round(v * 100) + '%');
bindSlider('reverb-slider',   'reverb',   v => Math.round(v * 100) + '%');
bindSlider('gain-slider',     'gain',     v => v.toFixed(2) + '×');

['lofi', 'ring', 'gate'].forEach(key => {
  document.getElementById(key + '-toggle').addEventListener('change', e => {
    S[key] = e.target.checked;
    clearPreset();
    if (S.running) rebuildGraph();
  });
});

// ─── presets ──────────────────────────────────────────────
const PRESETS = {
  robot:     { pitch:0,  delay:0.02, feedback:0.1,  reverb:0.1,  gain:1.0, lofi:false, ring:true,  gate:false },
  helium:    { pitch:7,  delay:0,    feedback:0,     reverb:0,    gain:1.2, lofi:false, ring:false, gate:false },
  demon:     { pitch:-7, delay:0.1,  feedback:0.3,   reverb:0.3,  gain:1.0, lofi:false, ring:false, gate:false },
  telephone: { pitch:0,  delay:0,    feedback:0,     reverb:0,    gain:1.0, lofi:true,  ring:false, gate:true  },
  cave:      { pitch:-2, delay:0.35, feedback:0.65,  reverb:0.75, gain:1.0, lofi:false, ring:false, gate:false },
  chipmunk:  { pitch:10, delay:0,    feedback:0,     reverb:0.1,  gain:1.0, lofi:false, ring:false, gate:false },
  original:  { pitch:0,  delay:0,    feedback:0,     reverb:0,    gain:1.0, lofi:false, ring:false, gate:false },
};

function applyPreset(name) {
  const p = PRESETS[name]; if (!p) return;
  Object.assign(S, p);
  syncUI();
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.toggle('active', b.dataset.preset === name));
  if (S.running) rebuildGraph();
}

function clearPreset() {
  document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
}

function syncUI() {
  document.getElementById('pitch-slider').value       = S.pitch;
  document.getElementById('pitch-val').textContent    = S.pitch + ' semitones';
  document.getElementById('delay-slider').value       = S.delay;
  document.getElementById('delay-val').textContent    = S.delay.toFixed(2) + ' s';
  document.getElementById('feedback-slider').value    = S.feedback;
  document.getElementById('feedback-val').textContent = Math.round(S.feedback * 100) + '%';
  document.getElementById('reverb-slider').value      = S.reverb;
  document.getElementById('reverb-val').textContent   = Math.round(S.reverb * 100) + '%';
  document.getElementById('gain-slider').value        = S.gain;
  document.getElementById('gain-val').textContent     = S.gain.toFixed(2) + '×';
  document.getElementById('lofi-toggle').checked = S.lofi;
  document.getElementById('ring-toggle').checked = S.ring;
  document.getElementById('gate-toggle').checked = S.gate;
  document.querySelectorAll('.pitch-step').forEach(e => {
    e.classList.toggle('active', parseInt(e.dataset.v) === S.pitch);
  });
}

document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.addEventListener('click', () => applyPreset(btn.dataset.preset));
});

// ─── audio graph ──────────────────────────────────────────
let AC, mediaStream, source, analyser, animId, ringOsc;

function createImpulse(ac, dur, decay) {
  const len = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(2, len, ac.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

function buildPitchShiftChain(ac, inputNode) {
  if (S.pitch === 0) return inputNode;
  const ratio = Math.pow(2, S.pitch / 12);
  const sp = ac.createScriptProcessor(4096, 1, 1);
  const circBuf = new Float32Array(ac.sampleRate * 2);
  let writeIdx = 0, readIdx = 0;
  sp.onaudioprocess = (e) => {
    const inp = e.inputBuffer.getChannelData(0);
    const out = e.outputBuffer.getChannelData(0);
    const N = inp.length, L = circBuf.length;
    for (let i = 0; i < N; i++) { circBuf[writeIdx % L] = inp[i]; writeIdx++; }
    for (let i = 0; i < N; i++) {
      const ri = readIdx + i * ratio;
      const i0 = Math.floor(ri) % L, i1 = (i0 + 1) % L, f = ri - Math.floor(ri);
      out[i] = circBuf[i0] * (1 - f) + circBuf[i1] * f;
    }
    readIdx += N * ratio;
  };
  inputNode.connect(sp);
  const spOut = ac.createGain();
  sp.connect(spOut);
  return spOut;
}

function rebuildGraph() {
  if (ringOsc) { try { ringOsc.stop(); } catch(e){} ringOsc = null; }
  analyser = AC.createAnalyser();
  analyser.fftSize = 2048;
  let chain = source;
  if (S.gate) {
    const comp = AC.createDynamicsCompressor();
    comp.threshold.value = -50; comp.knee.value = 10;
    comp.ratio.value = 20; comp.attack.value = 0.001; comp.release.value = 0.1;
    chain.connect(comp); chain = comp;
  }
  if (S.ring) {
    ringOsc = AC.createOscillator();
    ringOsc.frequency.value = 40;
    const rg = AC.createGain(); rg.gain.value = 0;
    ringOsc.connect(rg.gain); ringOsc.start();
    const ri = AC.createGain();
    chain.connect(ri); ri.connect(rg); chain = rg;
  }
  chain = buildPitchShiftChain(AC, chain);
  const lpf = AC.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.value = S.lofi ? 3000 : 20000;
  chain.connect(lpf); chain = lpf;
  const delay = AC.createDelay(2.0);
  delay.delayTime.value = S.delay;
  const fb = AC.createGain(); fb.gain.value = S.feedback;
  const dm = AC.createGain(); dm.gain.value = S.delay > 0 ? 0.5 : 0;
  chain.connect(delay); delay.connect(fb); fb.connect(delay); delay.connect(dm);
  const conv = AC.createConvolver(); conv.buffer = createImpulse(AC, 2.5, 3.5);
  const rw = AC.createGain(); rw.gain.value = S.reverb;
  const rd = AC.createGain(); rd.gain.value = 1 - S.reverb;
  chain.connect(conv); conv.connect(rw); chain.connect(rd);
  const out = AC.createGain(); out.gain.value = S.gain;
  rd.connect(out); rw.connect(out); dm.connect(out);
  out.connect(analyser); out.connect(AC.destination);
}

// ─── stream control ───────────────────────────────────────
async function toggleStream() {
  if (!S.running) await startStream(); else stopStream();
}

async function startStream() {
  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      video: false
    });
  } catch (err) {
    setStatus(t('statusErr') + err.message, 'err'); return;
  }
  AC = new (window.AudioContext || window.webkitAudioContext)();
  source = AC.createMediaStreamSource(mediaStream);
  rebuildGraph();
  S.running = true;
  const btn = document.getElementById('main-btn');
  btn.innerHTML = '&#9632; <span id="t-btn">' + t('btnStop') + '</span>';
  btn.className = 'main-btn stop';
  setStatus(t('statusLive'), 'on');
  document.getElementById('viz-label').textContent = 'LIVE';
  startViz();
}

function stopStream() {
  if (ringOsc) { try { ringOsc.stop(); } catch(e){} ringOsc = null; }
  if (mediaStream) { mediaStream.getTracks().forEach(tr => tr.stop()); mediaStream = null; }
  if (AC) { AC.close(); AC = null; }
  if (animId) { cancelAnimationFrame(animId); animId = null; }
  S.running = false;
  const btn = document.getElementById('main-btn');
  btn.innerHTML = '&#9679; <span id="t-btn">' + t('btnStart') + '</span>';
  btn.className = 'main-btn start';
  setStatus(t('statusIdle'), '');
  document.getElementById('viz-label').textContent = 'IDLE';
  const c = document.getElementById('waveform');
  c.getContext('2d').clearRect(0, 0, c.width, c.height);
}

function setStatus(msg, type) {
  document.getElementById('status-text').textContent = msg;
  document.getElementById('led').className = 'led' + (type ? ' ' + type : '');
}

// ─── waveform viz ─────────────────────────────────────────
function startViz() {
  const canvas = document.getElementById('waveform');
  const ctx2 = canvas.getContext('2d');
  function draw() {
    if (!S.running || !analyser) return;
    animId = requestAnimationFrame(draw);
    const W = canvas.width = canvas.offsetWidth;
    const H = canvas.height = canvas.offsetHeight;
    ctx2.clearRect(0, 0, W, H);
    const buf = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(buf);
    ctx2.beginPath();
    ctx2.strokeStyle = '#00e5a0';
    ctx2.lineWidth = 1.5;
    const step = W / buf.length;
    for (let i = 0; i < buf.length; i++) {
      const y = (buf[i] / 128) * H / 2;
      i === 0 ? ctx2.moveTo(0, y) : ctx2.lineTo(i * step, y);
    }
    ctx2.stroke();
  }
  draw();
}
