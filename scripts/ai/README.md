# AI 덱 생성 파이프라인

콜드스타트 방지용으로 AI가 주제를 선정하고 덱 초안을 만드는 반자동 파이프라인입니다.
**업로드는 아직 수동** — 익명 덱 작성 기능이 머지되면 업로드 스크립트가 추가됩니다.

자세한 설계 배경은 `docs/feature/ai-deck-generation-pipeline.md` 참고.

## 사전 준비

1. `.env.local`에 `ANTHROPIC_API_KEY=sk-ant-...` 추가
2. `pnpm install` (첫 실행 시)

## 실행 순서

### 1) 주제 후보 생성

```bash
pnpm ai:propose-topics
# 옵션:
#   --category <name>  특정 카테고리 지정 (기본: runId 해시로 로테이션)
#   --count <n>        후보 개수 (기본 10, 범위 3~15)
```

카테고리: `global-trends`, `korean-community`, `entertainment`, `news`, `memes`, `sports`, `games`, `food`, `science`, `books`

출력 파일:
- `scripts/ai/artifacts/topics/topics-<runId>.json` — 검수 대상 (후보 목록)
- `scripts/ai/artifacts/topics/topics-<runId>.trace.json` — 실행 트레이스 (thinking, 웹서치 쿼리/URL, 토큰 사용량). 검수자가 "AI가 어떤 과정으로 이 주제를 뽑았는지" 평가할 때 참고.

### 2) 주제 검수 (사람)

생성된 JSON을 열고 각 후보의 `status`를 `"pending"` → `"approved"` 또는 `"rejected"`로 수정.
필요하면 `reviewNote`에 메모 추가.

### 3) 덱 초안 생성

```bash
pnpm ai:generate-decks scripts/ai/artifacts/topics/topics-<runId>.json
```

`status: "approved"`인 주제만 덱으로 변환. 단어는 `processWords`(`lib/wordConstraints.ts`)
기준으로 a-z만 통과 — 비허용 문자가 섞인 토큰은 경고 로그와 함께 해당 단어만 드롭됩니다
(전체 재시도 아님). 파싱·API 오류 등 전체 실패만 최대 3회 재시도 후 스킵.

출력 파일:
- `scripts/ai/artifacts/decks/decks-<runId>.json` — 검수 대상 (덱 초안 목록)
- `scripts/ai/artifacts/decks/decks-<runId>.trace.json` — 덱별 실행 트레이스

각 단어는 `{ word, tags[] }` 구조. 태그는 플레이어가 게임 시작 전에 선택해서 난이도·범위를
조절하는 데 쓰이므로, 검수 시 태그 일관성(같은 덱 안에서 taxonomy 통일)을 확인하는 게 중요.

### 4) 덱 검수 (사람)

단어 목록, 태그, 이름, 설명을 직접 확인. 필요하면 편집. `status`를 `"approved"`로 변경.

### 5) 업로드 (임시 수동)

현재는 익명 덱 작성 기능이 없어 실제 업로드 경로가 없습니다. 기능 머지 뒤 이 파이프라인에
`scripts/ai/upload-decks.ts`가 붙고, 승인된 덱을 일괄 업로드하게 됩니다.

## 주제 중복 회피

`propose-topics`는 실행 시 `scripts/ai/artifacts/topics/`의 최근 4주치 JSON을 읽어
`rejected`가 아닌 과거 주제를 모두 "피해야 할 목록"으로 LLM에게 넘깁니다.
**중복 회피가 동작하려면 과거 산출물을 삭제하지 말고 보관**해야 합니다. 기본적으로
`artifacts/`는 `.gitignore`에 포함되어 있으므로 로컬에만 남아 있습니다. 팀 공유가 필요하면
검수 완료된 JSON만 별도로 커밋하거나 드라이브에 아카이브하세요.

## 비용/모델

- 모델: `claude-sonnet-4-6` (`lib/ai/client.ts:AI_MODEL`)
- 주제 선정·덱 초안 모두 `web_search_20260209` + `web_fetch_20260209` 서버사이드 도구 사용
- 덱 초안은 공식 로스터/리스트를 먼저 확인한 뒤 단어 구성 (할루시네이션 방지)
- Adaptive thinking 사용 — `budget_tokens` 별도 지정 안 함

## 트레이스 파일로 AI 동작 평가

`*.trace.json`에 다음이 기록됨:
- `thinking[]` — 모델의 사고 과정 요약
- `webSearches[]` — 실행한 검색 쿼리와 결과 수, 상위 5개 URL
- `webFetches[]` — 실제 fetch한 URL + 본문 미리보기 200자
- `usage` — 입/출력 토큰, 캐시 사용량
- `finalText` — 최종 응답 원본

검수 시 체크포인트:
- 검색 쿼리가 주제에 맞게 구체적인가 (`"hololive members 2026"` vs `"vtuber"` 같은 모호한 것)
- fetch한 URL이 공식 소스인가 (위키, 공식 사이트 vs 블로그/커뮤니티 잡글)
- thinking에 주제 적합성 판단 근거가 있는가
- 토큰 과소비 패턴 — 한 번 실행에 50k 이상 input이면 뭔가 반복 fetch 중

## 트러블슈팅

- **`ANTHROPIC_API_KEY is not set`** — `.env.local` 확인
- **`Model response did not contain a JSON object`** — LLM이 포맷을 어김. 스크립트 재실행
- **덱 3회 모두 검증 실패** — 주제가 영단어로 풀어내기 어려울 가능성. 주제를 `rejected`로 바꾸고 다른 주제로 재실행.
- **`EEXIST` — 파일이 이미 존재** — 같은 초에 재실행하면 발생. 몇 초 뒤 다시 실행하거나 기존 산출물을 정리.
