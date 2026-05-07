# 운영자 시드 도구

콜드 스타트 시점 long-tail IP 덱 자동 생성. **공개 API 아님** — 운영자(본인) 내부 도구.

## 동작 방식

- 운영자가 로컬에서 LLM 호출 + 스크립트 실행으로 IP 검색 → 단어 추출 → 덱 생성
- **일반 사용자 API를 그대로 호출** (`POST /api/decks`) — 도그푸딩
- 인증: `bot_*` nick + 운영자 보관 pw (예: `bot_pokemon_kr`, `bot_onepiece_kr`)
- 시즌/스토리 업데이트는 **같은 nick+pw로 `PUT /api/decks/{id}`** 지속 호출

관련 ADR: [0011](../adr/0011-operator-seed-via-public-api.md)

## 위치

```
scripts/ai/
├── propose-topics.ts      LLM으로 IP 후보 생성 (longtail 친화)
└── generate-decks.ts      승인된 IP에서 단어 추출 + API 호출
```

기존 `propose-topics`, `generate-decks` 스킬을 코드화. Skill 호출 → 스크립트로 흡수.

## 시즌/스토리 업데이트 흐름

```
1. 운영자가 새 챕터/세대 정보 인지 (예: 원피스 새 캐릭터)
2. propose-topics 또는 수동 prompt → 추가/제거할 단어 식별
3. generate-decks PUT 호출 → API에 단어 목록 전송
4. API 측에서 diff 계산:
   - 신규 단어 → Word insert (active=true, added_at_version = new_version)
   - 사라진 단어 → 기존 Word soft-delete (removed_at_version)
   - 동일 단어 → 변경 없음 (멱등성)
5. Deck.version 자동 increment
```

- 멱등성: 같은 단어 목록을 두 번 PUT해도 동일 결과
- 진행 중인 라운드는 영향 없음 — Round의 `deck_version` 캡처가 보호 ([0015](../adr/0015-round-state-capture.md))

## 인증 / 권한 분리

- bot 자격증명은 일반 사용자 자격증명과 같은 메커니즘 (nick+pw bcrypt)
- 별도 어드민 엔드포인트 없음 — 일반 API에 권한 차이 없음
- bot nick은 충돌 방지를 위해 운영자 reserved 명단으로 관리 (예: prefix `bot_`)
- 일반 사용자가 `bot_pokemon_kr`로 가입 시도 시 reject (어드민 reserved list 검사)

## 사용자 관점

- **사람 덱과 봇 덱 UX 동일** — 식별 표시 없음, 일반 nick 표시 (`bot_pokemon_kr#a3f9` 형식)
- 신뢰는 콘텐츠 품질로
- 좋아요 / 신고 / 댓글 모두 일반 덱과 동일 흐름
- 봇 덱이 자연 상위 노출 — 큐레이션 슬롯 없음

## Rate Limit

- 일반 사용자 rate limit이 봇에 그대로 적용
- 운영하다 봇 nick 일일 한도 초과 시 화이트리스트 추가 (별도 admin DB column or env list)
- MVP에선 일반 한도로 충분 — 시드 작업은 batch보다 weekly cadence

## 보안

- bot 자격증명 유출 시 임의 덱 위변조 가능 → **운영자 비밀번호 관리 책임**
- pw는 `.env` / 1Password 등 안전 저장
- 시드 스크립트는 환경변수로 pw 주입, 코드에 hardcode X
- API 응답 토큰은 클라이언트 캐시 X — 매 호출마다 nick+pw로 재인증 (또는 단기 토큰 발급)

## 외부 개발자 onboarding 없음

- API 키 발급 X
- 공개 문서 X
- Rate limit이 일반 사용자 수준
- 봇 식별 표시도 없음 — 외부에서 "이건 운영자 봇 덱"이라고 식별 불가
- V2: 봇 식별 라벨 도입 검토 (현재는 콘텐츠 품질로 신뢰)
