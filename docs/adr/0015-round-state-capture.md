# 0015. Round 시작 시 (date, deck_version) 캡처

## Status

Accepted

## Context

Daily mode은 client-local date 기준 갱신 (Q5 결정). 이로 인한 라이프사이클 모호성:

- 자정 가로지르는 라운드: 23:55 시작, 00:05 추측 — 어느 날의 라운드?
- 덱 편집 중 진행 중인 라운드: 제작자가 word 비활성화 → 진행 중 라운드의 단어/시드 흔들림
- 챌린지 게이트: 자정 넘으면 "오늘 데일리 완료" 조건이 깨질 수 있음

라운드/런이 시작 후 의미를 유지하지 못하면 사용자 경험 끊김.

후보:
- (a) 매 액션 시 현재 date·active 집합 평가 → 자정/편집 시 라운드 깨짐. 거절
- (b) **시작 시점 (date, deck_version) 캡처, 이후 고정** (본 결정)
- (c) 시작 시점 capture + 24h TTL → 추가 cron 비용 vs 효용 적음

## Decision

DailyRound·ChallengeRun 시작 시점에 두 값을 capture:

- `date`: 사용자 client local date (YYYY-MM-DD)
- `deck_version`: 시작 시점의 `deck.version` (정수)

이후 모든 검증·시드는 capture된 값 기준:

- 추측 검증: `deck_version` 시점의 active word 집합
- 데일리 시드: `hash(deck + date) % len(active_at_version)`
- 챌린지 시드: `hash(deck + date + "endurance")` 결정적 셔플
- 챌린지 게이트: 시작 시 한 번만 평가, 진행 중 재평가 X

자정 넘어도 같은 라운드 계속. 진행 중 덱 편집 발생해도 라운드는 고정.

## Consequences

### 데이터 모델
- `DailyRound`, `ChallengeRun`에 `deck_version: int` 컬럼
- `Deck`에 `version: int` (word 추가/비활성화마다 +1)
- `Word`에 `added_at_version`, `removed_at_version` (nullable)
- 단어 활성 판정: `added_at_version <= V AND (removed_at_version IS NULL OR removed_at_version > V)`

### UX
- 자정 넘김 라운드 자연 작동 — 게임 끊기지 않음
- 사용자 별 in_progress 라운드 row 누적 가능 (1/일/덱) — 미미. 정리 cron 불필요
- 새 날짜 라운드는 별개 row로 동시 진행. UI "이어풀기" 옵션으로 노출
- 덱 편집과 진행 중 라운드 완전 분리 → 제작자 자유 편집 가능
- 외부 결과 공유 텍스트의 날짜 = 캡처된 date (자정 넘어 끝나도 시작 날 표시)

### 운영
- `deck.version` race: 동시 편집 시 [0009](./0009-optimistic-locking-with-version.md) 낙관적 락이 막음
- DailyWord lock도 캡처된 version의 active 집합으로 시드 → 글로벌 단일 word 유지 (모두 같은 deck.version 시점에서 시드 계산하므로 결정적)
