# AI 덱 생성 파이프라인

## 목적

서비스 초기 콜드스타트(덱이 적어 탐색 가치가 없음) 방지. AI가 웹서치로 주제를 선정하고 덱 초안을 만들어두면
관리자가 검수 후 업로드하는 반자동 플로우. 사용자가 봤을 때 AI 덱과 일반 덱은 구분 불가(같은 `decks` 테이블,
같은 목록/플레이 경로).

## 구성 요소

| 파일 | 역할 |
|---|---|
| `scripts/ai/schemas.ts` | zod 기반 산출물 포맷(topics, decks, 카테고리) 정의 |
| `scripts/ai/propose-topics.ts` | 주제 후보 JSON 생성 |
| `scripts/ai/generate-decks.ts` | 승인된 주제로 덱 초안 JSON 생성 |
| `lib/ai/client.ts` | Anthropic SDK 클라이언트 + 응답 파싱 유틸 |
| `lib/ai/topic-selector.ts` | 웹서치 + LLM으로 주제 후보 생성 |
| `lib/ai/deck-builder.ts` | 주제 → 덱 초안(이름/설명/단어 배열) 변환 + `parseWordsString` 검증 |
| `scripts/ai/README.md` | 사용법, 검수 가이드 |

## 파이프라인 흐름

```
propose-topics (LLM + web_search)
  ↓  scripts/ai/artifacts/topics/topics-<runId>.json
👤 관리자가 JSON 편집 (status: pending → approved/rejected)
  ↓
generate-decks (LLM, 검색 없음)
  ↓  scripts/ai/artifacts/decks/decks-<runId>.json
👤 관리자가 단어/이름/설명 검수 (status: approved)
  ↓
(보류) upload-decks — 익명 덱 작성 기능 머지 후 구현
```

## 설계 결정

- **테이블 분리 안 함**: 사용자 구분 없이 동일 테이블. AI 흔적은 내부 메타(추후 sidecar 테이블)에만.
- **계정 불필요**: 익명 덱 작성 기능이 일회성 핸들/비번으로 동작하므로 봇 계정 관리 제거.
- **사람 검수 게이트 2개**: 주제 단계, 덱 단계 각각. 초기 단계라 자동화보다 품질 우선.
- **산출물은 JSON 파일**: 스테이지 테이블(과투자) 대신 가볍게. `.gitignore`에 포함(로컬 보관).
- **주제 중복 회피**: 실행 시 최근 4주 `topics/*.json`에서 `rejected`가 아닌 주제를 읽어 프롬프트에 주입.

## 모델/도구

- `claude-sonnet-4-6` (비용/품질 균형)
- 주제 선정: `web_search_20260209` + `web_fetch_20260209` (dynamic filtering 내장)
- 덱 초안: 검색 없이 LLM 단독
- `thinking: { type: "adaptive" }`

## 카테고리 로테이션

10개 카테고리(`global-trends`, `korean-community`, `entertainment`, `news`, `memes`, `sports`,
`games`, `food`, `science`, `books`). `--category` 미지정 시 runId 해시로 자동 선택 → 자연스런 분산.

## 단어 검증

`lib/wordConstraints.ts`의 `processWords`를 그대로 재사용. 규칙: a-z 전용, 최소 1글자, 중복 제거.
초안에선 12~20개 단어를 요청하고 검증 실패 시 오류 메시지 첨부하여 3회까지 재시도.

## 업로드 단계 (미구현)

익명 덱 작성 기능이 필요로 하는 것:
- `decks.creator_id` nullable 전환
- `author_handle`, `author_password_hash` 컬럼 추가
- `createAnonymousDeck` 서버 액션

이 기능이 머지되면 `scripts/ai/upload-decks.ts`는 `decks-<runId>.json`에서 `approved`만 모아
익명 API로 순차 POST. `authorHandle`은 그때 봇별 고정값 or 랜덤값으로 채움.

## 향후 확장

- AI 덱만 추적하는 sidecar 테이블(`deck_ai_metadata`) — 통계/롤백용
- Vercel Cron으로 매일 `propose-topics`만 자동 실행, 관리자에게 알림
- 덱 편집 UI에서 산출물 JSON 직접 불러와 검수
