# voice-changer

실시간 브라우저 보이스 체인저. 서버 없음, 외부 API 없음, 설치 없음.

**[→ Live Demo (GitHub Pages)](https://your-username.github.io/voice-changer/)**

## 기능

| 이펙트 | 설명 |
|---|---|
| Pitch Shift | ±12 semitones, 실시간 버퍼 기반 |
| Echo / Delay | Delay time + Feedback loop |
| Reverb | Synthetic impulse response (convolver) |
| Lo-fi filter | 3kHz LPF — 전화기 질감 |
| Ring Modulator | 40Hz carrier — 로봇 목소리 |
| Noise Gate | DynamicsCompressor 기반 배경 소음 제거 |

프리셋: `robot` `helium` `demon` `telephone` `cave` `chipmunk` `original`

## 사용 기술

- **Web Audio API** — 모든 DSP 처리 (브라우저 내장, 무료)
- **MediaDevices API** — 마이크 입력
- **Canvas API** — 실시간 파형 시각화
- 외부 라이브러리 없음, 빌드 도구 없음

## 실행 방법

### 로컬
```bash
git clone https://github.com/your-username/voice-changer.git
cd voice-changer
# 아무 정적 서버로 실행 (file:// 프로토콜은 마이크 권한 차단됨)
npx serve .
# 또는
python3 -m http.server 8080
```
`http://localhost:8080` 접속 후 마이크 권한 허용.

### GitHub Pages 배포
1. 이 저장소를 fork 또는 push
2. Settings → Pages → Source: `main` branch, `/ (root)`
3. `https://your-username.github.io/voice-changer/` 자동 배포

## 주의사항

- **헤드폰 필수** — 스피커로 듣는 경우 마이크 피드백 루프 발생
- HTTPS 또는 localhost에서만 마이크 권한 동작 (브라우저 보안 정책)
- `file://`로 직접 열면 마이크 차단됨 → 반드시 HTTP 서버 사용

## 구조

```
index.html   # 앱 전체 (HTML + CSS + JS, 단일 파일)
README.md
```

## 기술 노트

현재 pitch shift는 circular buffer + linear interpolation 방식 (real-time 근사).
Phase vocoder 기반 고품질 pitch shift는 `AudioWorklet` + WASM으로 확장 가능.
관련 오픈소스: [pitchshift.js](https://github.com/urtzurd/html-audio), [SoundTouchJS](https://github.com/cutterbl/SoundTouchJS)

## License

MIT
