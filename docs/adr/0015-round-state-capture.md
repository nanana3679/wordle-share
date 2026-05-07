# 0015. Round 시작 시 (date, deck_version) 캡처 — DailyWord lock 우선

## Status

Accepted (revised after PR #54 리뷰 — DailyWord lock vs deck_version 충돌 해소)

## Context

Daily mode은 client-local date 기준 갱신 (Q5 결정). 이로 인한 라이프사이클 모호성:

- 자정 가로지르는 라운드: 23:55 시작, 00:05 추측 — 어느 날의 라운드?
- 덱 편집 중 진행 중인 라운드: 제작자가 word 비활성화 → 진행 중 라운드의 단어/시드 흔들림
- 챌린지 게이트: 자정 넘으면 "오늘 데일리 완료" 조건이 깨질 수 있음
- **DailyWord lock vs deck_version 충돌**: 첫 풀이자가 V1에서 word=W lock. 같은 날 제작자가 W 비활성화(V2). 두 번째 풀이자가 V2 캡처하면 W가 active 집합에 없어서 검증 깨짐

후보:
- (a) 매 액션 시 현재 date·active 집합 평가 → 자정/편집 시 라운드 깨짐. 거절
- (b) **시작 시점 (date, deck_version) 캡처, DailyWord lock 우선** (본 결정)
- (c) 시작 시점 capture + 24h TTL → 추가 cron 비용 vs 효용 적음

## Decision

### DailyWord에 lock된 deck_version 저장

`daily_words` 테이블에 lock 생성 시점의 `deck_version`을 명시 저장:

```
daily_words:
  deck_id, date, word_id, deck_version, locked_at
  PK: (deck_id, date)
```

### DailyRound 시작 시 캡처 룰

```
DailyRound 시작 시:
  IF DailyWord(deck, date) 존재:
    DailyRound.deck_version = DailyWord.deck_version  # lock 우선
  ELSE:
    deck_version = 현재 deck.version
    INSERT DailyWord(deck, date, word_id=seed_pick(deck, date, deck_version),
                     deck_version) ON CONFLICT DO NOTHING
    DailyRound.deck_version = DailyWord.deck_version  # lock의 version 사용
  
  DailyRound.date = client_local_date_at_start
```

**핵심**: 같은 (deck, date)의 모든 사용자는 같은 `deck_version`을 캡처 — DailyWord.deck_version 단일 source. word_id와 active set 모두 그 시점 기준.

### ChallengeRun도 같은 lock 사용

챌린지 시퀀스도 모든 사용자에게 동일해야 함 (기획서 "모든 유저 동일 셔플").

```
ChallengeRun 시작 시:
  IF DailyWord(deck, date) 존재:
    ChallengeRun.deck_version = DailyWord.deck_version
  ELSE:
    # 챌린지 단독으로 시작하는 케이스 — 데일리 게이트 위반
    # 게이트 검증에서 이미 reject됨
    error
  
  ChallengeRun.date = client_local_date_at_start
```

→ 챌린지 게이트가 데일리 완료를 요구하므로 항상 DailyWord.deck_version 존재.

### 검증·시드 룰

이후 모든 검증·시드는 capture된 `deck_version` 기준:

- 추측 검증: `deck_version` 시점의 active word 집합
- 데일리 시드: `hash(deck + date) % len(active_at_version)` (lock 시점 한 번만 계산)
- 챌린지 시드: `hash(deck + date + "endurance")` 셔플, active set는 `deck_version`
- 챌린지 게이트: 시작 시 한 번만 평가, 진행 중 재평가 X

자정 넘어도 같은 라운드 계속. 진행 중 덱 편집 발생해도 라운드는 고정.

### Date trust boundary

`client_local_date`는 **보안 경계가 아님**. 클라이언트가 임의 date를 보낼 수 있고 그 결과 미래/과거 DailyRound·Comment 생성 가능.

- 챌린지 1일 1회·랭킹 우회 인센티브 없음 (ADR 0003 사용자 점수 랭킹 없음)
- 제품 의사결정으로 ritual scaffolding이라 허용 가능한 abuse

서버는 클라이언트가 보낸 IANA timezone을 받아 request 시각 + tz로 local date 계산 권장 (V2 강화 가능). MVP는 client-supplied date string을 그대로 신뢰.

## Consequences

### 데이터 모델
- `daily_words`에 `deck_version: int` 컬럼 추가
- `DailyRound`, `ChallengeRun`에 `deck_version: int` 캡처
- `Deck`에 `version: int` (word 추가/비활성화마다 +1)
- `Word`에 `added_at_version`, `removed_at_version` (nullable, 활성 interval 추적은 [ADR 0010](./0010-word-soft-delete-with-permanent-ids.md))

### UX
- 자정 넘김 라운드 자연 작동
- 사용자 간 같은 데일리 word + 같은 챌린지 시퀀스 보장
- 덱 편집과 진행 중 라운드 완전 분리

### 운영
- `deck.version` race: [ADR 0009](./0009-optimistic-locking-with-version.md) 낙관적 락
- DailyWord race: `INSERT ... ON CONFLICT DO NOTHING` + 기존 row 재읽기
- 클라이언트 date 조작 시 abuse 가능성 인지 — V2에서 IANA timezone 검증 강화 가능
