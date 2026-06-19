# 🌐 Translator

바닐라 HTML5, CSS, JavaScript로 만든 다국어 번역 도구입니다.  
서버 없이 MyMemory API를 직접 호출하여 GitHub Pages에서 바로 동작합니다.

## 기능

- **16개 언어 지원** — 한국어, 영어, 일본어, 중국어(간체/번체), 프랑스어, 독일어, 스페인어, 이탈리아어, 포르투갈어, 러시아어, 아랍어, 힌디어, 베트남어, 태국어, 인도네시아어
- **언어 스왑** — ⇄ 버튼으로 소스↔타겟 전환, 번역 결과가 있으면 입력란으로 이동
- **글자 수 표시** — 4800자 초과 시 경고색으로 전환 (최대 5000자)
- **복사 버튼** — 번역 결과 원클릭 클립보드 복사, 1.6초 후 원복
- **번역 중 애니메이션** — `...` 점 페이드 인디케이터
- **KO/EN UI 토글** — 헤더 버튼 또는 `L` 키로 전체 UI 언어 전환
- **단축키** — `Ctrl+Enter` 번역, `L` UI 언어 전환
- **API 키 불필요** — MyMemory 무료 API, 정적 호스팅 환경에 최적화

## 조작법

| 방법 | 동작 |
|------|------|
| 번역하기 버튼 | 번역 실행 |
| `Ctrl+Enter` | 번역 실행 |
| ⇄ 버튼 | 소스↔타겟 언어 교체 |
| `L` 키 | KO/EN UI 전환 |
| ✕ 버튼 | 입력 초기화 |
| ⎘ 버튼 | 결과 복사 |

## 실행 방법

빌드 없이 `index.html`을 브라우저에서 바로 열면 됩니다.

```bash
git clone https://github.com/ashes331/Special-Playground.git
cd Special-Playground/translator
open index.html       # macOS
# xdg-open index.html  (Linux)
# start index.html     (Windows)
```

## 프로젝트 구조

```
translator/
├── index.html       ← HTML 뼈대
├── css/
│   └── style.css    ← 다크 퍼플 테마
├── js/
│   └── main.js      ← 번역 로직, i18n, API 호출
└── README.md
```

## 구현 메모

- **MyMemory API** — `https://api.mymemory.translated.net/get?q=...&langpair=ko|en` 형태로 직접 호출, 인증 불필요
- **i18n 구조** — `i18n.ko` / `i18n.en` 객체로 UI 문자열 관리, `syncLabels()`로 전체 일괄 적용
- **언어 목록** — `LANGS` 배열에 `code`, `label.ko`, `label.en` 포함, `buildSelects()` 호출 시 현재 `uiLang` 기준으로 렌더링
- **스왑 로직** — 번역 결과가 있을 때 스왑하면 결과가 입력란으로 이동, 출력 초기화
- **다크 퍼플 테마** — `#0A0A0F` 배경, `#7C5CBF` 액센트, Space Grotesk + Inter 폰트 조합
