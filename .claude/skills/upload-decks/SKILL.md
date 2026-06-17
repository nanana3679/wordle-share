---
name: upload-decks
description: Wordle-share AI 덱 파이프라인에서 사람이 approved로 표시한 decks artifact를 public API로 업로드한다. 사용자가 "/upload-decks <path>", "승인된 AI 덱 업로드", "AI 덱 올려줘"를 요청할 때 사용. Anthropic API 키는 필요 없고 BOT_NICK/BOT_PW/BOT_SEED_TOKEN/API_BASE_URL만 사용한다.
---

# upload-decks

`scripts/ai/artifacts/decks/decks-<runId>.json`에서 `status: "approved"`인 덱만 `/api/decks`로 업로드한다.

## 인자

- `inputPath`: decks artifact 경로. 예: `scripts/ai/artifacts/decks/decks-20260424-120000.json`.

## 필요한 환경변수

- `BOT_NICK`: `bot_` prefix 닉네임.
- `BOT_PW`: 봇 덱 비밀번호.
- `BOT_SEED_TOKEN`: 서버 `BOT_SEED_TOKEN`과 같은 값. `x-bot-token` 헤더로 사용.
- `API_BASE_URL`: 업로드 대상. production 예: `https://wordle-share-olive.vercel.app`.

Anthropic/OpenAI API 키는 필요 없다. 이 스킬은 AI 생성을 하지 않고 검수 완료 artifact만 업로드한다.

## 실행 절차

1. `inputPath`를 읽고 `DecksArtifactSchema`로 검증한다.
2. `drafts` 중 `status === "approved"`만 추린다. 0개면 중단한다.
3. 업로드 전 사용자에게 대상 `API_BASE_URL`, 업로드 덱 수, 덱 이름 목록을 짧게 확인한다.
4. 아래 명령을 실행한다.

```bash
pnpm tsx scripts/ai/upload-decks.ts <inputPath>
```

5. 실패한 덱이 있으면 status code와 메시지를 보고한다.

## 완료 메시지

```text
[upload-decks] uploaded N approved deck(s) from <inputPath>.
```

