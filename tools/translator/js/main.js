const LANGS = [
  {code:'ko',  label:{ko:'한국어',      en:'Korean'}},
  {code:'en',  label:{ko:'영어',        en:'English'}},
  {code:'ja',  label:{ko:'일본어',      en:'Japanese'}},
  {code:'zh-CN',label:{ko:'중국어(간체)',en:'Chinese (Simplified)'}},
  {code:'zh-TW',label:{ko:'중국어(번체)',en:'Chinese (Traditional)'}},
  {code:'fr',  label:{ko:'프랑스어',    en:'French'}},
  {code:'de',  label:{ko:'독일어',      en:'German'}},
  {code:'es',  label:{ko:'스페인어',    en:'Spanish'}},
  {code:'it',  label:{ko:'이탈리아어',  en:'Italian'}},
  {code:'pt',  label:{ko:'포르투갈어',  en:'Portuguese'}},
  {code:'ru',  label:{ko:'러시아어',    en:'Russian'}},
  {code:'ar',  label:{ko:'아랍어',      en:'Arabic'}},
  {code:'hi',  label:{ko:'힌디어',      en:'Hindi'}},
  {code:'vi',  label:{ko:'베트남어',    en:'Vietnamese'}},
  {code:'th',  label:{ko:'태국어',      en:'Thai'}},
  {code:'id',  label:{ko:'인도네시아어',en:'Indonesian'}},
];

const i18n = {
  ko: {
    inputPh: '번역할 텍스트를 입력하세요…',
    outputPh: '번역 결과가 여기에 표시됩니다',
    translateBtn: '번역하기',
    clearBtn: '지우기',
    copyBtn: '복사',
    copied: '복사됨',
    translating: '번역 중',
    emptyError: '텍스트를 입력해 주세요',
    detectedPfx: '감지됨: ',
    kbdHint: 'L — 언어 전환 &nbsp;·&nbsp; Ctrl+Enter — 번역',
    heroDesc: 'MyMemory API 기반 · 16개 언어 지원',
  },
  en: {
    inputPh: 'Enter text to translate…',
    outputPh: 'Translation will appear here',
    translateBtn: 'Translate',
    clearBtn: 'Clear',
    copyBtn: 'Copy',
    copied: 'Copied',
    translating: 'Translating',
    emptyError: 'Please enter some text',
    detectedPfx: 'Detected: ',
    kbdHint: 'L — toggle UI &nbsp;·&nbsp; Ctrl+Enter — translate',
    heroDesc: 'Powered by MyMemory API · 16 languages',
  }
};

let uiLang = 'ko';
let translating = false;
let resultText = '';

const srcLangEl    = document.getElementById('srcLang');
const tgtLangEl    = document.getElementById('tgtLang');
const srcTextEl    = document.getElementById('srcText');
const outputBoxEl  = document.getElementById('outputBox');
const charCountEl  = document.getElementById('charCount');
const srcLabelEl   = document.getElementById('srcLabel');
const tgtLabelEl   = document.getElementById('tgtLabel');
const statusEl     = document.getElementById('statusMsg');
const translateBtn = document.getElementById('translateBtn');
const translateBtnTxt = document.getElementById('translateBtnTxt');
const copyBtnEl    = document.getElementById('copyBtn');
const clearBtnEl   = document.getElementById('clearBtn');
const detectedEl   = document.getElementById('detectedBadge');
const langToggleEl = document.getElementById('langToggle');
const kbdHintEl    = document.getElementById('kbdHint');
const heroDescEl   = document.getElementById('heroDesc');
const clearTxtEl   = document.getElementById('clearTxt');
const copyTxtEl    = document.getElementById('copyTxt');

function buildSelects() {
  [srcLangEl, tgtLangEl].forEach((el, i) => {
    el.innerHTML = '';
    LANGS.forEach(l => {
      const opt = document.createElement('option');
      opt.value = l.code;
      opt.textContent = l.label[uiLang];
      el.appendChild(opt);
    });
    el.value = i === 0 ? 'ko' : 'en';
  });
  syncLabels();
}

function syncLabels() {
  const t = i18n[uiLang];
  const src = LANGS.find(l => l.code === srcLangEl.value);
  const tgt = LANGS.find(l => l.code === tgtLangEl.value);
  if (src) srcLabelEl.textContent = src.label[uiLang];
  if (tgt) tgtLabelEl.textContent = tgt.label[uiLang];
  srcTextEl.placeholder = t.inputPh;
  translateBtnTxt.textContent = t.translateBtn;
  clearTxtEl.textContent = t.clearBtn;
  copyTxtEl.textContent = t.copyBtn;
  kbdHintEl.innerHTML = t.kbdHint;
  heroDescEl.textContent = t.heroDesc;
  if (!resultText) {
    outputBoxEl.innerHTML = '<span class="output-placeholder">' + t.outputPh + '</span>';
  }
}

