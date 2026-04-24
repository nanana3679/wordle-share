---
name: propose-topics
description: Wordle-share AI 덱 파이프라인의 주제 후보를 생성한다. 사용자가 "/propose-topics" 또는 "주제 후보 생성/뽑아줘"를 요청할 때 사용. 기존 `pnpm ai:propose-topics` 스크립트의 Skill 버전 (Anthropic API 호출 대신 Claude Code의 WebSearch/WebFetch 사용).
---

# propose-topics

`scripts/ai/artifacts/topics/topics-<runId>.json`과 `...trace.json`을 생성한다. 기존 산출물 포맷·검수 플로우는 동일. 설계 배경은 `docs/feature/ai-deck-generation-pipeline.md` 참고.

## 인자 (자연어 또는 옵션으로 전달)

- `category`: `global-trends` `korean-community` `entertainment` `news` `memes` `sports` `games` `food` `science` `books` 중 하나. 미지정 시 runId 해시로 자동 선정.
- `count`: 3~15 (기본 10).

## 실행 절차

1. `runId = YYYYMMDD-HHMMSS` (UTC, zero-padded).
2. 카테고리 미지정 시: runId 각 문자 코드에 대해 `acc = (acc * 31 + code) >>> 0` 누적 → 위 10개 중 `acc % 10`.
3. `scripts/ai/artifacts/topics/` 내 `topics-*.json` 중 `generatedAt`이 최근 28일 이내인 것들에서 `status !== "rejected"` 후보의 `topic` 수집 → **avoid 리스트**.
4. 카테고리 브리프(아래 표)에 맞춰 WebSearch / WebFetch로 후보 탐색. 후보당 2~4개 URL 인용, 공식 소스 우선 (위키·공식사이트 > 블로그·커뮤니티).
5. 주제 제약(아래 "주제 제약") 적용.
6. 산출물 디렉토리 보장: `mkdir -p scripts/ai/artifacts/topics`.
7. `topics-<runId>.json` Write (`wx`로 덮어쓰기 금지). 스키마는 `scripts/ai/schemas.ts`의 `TopicsArtifactSchema`.
8. `topics-<runId>.trace.json` Write: 실행한 검색 쿼리·fetch URL(200자 프리뷰)·주요 사고 흐름 요약.
9. `pnpm tsx -e "..."`로 zod 검증 실행 (아래 "검증" 참고). 실패 시 JSON 수정 후 재검증.

## 카테고리 브리프

| category | 주 소스 | 포커스 |
|---|---|---|
| global-trends | Google Trends, X trending, Reddit r/popular · r/all | 최근 3~7일 글로벌 바이럴 |
| korean-community | 더쿠, DCInside, 나무위키 최근변경, 네이트 판 | 한국 커뮤 최근 3~7일 이슈 |
| entertainment | Variety, Deadline, Billboard, Soompi, Allkpop, 연합뉴스 연예 | 이번 주 화제 영화/TV/음악/K-pop |
| news | Reuters, AP, 연합뉴스, BBC, NYT most-read | 지속성 있는 이슈 (정치 속보 제외) |
| memes | KnowYourMeme, r/memes, X 인용 급증 | 지금 정점 찍은 밈·바이럴 모먼트 |
| sports | ESPN, The Athletic, 스포츠조선, F1, match reports | 이번 주 최대 스포츠 스토리·선수 |
| games | IGN, Kotaku, Steam charts, Twitch top | 이번 주 릴리스·패치·이스포츠 |
| food | Bon Appetit, Eater, 네이버 푸드, TikTok food | 바이럴 푸드·시즌 식재료·맛집 |
| science | Nature news, Ars Technica science, Quanta, 사이언스온 | 대중이 반응한 과학 스토리 |
| books | NYT Bestsellers, 교보문고, BookTok | 이번 주 화제 책·작가 |

## 주제 제약

- **덱 크기 무제한**: 작은 세트(7명) / 큰 세트(포켓몬 전체) 모두 OK.
- **단어 길이 무제한**: 2글자(`rm`, `iu`)부터 긴 이름까지 OK.
- **a-z 로마자만 가능**: 영어 또는 로마자 고유명사. 로컬라이즈 프랜차이즈(포켓몬 등)는 **글로벌 공식 로마자** 사용 (피카츄→`pikachu`).
- **졸업/은퇴 멤버 포함**: BTS는 영원히 7명, 홀로라이브는 졸업 멤버 포함.
- **태그 taxonomy 자연스러운 주제 선호** (세대/타입/지부/소속) — 서브카테고리가 아예 없으면 가치↓.
- 바이럴 신호 강한 주제 우선 (최근 게시일·교차 출현·댓글/공유 급증).
- 정치적 양극화·비극적·민감 뉴스 회피.
- 단일 개인의 사적 이슈 회피, 문화적 공명이 넓은 주제 선호.
- avoid 리스트와 중복·근접 패러프레이즈 금지.

## 산출 JSON 형태

```json
{
  "runId": "20260424-120000",
  "generatedAt": "2026-04-24T12:00:00.000Z",
  "category": "entertainment",
  "model": "claude-code-skill",
  "candidates": [
    {
      "id": "20260424-120000-c1",
      "topic": "...",
      "description": "1-2 문장",
      "rationale": "왜 이번 주에 핫한가 + 출처 인용",
      "viralitySignals": ["구체 신호 2~4개"],
      "sources": [{ "url": "https://...", "title": "...", "publishedAt": "2026-04-18" }],
      "status": "pending"
    }
  ]
}
```

- `id`: `<runId>-c<index>` (1-indexed).
- `model`: `"claude-code-skill"` 고정 (Skill 기반임을 나타냄).
- `sources[].url`은 http/https만.

## trace JSON 형태

```json
{
  "runId": "...",
  "generatedAt": "...",
  "webSearches": [{ "query": "...", "resultCount": 0, "topUrls": ["..."] }],
  "webFetches": [{ "url": "...", "retrievedAt": "...", "preview": "처음 200자" }],
  "notes": "선정 근거 요약·판단 기록"
}
```

## 검증

```bash
pnpm tsx -e "const { TopicsArtifactSchema } = require('./scripts/ai/schemas'); const fs = require('fs'); const path = process.argv[1]; TopicsArtifactSchema.parse(JSON.parse(fs.readFileSync(path, 'utf8'))); console.log('ok');" scripts/ai/artifacts/topics/topics-<runId>.json
```

검증 실패 시 JSON을 수정해 재검증. 수정해도 통과 못 하면 사용자에게 상황을 보고.

## 완료 메시지

```
[propose-topics] wrote N candidates to scripts/ai/artifacts/topics/topics-<runId>.json
Next: review the file, set "status": "approved"/"rejected", then run /generate-decks <path>.
```
