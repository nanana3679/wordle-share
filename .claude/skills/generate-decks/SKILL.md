---
name: generate-decks
description: Wordle-share AI 덱 파이프라인에서 승인된 주제로 덱 초안을 생성한다. 사용자가 "/generate-decks <path>" 또는 "덱 초안 만들어줘"를 요청할 때 사용. 기존 `pnpm ai:generate-decks` 스크립트의 Skill 버전.
---

# generate-decks

입력 `topics-<runId>.json`에서 `status: "approved"`인 주제를 덱 초안으로 변환하여 `scripts/ai/artifacts/decks/decks-<runId>.json` + trace를 생성.

## 인자

- `inputPath`: topics 아티팩트 파일 경로. 예: `scripts/ai/artifacts/topics/topics-20260424-120000.json`.

## 실행 절차

1. `inputPath` Read 후 JSON.parse. zod로 스키마 검증(`TopicsArtifactSchema`).
2. `candidates` 중 `status === "approved"`만 추림. 0개면 에러 보고 후 중단.
3. 새 `runId = YYYYMMDD-HHMMSS` (UTC).
4. 각 승인 주제마다 아래 "덱 빌드 단계" 수행. 개별 실패는 스킵하고 다음으로 진행 (최대 3회 재시도).
5. `scripts/ai/artifacts/decks/` 보장 후 `decks-<runId>.json` + `decks-<runId>.trace.json` Write (`wx`).
6. zod 검증 (`DecksArtifactSchema`).

## 덱 빌드 단계

1. **먼저 WebSearch / WebFetch로 공식 로스터·리스트를 확인**. 기억에 의존하지 말 것. 공식 사이트·위키·나무위키 infobox 우선.
2. 검증된 데이터로 덱 구성.
3. `lib/wordConstraints.ts`의 `processWords`에 통과할 수 있게 단어를 정규화 (소문자, 공백 제거, 중복 제거, a-z only).

## 단어 규칙

- **a-z만**. 숫자·공백·하이픈·아포스트로피·악센트 전부 금지.
- 중복 불가 (case-insensitive). 같은 단어가 다른 태그로 등장하면 **태그 합집합**으로 병합.
- **크기 상한 없음**: 완전성 우선. 7명(BTS)도 150+(포켓몬·홀로라이브 전체)도 OK.
- **길이 제한 없음**: `rm`, `iu`, `ai`, `ame`, `ina` 같은 2글자 아이콘 단어 포함 필수.
- **로컬라이즈된 이름은 글로벌 공식 로마자** (`pikachu`, 아니라 `piccachu`; `charizard`, 아니라 `lizardon`). 영문 공식 사이트·Wikipedia 우선.
- **졸업/은퇴/과거 멤버도 canonical에 포함** — BTS 7명, 홀로라이브 졸업 멤버.
- 비 a-z 토큰은 **해당 단어만 drop**하고 trace에 기록. 덱 전체 실패 아님.

## 태그 taxonomy (엄격)

- **객관적 대분류만**. Wikipedia·나무위키 infobox 또는 공식 카테고리에 실제로 존재하는 라벨.
- **금지 (주관·편집자 평가)**: `mascot`, `iconic`, `popular`, `main-character`, `active`, `famous`, `legendary-character`, `favorite`, `starter-ish`. 팬 두 명이 이견이 가능하면 drop.
- **허용 (객관적 분류)**:
  - 세대·시대·데뷔년: `gen1`, `4th-gen`, `debut-2018`, `wave-1`.
  - 공식 타입·클래스: `electric-type`, `water-type`, `vocalist`, `rapper`, `starter-pokemon`.
  - 지부·소속·지역: `hololive`, `jp-branch`, `en-branch`, `yg`, `sm`.
  - 그룹·서브유닛: `holox`, `hope-world`, `bts`, `newjeans`.
  - 로스터 상태 (공식 소스 기반만): `graduated`, `active-member`, `former-member`. ❌ `popular` / `top-tier`.
- **리트머스**: 이 라벨이 정확히 적용된 위키·공식 섹션을 가리킬 수 있는가? 못 가리키면 drop.
- **형식**: lowercase, 복수 단어는 하이픈.
- 단어당 **2~4개**. 고품질 소수 > 퍼지 다수.
- **덱 내 일관성**: 같은 덱에서 절반은 세대 태그 / 절반은 속성 태그 식으로 섞지 말 것.
- 예:
  - 포켓몬: `pikachu` → `["gen1", "electric-type"]`.
  - 포켓몬 스타터: `bulbasaur` → `["gen1", "grass-type", "starter-pokemon"]`.
  - VTuber: `pekora` → `["hololive", "jp-branch", "gen3"]`.

## 이름/설명 규칙

- 한국어 기본 (주제가 본질적으로 영어 전용이 아닌 이상).
- 캐주얼·대화체. 과도한 격식 금지.
- 좋은 예: `"홀로라이브 팬이면 다 아는 이름들"`, `"이번 주 빠진 드라마 단어들"`.
- 나쁜 예: `"2026년 홀로라이브 프로덕션 소속 탤런트 명칭 모음"`.

## 산출 JSON (`decks-<runId>.json`)

```json
{
  "runId": "...",
  "generatedAt": "...",
  "model": "claude-code-skill",
  "sourceTopicsRunId": "<입력 파일의 runId>",
  "drafts": [
    {
      "id": "<runId>-d<index>",
      "topicId": "<원본 후보 id>",
      "topic": "<원본 후보 topic>",
      "name": "...",
      "description": "...",
      "language": "en",
      "words": [
        { "word": "pikachu", "tags": ["gen1", "electric-type"] }
      ],
      "authorHandle": "TBD",
      "status": "pending"
    }
  ]
}
```

- `id`: `<runId>-d<index>` (1-indexed, 승인된 주제 순서).

## trace JSON (`decks-<runId>.trace.json`)

```json
{
  "runId": "...",
  "generatedAt": "...",
  "drafts": [
    {
      "draftId": "...",
      "topic": "...",
      "webSearches": [{ "query": "...", "resultCount": 0, "topUrls": ["..."] }],
      "webFetches": [{ "url": "...", "retrievedAt": "...", "preview": "..." }],
      "rejectedTokens": ["..."],
      "mergedDuplicates": 0,
      "notes": "..."
    }
  ]
}
```

## 검증

```bash
pnpm tsx -e "const { DecksArtifactSchema } = require('./scripts/ai/schemas'); const fs = require('fs'); const path = process.argv[1]; DecksArtifactSchema.parse(JSON.parse(fs.readFileSync(path, 'utf8'))); console.log('ok');" scripts/ai/artifacts/decks/decks-<runId>.json
```

## 완료 메시지

```text
[generate-decks] wrote N draft deck(s) to scripts/ai/artifacts/decks/decks-<runId>.json
Next: review words/tags/name/description, set "status": "approved" on keepers.
```
