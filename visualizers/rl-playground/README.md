# 🤖 RL Playground

바닐라 HTML5, CSS, JavaScript로 만든 강화학습(Reinforcement Learning) 시각화 도구입니다.  
Q-Learning과 SARSA 에이전트가 그리드 월드를 탐색하는 과정을 실시간으로 확인할 수 있습니다.

## 알고리즘

| 알고리즘 | 유형 | 업데이트 방식 |
|----------|------|---------------|
| **Q-Learning** | Off-policy | `max Q(s', a')` — 다음 상태 최적 행동 기준 |
| **SARSA** | On-policy | 실제 선택된 `Q(s', a')` — 현재 정책 기준 |

**TD 업데이트 공식**
```
Q(s, a) ← Q(s, a) + α × [r + γ × Q(s', a') − Q(s, a)]
```

**ε-greedy 정책** — `ε` 확률로 랜덤 탐험, `1-ε` 확률로 greedy 선택  
**ε 감쇠** — 에피소드마다 `ε × decay` 적용, `ε_min` 하한 유지

## 환경

| 셀 타입 | 보상 | 설명 |
|---------|------|------|
| 🟡 Agent | — | 에이전트 현재 위치 |
| 🟢 Goal | **+10** | 목표 (에피소드 종료) |
| 🔴 Trap | **−1** | 함정 (에피소드 종료) |
| ⬛ Wall | — | 통과 불가, 제자리 유지 |
| ⬜ Empty | **−0.01** | 이동 패널티 (최단 경로 유도) |

**그리드 크기** — 5×5 / 8×8 / 10×10 (각 크기별 기본 레이아웃 내장)

## 하이퍼파라미터

| 파라미터 | 범위 | 기본값 |
|----------|------|--------|
| Learning Rate α | 0.01 ~ 0.99 | 0.10 |
| Discount Factor γ | 0.10 ~ 0.99 | 0.95 |
| Epsilon ε (시작) | 0.01 ~ 1.00 | 1.00 |
| Epsilon Decay | 0.900 ~ 0.999 | 0.995 |
| ε min | 0.01 ~ 0.30 | 0.05 |
| Speed | ×1 ~ ×10 | ×5 |

## 오버레이

| 오버레이 | 설명 |
|----------|------|
| **Q-value Heatmap** | 셀 최대 Q값을 색상 강도로 표현 |
| **Policy Arrows** | 각 셀 greedy 정책 방향 화살표 |
| **Value Numbers** | 셀 최대 Q값 숫자 표시 |

## 사용법

1. **Algorithm** — Q-Learning 또는 SARSA 선택
2. **Hyperparameters** — 슬라이더로 조절
3. **Grid Editor** — Edit mode 켜고 클릭으로 벽/함정/보상 배치
4. **▶ START** — 학습 시작, Episode Return · Steps/Episode 차트 실시간 갱신
5. 셀 클릭 → 해당 셀의 Q값 4방향 표시

## 실행 방법

빌드 없이 `index.html`을 브라우저에서 바로 열면 됩니다.

```bash
git clone https://github.com/ashes331/Special-Playground.git
cd Special-Playground/rl-playground
open index.html       # macOS
# xdg-open index.html  (Linux)
# start index.html     (Windows)
```

## 프로젝트 구조

```
rl-playground/
├── index.html       ← HTML 뼈대
├── css/
│   └── style.css    ← 다크 사이버 테마 (Space Mono + Inter)
├── js/
│   └── main.js      ← Q-Learning/SARSA 구현, Canvas 렌더링, 차트
└── README.md
```

## 구현 메모

- **Q-테이블** — `Q[r][c][a]` 3차원 배열, 초기값 0으로 초기화
- **TD 업데이트** — Q-Learning은 `max Q(s',a')`, SARSA는 `chooseAction()`으로 선택한 다음 행동의 Q값 사용
- **에피소드 종료** — Goal 또는 Trap 도달, 혹은 `GRID_SIZE² × 4` 스텝 초과 시 강제 종료
- **애니메이션** — `requestAnimationFrame` 루프, 1 RAF당 Speed 값만큼 에피소드 진행
- **캔버스 2레이어** — `gridCanvas`(셀 배경) + `overlayCanvas`(에이전트·화살표·히트맵) 분리
- **미니 차트** — 최근 120 에피소드 데이터로 그라데이션 라인 차트, Canvas 직접 드로잉
- **에피소드 로그** — 최대 50줄 유지, 성공/실패 색상 구분
