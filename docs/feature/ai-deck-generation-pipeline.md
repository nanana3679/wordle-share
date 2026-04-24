# AI 덱 생성 파이프라인

## 목적

서비스 초기 콜드스타트(덱이 적어 탐색 가치가 없음) 방지. AI가 웹서치로 주제를 선정하고 덱 초안을 만들어두면
관리자가 검수 후 업로드하는 반자동 플로우. 사용자가 봤을 때 AI 덱과 일반 덱은 구분 불가(같은 `decks` 테이블,
같은 목록/플레이 경로).

## 실행 방식: Claude Code Skill

기존 `@anthropic-ai/sdk` 기반 CLI 스크립트(`scripts/ai/*.ts`, `lib/ai/*.ts`)는 제거. 현재는 Claude Code
**Skill** 2개로 동작하며 실행 시 API 토큰 비용이 들지 않음 (Claude Code 구독 내 무료).

```text
/propose-topics            (Skill, WebSearch + WebFetch)
  ↓  topics-<runId>.json (검수용) + topics-<runId>.trace.json (실행 로그)
👤 관리자가 JSON 편집 (status: pending → approved/rejected)
  ↓
/generate-decks <path>     (Skill, WebSearch + WebFetch)
  ↓  decks-<runId>.json + decks-<runId>.trace.json
👤 관리자가 단어/태그/이름/설명 검수 (status: approved)
  ↓
(보류) upload-decks — 익명 덱 작성 + words jsonb 마이그레이션 후 구현
```

## 구성 요소

| 파일 | 역할 |
|---|---|
| `.claude/skills/propose-topics/SKILL.md` | 주제 후보 생성 Skill (프롬프트·규칙·출력 포맷) |
| `.claude/skills/generate-decks/SKILL.md` | 덱 초안 생성 Skill (태그 taxonomy 포함) |
| `scripts/ai/schemas.ts` | zod 기반 산출물 포맷 정의 (검증 + 향후 upload 스크립트 공용) |
| `scripts/ai/README.md` | 사용법, 검수 가이드 |

## 트레이스 파일

각 실행마다 `<runId>.trace.json` 생성 (검색 쿼리, fetch URL + 200자 프리뷰, 판단 노트). 검수자가
검색 품질·소스 신뢰성·추론 근거를 역추적해 평가. 자세한 건 `scripts/ai/README.md` 참고.

## 덱 단어 포맷: 태그 기반

단어마다 카테고리 태그가 붙음. **플레이어가 게임 시작 전 태그를 선택해 난이도/범위를 능동적으로 조절**
하는 용도. 덱 크기 자체에는 상한이 없음 — 포켓몬처럼 큰 세트도 그대로 담고, 플레이어가 "1세대만" 같은
필터로 좁혀서 플레이.

```json
{
  "language": "en",
  "words": [
    { "word": "pikachu",   "tags": ["gen1", "electric-type"] },
    { "word": "charizard", "tags": ["gen1", "fire-type", "flying-type"] }
  ]
}
```

태그는 **Wikipedia/나무위키 infobox 수준의 객관적 대분류**만 허용. `mascot`, `iconic`, `popular`,
`active` 같은 편집자 주관 태그는 금지. 세대·타입·지부·소속·정식 분류만 사용.

## 설계 결정

- **Skill 전환 이유**: API 직접 호출은 실행마다 토큰 비용 발생. Claude Code 구독 내에서 돌리면 사실상 무료.
  트레이드오프는 재현성 — Skill은 실행마다 Claude가 재해석하므로 결과가 약간씩 달라질 수 있음.
- **테이블 분리 안 함**: 사용자 구분 없이 동일 테이블. AI 흔적은 내부 메타(추후 sidecar 테이블)에만.
- **계정 불필요**: 익명 덱 작성 기능이 일회성 핸들/비번으로 동작하므로 봇 계정 관리 제거.
- **사람 검수 게이트 2개**: 주제 단계, 덱 단계 각각. 초기 단계라 자동화보다 품질 우선.
- **산출물은 JSON 파일**: 스테이지 테이블(과투자) 대신 가볍게. `.gitignore`에 포함(로컬 보관).
- **주제 중복 회피**: 실행 시 최근 4주 `topics/*.json`에서 `rejected`가 아닌 주제를 읽어 avoid 리스트로.

## 카테고리 로테이션

10개 카테고리 — 모두 **견고한 팬덤이 있는 IP/프랜차이즈** 중심 (바이럴/트렌드 추종 X):
`kpop`, `vtuber`, `anime-manga`, `videogames`, `film-tv`, `sports`, `character-brands`,
`literature`, `tabletop-rpg`, `mythology-history`. `--category` 미지정 시 runId 해시로 자동 선택.

방향성:
- 한 달 뒤 죽을 수 있는 신규 트렌드가 아니라, 1년 후에도 같은 팬이 같은 캐릭터를 검색할
  canonical IP만 선정 (견고한 팬덤 신호: 위키·팬덤 사이트·정기 이벤트·다년 활동·머천다이징).
- **타겟 사용자 10~20대 디지털 네이티브**. 중장년층 위주 IP는 회피 (1·2세대 K-pop 단독, 8090
  시트콤, 고전 문학·추리, 정사 역사 등). TikTok/BookTok/Discord/위버스·디시 같은 젊은층
  플랫폼 활성도를 판단 기준으로 사용.

## 단어 검증

`lib/wordConstraints.ts`의 `processWords`를 그대로 재사용 (a-z 전용, 중복 제거). 단어 개수
제한은 없고, Skill이 검증 실패 시 단어만 drop하여 trace에 기록. 태그는 lowercase·hyphenated로
정규화 후 중복 제거.

## 업로드 단계 (미구현)

연결되어야 할 두 가지:
1. **익명 덱 작성 기능**: 이미 PR #4에서 머지됨 (`decks.creator_id` nullable, `author_handle`/`author_password_hash`).
2. **단어 태그 DB 스키마**: 현재 `decks.words text[]` → `jsonb` 전환. 또는 `deck_words` 별도 테이블 신설.

둘 다 반영된 뒤 `scripts/ai/upload-decks.ts`가 `approved` 덱을 일괄 POST.

## 향후 확장 (파이프라인 밖 기능)

- 게임 플레이 페이지: 덱 선택 후 **태그 선택기** — 플레이어가 원하는 범위만 필터링
- 꼬들(한글)·히라가나 모드: 단어 검증 로직 + 키보드 컴포넌트 분리. `DeckLanguageSchema`가 `en`/`ko`/`ja` 지원
- AI 덱만 추적하는 sidecar 테이블(`deck_ai_metadata`) — 통계/롤백용
