# 🎙️ Voice Changer

바닐라 HTML5, CSS, JavaScript로 만든 실시간 브라우저 보이스 체인저입니다.  
서버 없음, 외부 API 없음, 설치 없음 — 브라우저에서 바로 실행됩니다.

## 이펙트

| 이펙트 | 파라미터 | 설명 |
|--------|----------|------|
| **Pitch Shift** | ±12 semitones | Circular buffer + linear interpolation 방식 실시간 피치 변환 |
| **Echo Delay** | 0 ~ 0.8s | DelayNode + Feedback GainNode 루프 |
| **Echo Feedback** | 0 ~ 85% | 딜레이 피드백 비율 |
| **Reverb** | 0 ~ 100% | Synthetic IR ConvolverNode (2.5s, decay 3.5) |
| **Lo-fi** | ON/OFF | BiquadFilter LowPass 3kHz 컷 — 전화기 질감 |
| **Ring Modulator** | ON/OFF | 40Hz OscillatorNode carrier — 로봇 보이스 |
| **Noise Gate** | ON/OFF | DynamicsCompressor (threshold -50dB, ratio 20) |
| **Output Gain** | 0.1 ~ 3.0× | 최종 출력 음량 조절 |

## 프리셋

| 프리셋 | 주요 설정 |
|--------|-----------|
| `robot` | Ring Mod ON, Delay 0.02s |
| `helium` | Pitch +7, Gain 1.2× |
| `demon` | Pitch -7, Delay 0.1s, Reverb 30% |
| `telephone` | Lo-fi ON, Noise Gate ON |
| `cave` | Pitch -2, Delay 0.35s, Feedback 65%, Reverb 75% |
| `chipmunk` | Pitch +10, Reverb 10% |
| `original` | 모든 이펙트 초기화 |

## 사용법

1. 헤드폰 착용 (스피커 사용 시 마이크 피드백 루프 발생)
2. 프리셋 선택 또는 슬라이더/토글로 이펙트 조절
3. **마이크 시작** 버튼 클릭 → 브라우저 마이크 권한 허용
4. 실시간 파형이 Canvas에 표시되며 변조된 음성 출력

> ⚠️ HTTPS 또는 localhost에서만 마이크 권한 동작 (브라우저 보안 정책)  
> ⚠️ `file://`로 직접 열면 마이크 차단됨 → 반드시 HTTP 서버 사용

## 실행 방법

```bash
git clone https://github.com/ashes331/Special-Playground.git
cd Special-Playground/voice-changer

# 아무 정적 서버로 실행
npx serve .
# 또는
python3 -m http.server 8080
```

`http://localhost:8080` 접속 후 마이크 권한 허용.

## 프로젝트 구조

```
voice-changer/
├── index.html       ← HTML 뼈대
├── css/
│   └── style.css    ← 다크 모노크롬 테마 (accent: #00e5a0)
├── js/
│   └── main.js      ← Web Audio API 그래프, i18n, 파형 시각화
└── README.md
```

## 구현 메모

- **오디오 그래프** — `MediaStreamSource → (Gate) → (Ring Mod) → PitchShift → LPF → Delay → Reverb → GainNode → Destination` 순서로 체인 구성, 파라미터 변경 시 `rebuildGraph()`로 전체 재구성
- **Pitch Shift** — `ScriptProcessorNode(4096)` + Circular buffer(sampleRate×2) + linear interpolation. `ratio = 2^(semitones/12)` 로 읽기 속도 조절
- **Reverb IR** — 외부 오디오 파일 없이 코드로 합성: `(Math.random()*2-1) * (1-i/len)^3.5` 감쇠 노이즈
- **Ring Mod** — `OscillatorNode(40Hz)`를 GainNode의 `.gain`에 연결하여 AM 변조
- **파형 시각화** — `AnalyserNode.getByteTimeDomainData()` → Canvas `requestAnimationFrame` 루프
- **KO/EN 토글** — `i18n` 객체로 UI 문자열 관리, `setLang()`으로 전체 일괄 적용
