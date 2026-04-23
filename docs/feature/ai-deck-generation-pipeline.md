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
| `lib/ai/deck-builder.ts` | 주제 → 덱 초안(이름/설명/단어 배열) 변환 + `processWords` 검증 |
| `scripts/ai/README.md` | 사용법, 검수 가이드 |

## 파이프라인 흐름

```text
propose-topics (LLM + web_search)
  ↓  scripts/ai/artifacts/topics/topics-<runId>.json
👤 관리자가 JSON 편집 (status: pending → approved/rejected)
  ↓
generate-decks (LLM + web_search, 태그 포함)
  ↓  scripts/ai/artifacts/decks/decks-<runId>.json
👤 관리자가 단어/태그/이름/설명 검수 (status: approved)
  ↓
(보류) upload-decks — 익명 덱 작성 기능 + words jsonb 마이그레이션 후 구현
```

## 덱 단어 포맷: 태그 기반

단어마다 카테고리 태그가 붙습니다. **플레이어가 게임 시작 전 태그를 선택해 난이도/범위를
능동적으로 조절**하는 용도. 덱 크기 자체에는 상한이 없음 — 포켓몬처럼 큰 세트도 그대로 담고,
플레이어가 "1세대만" 같은 필터로 좁혀서 플레이.

```json
{
  "language": "en",
  "words": [
    { "word": "pikachu",   "tags": ["gen1", "electric", "mascot"] },
    { "word": "charizard", "tags": ["gen1", "fire", "starter-evolution"] }
  ]
}
```

## 설계 결정

- **테이블 분리 안 함**: 사용자 구분 없이 동일 테이블. AI 흔적은 내부 메타(추후 sidecar 테이블)에만.
- **계정 불필요**: 익명 덱 작성 기능이 일회성 핸들/비번으로 동작하므로 봇 계정 관리 제거.
- **사람 검수 게이트 2개**: 주제 단계, 덱 단계 각각. 초기 단계라 자동화보다 품질 우선.
- **산출물은 JSON 파일**: 스테이지 테이블(과투자) 대신 가볍게. `.gitignore`에 포함(로컬 보관).
- **주제 중복 회피**: 실행 시 최근 4주 `topics/*.json`에서 `rejected`가 아닌 주제를 읽어 프롬프트에 주입.

## 모델/도구

- `claude-sonnet-4-6` (비용/품질 균형)
- 주제 선정·덱 초안 모두 `web_search_20260209` + `web_fetch_20260209` 사용
- 덱 초안은 공식 로스터/리스트 페이지를 먼저 확인한 뒤 단어 구성 — 할루시네이션 방지
- 로컬라이즈된 이름(포켓몬 등)은 **글로벌 공식 로마자 표기** 사용 (피카츄 → `pikachu`)
- 졸업/은퇴 멤버는 제외하지 않고 canonical로 포함 (BTS, 홀로라이브 등)
- `thinking: { type: "adaptive" }`

## 카테고리 로테이션

10개 카테고리(`global-trends`, `korean-community`, `entertainment`, `news`, `memes`, `sports`,
`games`, `food`, `science`, `books`). `--category` 미지정 시 runId 해시로 자동 선택 → 자연스런 분산.

## 단어 검증

`lib/wordConstraints.ts`의 `processWords`를 그대로 재사용 (a-z 전용, 중복 제거). 단어 개수
제한은 없고, 검증 실패 시 오류 메시지 첨부하여 3회까지 재시도. 태그는 lowercase·hyphenated로
정규화 후 중복 제거.

## 업로드 단계 (미구현)

연결되어야 할 두 가지:
1. **익명 덱 작성 기능**: `decks.creator_id` nullable, `author_handle`/`author_password_hash` 추가, `createAnonymousDeck` 서버 액션
2. **단어 태그 DB 스키마**: 현재 `decks.words text[]` → `jsonb` 전환. 또는 `deck_words` 별도 테이블 신설.
   파이프라인이 태그 포함 구조를 내므로, 게임 쪽 카테고리 선택기가 동작하려면 이 변경 필수.

둘 다 머지된 뒤 `scripts/ai/upload-decks.ts`가 `approved` 덱을 일괄 POST.

## 향후 확장 (파이프라인 밖 기능)

- 게임 플레이 페이지: 덱 선택 후 **태그 선택기** — 플레이어가 원하는 범위만 필터링
- 꼬들(한글)·히라가나 모드: 단어 검증 로직 + 키보드 컴포넌트 분리. `DeckLanguageSchema`가 `en`/`ko`/`ja` 지원
- AI 덱만 추적하는 sidecar 테이블(`deck_ai_metadata`) — 통계/롤백용
- Vercel Cron으로 매일 `propose-topics`만 자동 실행, 관리자에게 알림
