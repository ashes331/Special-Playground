/**
 * KeyPiano - 키보드로 피아노를 연주하는 웹앱
 * Web Audio API를 이용한 실시간 음성 합성
 */

// ===== 상수 정의 =====

/** 키보드 키 → 피아노 음표 매핑 (한 옥타브) */
const KEY_MAP = {
  // 흰 건반: A S D F G H J K L
  'a': { note: 'C',  semitone: 0  },
  's': { note: 'D',  semitone: 2  },
  'd': { note: 'E',  semitone: 4  },
  'f': { note: 'F',  semitone: 5  },
  'g': { note: 'G',  semitone: 7  },
  'h': { note: 'A',  semitone: 9  },
  'j': { note: 'B',  semitone: 11 },
  'k': { note: 'C',  semitone: 12, octaveOffset: 1 },  // 다음 옥타브 C
  'l': { note: 'D',  semitone: 14, octaveOffset: 1 },  // 다음 옥타브 D

  // 검은 건반: W E T Y U O
  'w': { note: 'C#', semitone: 1  },
  'e': { note: 'D#', semitone: 3  },
  't': { note: 'F#', semitone: 6  },
  'y': { note: 'G#', semitone: 8  },
  'u': { note: 'A#', semitone: 10 },
  'o': { note: 'C#', semitone: 13, octaveOffset: 1 },  // 다음 옥타브 C#
};

/** 흰 건반 순서: C D E F G A B C D */
const WHITE_KEYS = ['a','s','d','f','g','h','j','k','l'];
/** 검은 건반과 그 왼쪽 흰 건반 인덱스 매핑 */
const BLACK_KEY_POSITIONS = [
  { key: 'w', afterWhite: 0 },  // C# → A(C) 다음
  { key: 'e', afterWhite: 1 },  // D# → S(D) 다음
  // E-F 사이에는 검은 건반 없음
  { key: 't', afterWhite: 3 },  // F# → F(F) 다음
  { key: 'y', afterWhite: 4 },  // G# → G(G) 다음
  { key: 'u', afterWhite: 5 },  // A# → H(A) 다음
  // B-C 사이에는 검은 건반 없음
  { key: 'o', afterWhite: 7 },  // C# → K(C) 다음
];

/** 음표 이름 (한국어/영어) */
const NOTE_KR = {
  'C': 'C (도)', 'C#': 'C# (도#)', 'D': 'D (레)', 'D#': 'D# (레#)',
  'E': 'E (미)', 'F': 'F (파)', 'F#': 'F# (파#)', 'G': 'G (솔)',
  'G#': 'G# (솔#)', 'A': 'A (라)', 'A#': 'A# (라#)', 'B': 'B (시)',
};

/** 음색별 오실레이터 설정 */
const TONE_SETTINGS = {
  piano: {
    oscillators: [
      { type: 'triangle', gainMult: 1.0,  detuneOffset: 0   },
      { type: 'sine',     gainMult: 0.5,  detuneOffset: 0.2 },
      { type: 'sine',     gainMult: 0.25, detuneOffset: -0.2 },
    ],
    attackTime:  0.005,
    decayTime:   0.3,
    sustainLevel: 0.3,
    releaseTime: 1.2,
  },
  organ: {
    oscillators: [
      { type: 'sine', gainMult: 1.0,  detuneOffset: 0   },
      { type: 'sine', gainMult: 0.8,  detuneOffset: 12  },  // 옥타브 위
      { type: 'sine', gainMult: 0.5,  detuneOffset: 24  },  // 2옥타브 위
    ],
    attackTime:  0.01,
    decayTime:   0.05,
    sustainLevel: 0.9,
    releaseTime: 0.15,
  },
  synth: {
    oscillators: [
      { type: 'sawtooth', gainMult: 1.0,  detuneOffset: 0   },
      { type: 'sawtooth', gainMult: 0.7,  detuneOffset: 7   },  // 5도 위
      { type: 'square',   gainMult: 0.15, detuneOffset: -5  },
    ],
    attackTime:  0.02,
    decayTime:   0.15,
    sustainLevel: 0.6,
    releaseTime: 0.4,
  },
};

// ===== 상태 =====
let audioCtx = null;
let analyserNode = null;
let masterGain = null;
let currentOctave = 4;
let currentTone = 'piano';
let volume = 0.7;
let sustain = false;
let activeNotes = new Map();     // key → { oscillators, gainNode, noteId }
let sustainedNotes = new Map();  // noteId → gainNode (서스테인 중)
let pressedKeys = new Set();     // 현재 눌린 키보드 키
let animFrameId = null;

// ===== 오디오 초기화 =====

