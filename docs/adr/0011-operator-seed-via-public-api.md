# 0011. 운영자 시드 덱은 일반 API 호출 + 지속 업데이트

## Status

Accepted

## Context

콜드 스타트 단계에서 long-tail IP 덱을 운영자(본인)가 시드해야 한다. 시즌/스토리 업데이트(원피스 새 챕터·포켓몬 새 세대)도 운영자가 따라가야 한다. 시드 경로 후보:

- (a) **일반 사용자 API** (`POST /api/decks`, `PUT /api/decks/{id}`) 호출. 인증은 운영자 자격증명 (예: `bot_pokemon_kr` nick + 운영자 보관 pw)
- (b) 별도 **어드민 엔드포인트**로 직접 DB 쓰기. service_role 키로 RLS·rate limit 우회

(a)는 "운영자도 일반 사용자 API의 first user"라는 도그푸딩 효과. (b)는 rate limit 우회·확장성 면에서 단순.

운영자 시드는 **1회성이 아니라 지속 운영**이다 — 시즌 업데이트마다 같은 덱을 PUT으로 갱신.

## Decision

- 시드 도구는 **일반 사용자 API 호출** ((a) 채택)
- 인증: `bot_*` nick + 운영자 보관 pw (예: `bot_pokemon_kr`, `bot_onepiece_kr`)
- `scripts/ai/`에 자동화 스크립트 작성 (LLM으로 단어 추출 → API 호출)
- 시즌/스토리 업데이트 시 같은 nick+pw로 `PUT /api/decks/{id}` 호출. 단어 추가는 신규 row, 삭제는 soft-delete ([0010](./0010-word-soft-delete-with-permanent-ids.md))
- **사용자 관점에서 봇 덱과 사람 덱 구별 표시 없음** — 일반 덱처럼 nick만 표시
- 봇 덱도 메인 피드 동일 알고리즘 적용 (큐레이션 슬롯 없음, 품질이면 자연 상위)

## Consequences

- 도그푸딩 — 운영자도 일반 API의 first user. 일반 사용자 UX 결함이 빠르게 노출됨
- 일반 사용자 rate limit이 봇에 그대로 적용 — 봇 nick에 한해 일일 한도를 높이는 화이트리스트 필요할 수 있음 (운영하며 결정)
- 시즌 업데이트는 멱등성 보장 필요 — `PUT`이 idempotent하게 동작하도록 단어 비교 로직 (텍스트 매칭 → 신규는 추가, 사라진 건 deactivate)
- 외부 개발자 onboarding·API 키 발급·공개 문서는 모두 없음 (공개 API 아님)
- bot 자격증명 유출 시 임의 덱 위변조 가능 — 운영자 비밀번호 관리 책임
- V2: 봇 식별 표시 도입 검토 가능 (현재는 콘텐츠 품질로 신뢰)
