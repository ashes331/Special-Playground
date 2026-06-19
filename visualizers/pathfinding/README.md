# 🗺️ Pathfinding Visualizer

바닐라 HTML5, CSS, JavaScript로 만든 탐색 알고리즘 실시간 시각화 도구입니다.  
6가지 알고리즘의 탐색 과정을 Canvas에서 셀 단위로 애니메이션합니다.

## 알고리즘

| 알고리즘 | 최단 경로 | 가중치 인식 | 휴리스틱 |
|----------|:---------:|:-----------:|----------|
| **A\* (맨해튼)** | ✅ | ✅ | Manhattan Distance |
| **A\* (유클리드)** | ✅ | ✅ | Euclidean Distance |
| **Dijkstra** | ✅ | ✅ | 없음 (`h=0`) |
| **BFS** | ✅ (비가중) | ❌ | 없음 |
| **DFS** | ❌ | ❌ | 없음 |
| **Greedy Best-First** | ❌ | ❌ | Manhattan × 100 |

> A\*, Dijkstra, Greedy는 같은 `makeSearchFn(heuristic)` 팩토리로 구현 — 휴리스틱만 교체

## 도구

| 도구 | 단축키 | 기능 |
|------|--------|------|
| 🧱 벽 그리기 | `1` | 클릭·드래그로 통과 불가 셀 배치 |
| ⚖️ 가중치 | `2` | 이동 비용 +5인 셀 배치 (A\*, Dijkstra 인식) |
| 🧹 지우기 | `3` | 셀 초기화 |
| S/E 드래그 | — | 시작·도착 노드 위치 변경 |

## 미로 생성

| 미로 | 설명 |
|------|------|
| **재귀 분할** | 전체 벽 채운 뒤 `carve()` 재귀로 통로 개척 |
| **랜덤 벽** | 각 셀 30% 확률로 벽 배치 |
| **나선형** | 바깥 테두리부터 안쪽으로 벽 그리기, 5% 랜덤 제거 |

## 단축키

| 키 | 동작 |
|----|------|
| `Space` | 탐색 실행 |
| `R` | 전체 초기화 |
| `C` | 경로만 지우기 |
| `1` / `2` / `3` | 도구 전환 |
| `L` | 한국어 / 영어 UI 전환 |

## 실행 방법

빌드 없이 `index.html`을 브라우저에서 바로 열면 됩니다.

```bash
git clone https://github.com/ashes331/Special-Playground.git
cd Special-Playground/pathfinding-visualizer
open index.html       # macOS
# xdg-open index.html  (Linux)
# start index.html     (Windows)
```

## 프로젝트 구조

```
pathfinding-visualizer/
├── index.html       ← HTML 뼈대
├── css/
│   └── style.css    ← 다크 사이버 테마 (accent: #00e5ff)
├── js/
│   └── main.js      ← 알고리즘, 미로 생성, Canvas 렌더링, i18n
└── README.md
```

## 구현 메모

- **알고리즘 팩토리** — `makeSearchFn(heuristic)` 하나로 A\*(맨해튼), A\*(유클리드), Dijkstra(`h=0`), Greedy(`h×100`) 모두 생성
- **우선순위 큐** — `push` 시 정렬하는 단순 배열 기반 Min-PQ (소규모 그리드에 충분)
- **가중치 셀** — `cellCost()` 함수로 WEIGHT 셀 이동 비용 5 반환, 일반 셀은 1
- **애니메이션** — 탐색과 렌더링 분리: 방문 순서대로 `await sleep(delay)` 체인, 속도 슬라이더로 딜레이 `[20, 10, 4, 1, 0]ms` 선택
- **i18n** — `STRINGS.ko` / `STRINGS.en` 객체, `data-i18n` 속성으로 DOM 일괄 적용, `L` 키로 토글
- **그리드 리사이즈** — `window.resize` 이벤트에 150ms 디바운스 후 `initGrid()` 재호출