/**
 * Web Audio API 컨텍스트 초기화 (첫 번째 인터랙션 시 실행)
 * @returns {AudioContext}
 */
function initAudio() {
  if (audioCtx) return audioCtx;

  audioCtx = new (window.AudioContext || window.webkitAudioContext)();

  // 마스터 게인 노드
  masterGain = audioCtx.createGain();
  masterGain.gain.value = volume;

  // 분석기 노드 (파형 시각화용)
  analyserNode = audioCtx.createAnalyser();
  analyserNode.fftSize = 2048;
  analyserNode.smoothingTimeConstant = 0.85;

  masterGain.connect(analyserNode);
  analyserNode.connect(audioCtx.destination);

  startVisualizer();
  return audioCtx;
}

// ===== 주파수 계산 =====

/**
 * MIDI 번호 → 주파수(Hz) 변환
 * @param {number} midi - MIDI 번호
 * @returns {number} 주파수 (Hz)
 */
function midiToFreq(midi) {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * 키 이름 → MIDI 번호 계산
 * @param {string} key - 키보드 키 (예: 'a', 'w')
 * @param {number} octave - 기본 옥타브
 * @returns {number|null} MIDI 번호
 */
function getMidi(key, octave) {
  const mapping = KEY_MAP[key];
  if (!mapping) return null;
  const octaveOffset = mapping.octaveOffset || 0;
  return (octave + octaveOffset) * 12 + mapping.semitone + 12;
}

// ===== 음 재생 =====

/**
 * 피아노 음 재생 시작
 * @param {string} key - 키보드 키
 * @param {string} [noteId] - 고유 ID (기본값: key)
 */
function playNote(key, noteId = key) {
  if (!KEY_MAP[key]) return;

  const ctx = initAudio();
  if (ctx.state === 'suspended') ctx.resume();

  // 이미 재생 중이면 중복 방지
  if (activeNotes.has(noteId)) return;

  const midi = getMidi(key, currentOctave);
  if (!midi) return;
  const freq = midiToFreq(midi);

  const settings = TONE_SETTINGS[currentTone];
  const now = ctx.currentTime;

  // 음표별 게인 노드
  const noteGain = ctx.createGain();
  noteGain.gain.setValueAtTime(0, now);
  noteGain.gain.linearRampToValueAtTime(settings.oscillators[0].gainMult, now + settings.attackTime);
  noteGain.gain.exponentialRampToValueAtTime(
    Math.max(0.001, settings.sustainLevel),
    now + settings.attackTime + settings.decayTime
  );
  noteGain.connect(masterGain);

  // 여러 오실레이터로 풍부한 음색 생성
  const oscillators = settings.oscillators.map(cfg => {
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = cfg.type;

    // 음색별 주파수 계산
    if (currentTone === 'organ') {
      // organ: 배음 (harmonic series)
      const harmonicFreq = freq * Math.pow(2, cfg.detuneOffset / 12);
      osc.frequency.value = harmonicFreq;
    } else {
      osc.frequency.value = freq;
      osc.detune.value = cfg.detuneOffset;
    }

    oscGain.gain.value = cfg.gainMult;
    osc.connect(oscGain);
    oscGain.connect(noteGain);
    osc.start(now);
    return osc;
  });

  activeNotes.set(noteId, { oscillators, gainNode: noteGain, key, midi });

  // UI 업데이트
  const keyEl = document.getElementById(`piano-key-${key}`);
  if (keyEl) keyEl.classList.add('active');
  updateNoteDisplay(KEY_MAP[key].note, midi);
}

/**
 * 음 재생 중지
 * @param {string} key - 키보드 키
 * @param {string} [noteId] - 고유 ID (기본값: key)
 */
function stopNote(key, noteId = key) {
  const noteData = activeNotes.get(noteId);
  if (!noteData) return;

  const ctx = audioCtx;
  const settings = TONE_SETTINGS[currentTone];
  const now = ctx.currentTime;

  if (sustain) {
    // 서스테인 모드: UI만 업데이트하고 소리 유지
    sustainedNotes.set(noteId, noteData);
    const keyEl = document.getElementById(`piano-key-${key}`);
    if (keyEl) {
      keyEl.classList.remove('active');
      keyEl.classList.add('sustain-active');
    }
  } else {
    // 릴리즈 처리
    releaseNote(noteData, settings.releaseTime);
    const keyEl = document.getElementById(`piano-key-${key}`);
    if (keyEl) keyEl.classList.remove('active');
  }

  activeNotes.delete(noteId);
}

/**
 * 음 페이드아웃 (Release)
 * @param {object} noteData
 * @param {number} releaseTime
 */
function releaseNote(noteData, releaseTime) {
  const ctx = audioCtx;
  const now = ctx.currentTime;
  const { oscillators, gainNode } = noteData;

  gainNode.gain.cancelScheduledValues(now);
  gainNode.gain.setValueAtTime(gainNode.gain.value, now);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + releaseTime);

  setTimeout(() => {
    oscillators.forEach(osc => {
      try { osc.stop(); } catch(e) {}
    });
    gainNode.disconnect();
  }, (releaseTime + 0.1) * 1000);
}