function setStatus(msg, isError) {
  statusEl.textContent = msg;
  statusEl.className = 'status-msg' + (isError ? ' error' : '');
}

function clearOutput() {
  resultText = '';
  outputBoxEl.innerHTML = '<span class="output-placeholder">' + i18n[uiLang].outputPh + '</span>';
  copyBtnEl.style.display = 'none';
  detectedEl.style.display = 'none';
}

function showTranslating() {
  const t = i18n[uiLang].translating;
  outputBoxEl.innerHTML = '<span style="color:var(--muted);font-style:italic;">' + t +
    '<span class="dot">.</span><span class="dot">.</span><span class="dot">.</span></span>';
  copyBtnEl.style.display = 'none';
  detectedEl.style.display = 'none';
  resultText = '';
}

srcLangEl.addEventListener('change', syncLabels);
tgtLangEl.addEventListener('change', syncLabels);

srcTextEl.addEventListener('input', () => {
  const n = srcTextEl.value.length;
  charCountEl.textContent = n >= 4800 ? n + ' / 5000' : n;
  charCountEl.style.color = n >= 4800 ? 'var(--error)' : 'var(--muted)';
});

document.getElementById('swapBtn').addEventListener('click', () => {
  const tmp = srcLangEl.value;
  srcLangEl.value = tgtLangEl.value;
  tgtLangEl.value = tmp;
  if (resultText) {
    srcTextEl.value = resultText;
    charCountEl.textContent = resultText.length;
    clearOutput();
  }
  syncLabels();
});

clearBtnEl.addEventListener('click', () => {
  srcTextEl.value = '';
  charCountEl.textContent = '0';
  charCountEl.style.color = 'var(--muted)';
  clearOutput();
  setStatus('');
});

copyBtnEl.addEventListener('click', () => {
  if (!resultText) return;
  navigator.clipboard.writeText(resultText).then(() => {
    copyTxtEl.textContent = i18n[uiLang].copied;
    copyBtnEl.classList.add('active');
    setTimeout(() => {
      copyTxtEl.textContent = i18n[uiLang].copyBtn;
      copyBtnEl.classList.remove('active');
    }, 1600);
  });
});

langToggleEl.addEventListener('click', () => {
  uiLang = uiLang === 'ko' ? 'en' : 'ko';
  langToggleEl.textContent = uiLang.toUpperCase();
  const opts = srcLangEl.querySelectorAll('option');
  const opts2 = tgtLangEl.querySelectorAll('option');
  LANGS.forEach((l, i) => {
    opts[i].textContent = l.label[uiLang];
    opts2[i].textContent = l.label[uiLang];
  });
  syncLabels();
});

document.addEventListener('keydown', e => {
  if (e.key === 'L' && !['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) {
    langToggleEl.click();
  }
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault();
    doTranslate();
  }
});

async function doTranslate() {
  if (translating) return;
  const text = srcTextEl.value.trim();
  if (!text) { setStatus(i18n[uiLang].emptyError, true); return; }

  translating = true;
  translateBtn.disabled = true;
  translateBtn.classList.add('loading');
  setStatus('');
  showTranslating();

  const src = srcLangEl.value;
  const tgt = tgtLangEl.value;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${src}|${tgt}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.responseStatus === 200) {
      resultText = data.responseData.translatedText;
      outputBoxEl.textContent = resultText;
      copyBtnEl.style.display = 'flex';

      const detected = data.responseData.detectedLanguage;
      if (detected && src === 'auto') {
        const dl = LANGS.find(l => l.code === detected.toLowerCase());
        detectedEl.textContent = i18n[uiLang].detectedPfx + (dl ? dl.label[uiLang] : detected);
        detectedEl.style.display = 'inline-block';
      }
    } else {
      throw new Error(data.responseDetails || 'Translation failed');
    }
  } catch(err) {
    outputBoxEl.innerHTML = '<span class="output-placeholder">' + i18n[uiLang].outputPh + '</span>';
    setStatus(err.message, true);
  } finally {
    translating = false;
    translateBtn.disabled = false;
    translateBtn.classList.remove('loading');
  }
}

translateBtn.addEventListener('click', doTranslate);

buildSelects();
