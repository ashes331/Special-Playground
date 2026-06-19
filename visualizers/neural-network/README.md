# 🧠 Neural Network Playground

바닐라 HTML5, CSS, JavaScript로 만든 피드포워드 신경망 학습 시각화 도구입니다.  
외부 라이브러리 없이 행렬 연산, 역전파, 데이터 생성을 모두 직접 구현했습니다.

## 기능

| 기능 | 설명 |
|------|------|
| **레이어 구성** | 은닉층 수·뉴런 수 UI로 직접 조절 (기본 [4, 4]) |
| **활성화 함수** | ReLU / Tanh / Sigmoid 선택 (출력층은 Sigmoid 고정) |
| **Learning rate** | 0.001 ~ 1 선택 |
| **Batch size** | 10 / 32 / 64 / 128 선택 |
| **결정 경계** | 2D 입력 평면을 픽셀 단위로 샘플링하여 실시간 컬러 렌더링 |
| **손실 곡선** | 에폭별 Binary Cross-Entropy Loss 실시간 플롯 (최대 300 포인트) |
| **네트워크 다이어그램** | 가중치를 엣지 색상(파랑=양수, 빨강=음수)·투명도로 표현 |
| **Step 모드** | 학습 1 에폭씩 수동 진행 |
| **데이터 재생성** | 노이즈·샘플 수 조절 후 즉시 재생성 |

## 데이터셋

| 데이터셋 | 설명 |
|----------|------|
| **XOR** | `x1×x2 > 0` 기준 이진 분류 |
| **Circle** | 반지름 0.5 기준 내부/외부 분류 |
| **Spiral** | 2클래스 나선형, 비선형 경계 |
| **Gaussian** | (-0.5, 0) / (0.5, 0) 중심 정규분포 2개 |

## 사용법

1. **Dataset** — 데이터셋 선택, 노이즈·샘플 수 조절 후 재생성
2. **Network** — `+` 버튼으로 레이어 추가, 뉴런 수 직접 입력
3. **Hyperparameters** — Learning rate, Activation, Batch size 설정
4. **▶ 학습 시작** — 결정 경계·손실 곡선·네트워크 다이어그램 실시간 갱신
5. **초기화** — 가중치 재초기화 (데이터·구조 유지)

## 실행 방법

빌드 없이 `index.html`을 브라우저에서 바로 열면 됩니다.

```bash
git clone https://github.com/ashes331/Special-Playground.git
cd Special-Playground/neural-network-playground
open index.html       # macOS
# xdg-open index.html  (Linux)
# start index.html     (Windows)
```

## 프로젝트 구조

```
neural-network-playground/
├── index.html       ← HTML 뼈대
├── css/
│   └── style.css    ← 라이트 모노 테마 (IBM Plex)
├── js/
│   └── main.js      ← 신경망 구현, 데이터 생성, Canvas 렌더링
└── README.md
```

## 구현 메모

- **가중치 초기화** — He initialization (`scale = √(2/fan_in)`)
- **Forward pass** — 행렬 곱 직접 구현 (`matMul`), 은닉층 선택 활성화 함수, 출력층 Sigmoid 고정
- **Loss** — Binary Cross-Entropy (`-y·log(p) - (1-y)·log(1-p)`), epsilon clipping `1e-7`
- **Backward pass** — 체인 룰 기반 수동 역전파, `delta = (pred - y)` (BCE + Sigmoid 합성 미분)
- **Mini-batch SGD** — 에폭마다 인덱스 셔플 후 배치 슬라이스, 배치 평균 그래디언트로 가중치 업데이트
- **결정 경계 렌더링** — 전체 픽셀을 2000개 청크 단위로 배치 예측 후 `ImageData`로 직접 픽셀 채우기
- **손실 곡선** — 최근 300 에폭 유지, Y축 최댓값 기준 정규화
- **네트워크 다이어그램** — 가중치 부호로 색상 분기, `min(1, |w|×0.5)`로 투명도 매핑
- **학습 속도** — `stepsPerFrame = 5` (1 RAF당 5 에폭)