/**
 * 서스테인 페달 해제 시 유지 중인 음 모두 릴리즈
 */
function releaseSustainedNotes() {
  const settings = TONE_SETTINGS[currentTone];
  sustainedNotes.forEach((noteData, noteId) => {
    releaseNote(noteData, settings.releaseTime);
    // UI 복원
    const keyEl = document.getElementById(`piano-key-${noteData.key}`);
    if (keyEl) keyEl.classList.remove('sustain-active');
  });
  sustainedNotes.clear();
}

// ===== 파형 시각화 =====

/**
 * 오실로스코프 스타일 파형 시각화 시작
 */
function startVisualizer() {
  const canvas = document.getElementById('visualizer');
  const ctx2d = canvas.getContext('2d');

  // 캔버스 크기 설정
  function resizeCanvas() {
    canvas.width = canvas.offsetWidth * window.devicePixelRatio;
    canvas.height = canvas.offsetHeight * window.devicePixelRatio;
    ctx2d.scale(window.devicePixelRatio, window.devicePixelRatio);
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const bufferLength = analyserNode.fftSize;
  const dataArray = new Uint8Array(bufferLength);

  function draw() {
    animFrameId = requestAnimationFrame(draw);
    analyserNode.getByteTimeDomainData(dataArray);

    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;

    ctx2d.clearRect(0, 0, w, h);

    // 배경 그라디언트
    const bgGrad = ctx2d.createLinearGradient(0, 0, w, 0);
    bgGrad.addColorStop(0, 'rgba(124,92,252,0.03)');
    bgGrad.addColorStop(0.5, 'rgba(252,92,125,0.03)');
    bgGrad.addColorStop(1, 'rgba(86,204,242,0.03)');
    ctx2d.fillStyle = bgGrad;
    ctx2d.fillRect(0, 0, w, h);

    // 중앙선
    ctx2d.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx2d.lineWidth = 1;
    ctx2d.beginPath();
    ctx2d.moveTo(0, h / 2);
    ctx2d.lineTo(w, h / 2);
    ctx2d.stroke();

    // 파형 그리기
    const grad = ctx2d.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0,   '#7c5cfc');
    grad.addColorStop(0.5, '#fc5c7d');
    grad.addColorStop(1,   '#56ccf2');

    ctx2d.lineWidth = 2;
    ctx2d.strokeStyle = grad;
    ctx2d.shadowColor = '#7c5cfc';
    ctx2d.shadowBlur = 8;
    ctx2d.beginPath();

    const sliceWidth = w / bufferLength;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * h) / 2;
      if (i === 0) ctx2d.moveTo(x, y);
      else ctx2d.lineTo(x, y);
      x += sliceWidth;
    }
    ctx2d.lineTo(w, h / 2);
    ctx2d.stroke();
    ctx2d.shadowBlur = 0;
  }
  draw();
}

// ===== UI 업데이트 =====

/**
 * 현재 재생 중인 음표 이름 표시 업데이트
 * @param {string} note - 음표 이름 (예: 'C', 'C#')
 * @param {number} midi - MIDI 번호
 */
function updateNoteDisplay(note, midi) {
  const el = document.getElementById('note-name');
  const octave = Math.floor(midi / 12) - 1;
  el.textContent = `${NOTE_KR[note]} ${octave}`;
  el.classList.remove('flash');
  void el.offsetWidth; // reflow
  el.classList.add('flash');
}

// ===== 건반 UI 생성 =====

/**
 * 피아노 건반 DOM 생성
 */
