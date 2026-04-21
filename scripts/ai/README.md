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

출력 파일: `scripts/ai/artifacts/topics/topics-<runId>.json`

### 2) 주제 검수 (사람)

생성된 JSON을 열고 각 후보의 `status`를 `"pending"` → `"approved"` 또는 `"rejected"`로 수정.
필요하면 `reviewNote`에 메모 추가.

### 3) 덱 초안 생성

```bash
pnpm ai:generate-decks scripts/ai/artifacts/topics/topics-<runId>.json
```

`status: "approved"`인 주제만 덱으로 변환. 단어 배열은 `parseWordsString` 검증을 통과해야 하며,
실패 시 최대 3회 재시도 후 스킵.

출력 파일: `scripts/ai/artifacts/decks/decks-<runId>.json`

### 4) 덱 검수 (사람)

단어 목록, 이름, 설명을 직접 확인. 필요하면 편집. `status`를 `"approved"`로 변경.

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
- 주제 선정은 `web_search_20260209` + `web_fetch_20260209` 서버사이드 도구 사용
- 덱 초안은 검색 없이 LLM 단독 (토큰 절약)
- Adaptive thinking 사용 — `budget_tokens` 별도 지정 안 함

## 트러블슈팅

- **`ANTHROPIC_API_KEY is not set`** — `.env.local` 확인
- **`Model response did not contain a JSON object`** — LLM이 포맷을 어김. 스크립트 재실행
- **덱 3회 모두 검증 실패** — 주제가 영단어로 풀어내기 어려울 가능성. 주제를 `rejected`로 바꾸고 다시
