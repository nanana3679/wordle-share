# AI 덱 생성 파이프라인

콜드스타트 방지용으로 AI가 주제를 선정하고 덱 초안을 만드는 반자동 파이프라인.
**Claude Code Skill 기반** — 구독 내에서 돌아가므로 실행당 API 토큰 비용 없음.

설계 배경은 `docs/feature/ai-deck-generation-pipeline.md` 참고.

## 사전 준비

Claude Code만 있으면 됨. 별도 API 키·환경변수 불필요.
Skill 정의는 `.claude/skills/propose-topics/SKILL.md`, `.claude/skills/generate-decks/SKILL.md`.

## 실행 순서

### 1) 주제 후보 생성

```
/propose-topics
```

자연어 또는 옵션으로 인자 전달 가능:
- `category`: `kpop`, `vtuber`, `anime-manga`, `videogames`, `mobile-gacha`, `film-tv`, `sports`, `character-brands`, `tabletop-rpg`, `mythology-history` 중 하나 (기본: runId 해시로 로테이션). Roster-first(≥50 엔티티, 2+ tag axes) IP 중심 카테고리. 이상형은 LoL·포켓몬·홀로라이브.
- `count`: 후보 개수 (기본 10, 범위 3~15)

출력:
- `scripts/ai/artifacts/topics/topics-<runId>.json` — 검수 대상
- `scripts/ai/artifacts/topics/topics-<runId>.trace.json` — 실행 트레이스 (검색 쿼리/URL, 판단 노트)

### 2) 주제 검수 (사람)

JSON을 열고 각 후보의 `status`를 `"pending"` → `"approved"` 또는 `"rejected"`로 수정.
필요하면 `reviewNote`에 메모 추가.

### 3) 덱 초안 생성

```
/generate-decks scripts/ai/artifacts/topics/topics-<runId>.json
```

`status: "approved"`인 주제만 덱으로 변환. 단어는 `processWords`(`lib/wordConstraints.ts`) 기준으로
a-z만 통과 — 비허용 문자가 섞인 토큰은 경고와 함께 해당 단어만 drop (전체 재시도 아님).
파싱·검증 오류 등 전체 실패만 최대 3회 재시도 후 스킵.

출력:
- `scripts/ai/artifacts/decks/decks-<runId>.json` — 검수 대상
- `scripts/ai/artifacts/decks/decks-<runId>.trace.json` — 덱별 실행 트레이스

각 단어는 `{ word, tags[] }` 구조. 태그는 플레이어가 게임 시작 전에 선택해서 난이도·범위를
조절하는 데 쓰이므로, 검수 시 태그 일관성(같은 덱 안에서 taxonomy 통일)을 확인하는 게 중요.

### 4) 덱 검수 (사람)

단어 목록, 태그, 이름, 설명을 직접 확인. 필요하면 편집. `status`를 `"approved"`로 변경.

### 5) 업로드 (임시 수동)

현재는 업로드 경로가 없음. `decks.words` jsonb 마이그레이션이 머지되면 파이프라인에
`scripts/ai/upload-decks.ts`가 붙고, 승인된 덱을 일괄 업로드하게 됨.

## 주제 중복 회피

`/propose-topics`는 실행 시 `scripts/ai/artifacts/topics/`의 최근 4주치 JSON을 읽어 `rejected`가
아닌 과거 주제를 모두 "피해야 할 목록"으로 취급. **중복 회피가 동작하려면 과거 산출물을 삭제하지
말고 보관**해야 함. 기본적으로 `artifacts/`는 `.gitignore`에 포함되어 있으므로 로컬에만 남아 있음.
팀 공유가 필요하면 검수 완료된 JSON만 별도 커밋하거나 드라이브에 아카이브.

## Skill 동작 / 트레이드오프

- 사용 도구: Claude Code 내장 `WebSearch`, `WebFetch`, `Read`, `Write`, `Bash`.
- API 호출 기반일 때의 `server_tool_use` 구조화 로그가 없음 → trace는 Skill이 직접 기록한 요약 형태.
- 실행마다 모델이 재해석하므로 결과가 약간씩 달라질 수 있음 (재현성 ↓, 비용 ↓).
- 프롬프트·타입·검증 규칙은 SKILL.md + `scripts/ai/schemas.ts`에 단일 소스로 유지.

## 트레이스 파일로 AI 동작 평가

`*.trace.json`에 다음이 기록됨:
- `webSearches[]` — 실행한 검색 쿼리와 상위 URL
- `webFetches[]` — fetch한 URL + 본문 미리보기 200자
- `notes` / `rejectedTokens` / `mergedDuplicates` — Skill 판단 기록

검수 시 체크포인트:
- 검색 쿼리가 주제에 맞게 구체적인가 (`"hololive members 2026"` vs `"vtuber"` 같은 모호한 것)
- fetch한 URL이 공식 소스인가 (위키, 공식 사이트 vs 블로그/커뮤니티 잡글)
- 주제 적합성·단어 정확성(할루시네이션 여부)에 대한 판단 근거가 있는가
- `rejectedTokens`가 과도하게 많으면 주제 자체가 a-z로 풀어내기 어려운 경우

## 트러블슈팅

- **동일 `<runId>.json`이 이미 존재** — 같은 초에 재실행하면 발생. 몇 초 뒤 다시 실행하거나 기존 산출물 정리.
- **덱 3회 모두 검증 실패** — 주제가 영단어로 풀어내기 어려울 가능성. 해당 주제를 `rejected`로 돌리고 다른 주제로 재실행.
- **스키마 검증 실패** — `pnpm tsx -e "..."` 검증 실패 시 Skill이 JSON을 수정하도록 유도. 수동으로도 `TopicsArtifactSchema`/`DecksArtifactSchema`에 맞춰 수정 가능.
