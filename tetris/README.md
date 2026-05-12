# 🎮 테트리스 (Tetris)

바닐라 HTML5 Canvas, CSS, JavaScript로 만든 클래식 테트리스 게임입니다.

## 기능

- **7-bag 랜덤화** — 편향 없이 공평한 블록 분배
- **고스트 블록** — 블록이 떨어질 위치를 미리 표시
- **홀드** — 현재 블록을 홀드 슬롯에 보관
- **SRS 회전** — 벽킥 포함 표준 회전 시스템
- **DAS** — 방향키 꾹 누를 때 부드러운 자동 이동
- **레벨 시스템** — 10줄마다 속도 증가, 최대 11레벨
- **레트로 CRT UI** — 스캔라인 + 네온 글로우 효과

## 조작법

| 키 | 동작 |
|----|------|
| `←` `→` | 좌우 이동 |
| `↑` 또는 `X` | 시계 방향 회전 |
| `Z` | 반시계 방향 회전 |
| `↓` | 소프트 드롭 |
| `Space` | 하드 드롭 |
| `C` | 블록 홀드 |
| `P` | 일시정지 / 재개 |

## 실행 방법

빌드 없이 `index.html`을 브라우저에서 바로 열면 됩니다.

```bash
git clone https://github.com/ashes331/Special-Playground.git
cd Special-Playground/tetris
open index.html       # macOS
# xdg-open index.html  (Linux)
# start index.html     (Windows)
```

## 프로젝트 구조

```
tetris/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── tetris.js
└── README.md
```

## 점수 체계

| 줄 클리어 | 점수 (× 레벨) |
|-----------|--------------|
| 1줄 (싱글) | 100 |
| 2줄 (더블) | 300 |
| 3줄 (트리플) | 500 |
| 4줄 (테트리스) | 800 |

소프트 드롭: 줄당 +1점 · 하드 드롭: 줄당 +2점
