# 🎲 확률 도구 모음 (Probability Tools)

바닐라 HTML5, CSS, JavaScript로 만든 확률 기반 일상 도구 4종 세트입니다.

## 도구 목록

### 🪙 동전 던지기
- 앞면(👑) / 뒷면(⭐) SVG 동전 클릭 시 `rotateY` 플립 애니메이션
- 앞면 / 뒷면 / 총 횟수 카운트 집계
- 초기화 버튼으로 카운트 리셋

### 🎲 주사위 굴리기
- 다면체 선택: d4 / d6 / d8 / d10 / d12 / d20
- 주사위 개수 1~6개 조절, 합계 표시
- 굴리기 시 `rotate` 흔들림 애니메이션

### 🔢 숫자 뽑기
- 최솟값 / 최댓값 범위 직접 입력
- 결과 숫자 `scale` pop 애니메이션
- 최근 뽑기 기록 최대 7개 표시

### 🪜 사다리타기
- 참가 인원 2~8명 선택
- 이름 직접 입력 (미입력 시 `1번`, `2번` 자동 부여)
- 가지 숨김 상태로 미리보기 → 시작 버튼 시 가지 공개 + 경로 애니메이션
- 결과 1등부터 순서대로 표시

## 실행 방법

빌드 없이 `index.html`을 브라우저에서 바로 열면 됩니다.

```bash
git clone https://github.com/ashes331/Special-Playground.git
cd Special-Playground/probability-tools
open index.html       # macOS
# xdg-open index.html  (Linux)
# start index.html     (Windows)
```

## 프로젝트 구조

```
probability-tools/
├── index.html       ← HTML 뼈대
├── css/
│   └── style.css    ← 보드게임 테마 스타일
├── js/
│   └── main.js      ← 동전·주사위·숫자·사다리 로직
└── README.md
```

## 구현 메모

- **탭 전환** — `switchTab()` 하나로 `.panel.active` 토글, 상태 별도 관리 없음
- **사다리 경로 계산** — 스폰 시점에 모든 경로 미리 계산 후 저장, 렌더링과 로직 분리
- **사다리 애니메이션** — `setInterval` 60프레임으로 `progress(0→1)` 보간하며 경로 드로잉
- **가지 생성** — 열마다 최소 2개 가지 보장 (`generateRungs`), 인접 열 중복 방지
- **보드게임 테마** — 크림 배경(`#f5efe6`) + 골드 포인트, 카드 상단 골드 라인 + 모서리 `◆` 장식, 버튼 입체 그림자