function buildPiano() {
  const piano = document.getElementById('piano');
  piano.innerHTML = '';

  const WHITE_KEY_WIDTH = 58;  // px (CSS와 동기화)

  // 흰 건반 먼저 생성
  WHITE_KEYS.forEach((key, index) => {
    const div = document.createElement('div');
    div.className = 'key-white';
    div.id = `piano-key-${key}`;
    div.dataset.key = key;

    const noteName = KEY_MAP[key].note;
    div.innerHTML = `
      <span class="key-label-note">${noteName}</span>
      <span class="key-label-key">${key.toUpperCase()}</span>
    `;

    // 마우스 이벤트
    div.addEventListener('mousedown', e => {
      e.preventDefault();
      playNote(key);
    });
    div.addEventListener('mouseup', () => stopNote(key));
    div.addEventListener('mouseleave', () => {
      if (!pressedKeys.has(key)) stopNote(key);
    });
    div.addEventListener('mouseenter', e => {
      if (e.buttons === 1) playNote(key);
    });

    // 터치 이벤트
    div.addEventListener('touchstart', e => { e.preventDefault(); playNote(key); }, { passive: false });
    div.addEventListener('touchend', e => { e.preventDefault(); stopNote(key); }, { passive: false });

    piano.appendChild(div);
  });

  // 검은 건반 절대 위치로 삽입
  BLACK_KEY_POSITIONS.forEach(({ key, afterWhite }) => {
    const div = document.createElement('div');
    div.className = 'key-black';
    div.id = `piano-key-${key}`;
    div.dataset.key = key;

    const noteName = KEY_MAP[key].note;
    div.innerHTML = `
      <span class="key-label-note">${noteName}</span>
      <span class="key-label-key">${key.toUpperCase()}</span>
    `;

    // 위치 계산: 흰 건반 사이 중간에 배치
    // afterWhite = 왼쪽 흰 건반 인덱스
    const leftPos = (afterWhite + 1) * (WHITE_KEY_WIDTH + 2) - 17;
    div.style.left = `${leftPos}px`;

    div.addEventListener('mousedown', e => { e.preventDefault(); playNote(key); });
    div.addEventListener('mouseup', () => stopNote(key));
    div.addEventListener('mouseleave', () => {
      if (!pressedKeys.has(key)) stopNote(key);
    });
    div.addEventListener('mouseenter', e => {
      if (e.buttons === 1) playNote(key);
    });
    div.addEventListener('touchstart', e => { e.preventDefault(); playNote(key); }, { passive: false });
    div.addEventListener('touchend', e => { e.preventDefault(); stopNote(key); }, { passive: false });

    piano.appendChild(div);
  });
}

// ===== 키보드 이벤트 =====

document.addEventListener('keydown', e => {
  // 입력창 포커스 중이면 무시
  if (e.target.tagName === 'INPUT') return;

  const key = e.key.toLowerCase();

  // 방향키: 옥타브 이동
  if (e.key === 'ArrowLeft') { changeOctave(-1); return; }
  if (e.key === 'ArrowRight') { changeOctave(1); return; }

  // 스페이스바: 서스테인 페달
  if (e.key === ' ') {
    e.preventDefault();
    if (!sustain) {
      sustain = true;
      document.querySelector('.sustain-indicator').classList.add('visible');
    }
    return;
  }

  // 중복 keydown 방지
  if (pressedKeys.has(key)) return;
  if (!KEY_MAP[key]) return;

  pressedKeys.add(key);
  playNote(key);
});

document.addEventListener('keyup', e => {
  const key = e.key.toLowerCase();

  if (e.key === ' ') {
    sustain = false;
    document.querySelector('.sustain-indicator').classList.remove('visible');
    releaseSustainedNotes();
    return;
  }

  pressedKeys.delete(key);
  stopNote(key);
});

// ===== 옥타브 변경 =====

/**
 * 옥타브 변경
 * @param {number} delta - +1 또는 -1
 */
function changeOctave(delta) {
  currentOctave = Math.max(1, Math.min(7, currentOctave + delta));
  document.getElementById('octave-display').textContent = currentOctave;

  // 현재 재생 중인 음 모두 정지
  pressedKeys.forEach(k => stopNote(k));
  pressedKeys.clear();
  activeNotes.clear();
}

// ===== 컨트롤 이벤트 =====

document.getElementById('oct-down').addEventListener('click', () => changeOctave(-1));
document.getElementById('oct-up').addEventListener('click', () => changeOctave(1));

document.getElementById('volume-slider').addEventListener('input', e => {
  volume = e.target.value / 100;
  if (masterGain) masterGain.gain.value = volume;
});

document.querySelectorAll('.tone-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tone-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTone = btn.dataset.tone;
  });
});

// ===== 서스테인 인디케이터 생성 =====

const sustainIndicator = document.createElement('div');
sustainIndicator.className = 'sustain-indicator';
sustainIndicator.textContent = '🎵 서스테인 ON';
document.body.appendChild(sustainIndicator);

// ===== 초기화 =====

buildPiano();

// 첫 사용 안내
document.getElementById('note-name').textContent = '건반을 누르거나 키보드를 사용하세요 🎹';

console.log('🎹 KeyPiano 로드 완료!');
console.log('흰 건반: A S D F G H J K L');
console.log('검은 건반: W E T Y U O');
console.log('옥타브: ← → 방향키');
console.log('서스테인: Space');
