# 0015. DailyWord에 active_word_ids 스냅샷 + 라운드는 date만 캡처

## Status

Accepted (revised after PR #54 리뷰 — snapshot 모델로 단순화)

## Context

Daily mode은 client-local date 기준 갱신. 이로 인한 라이프사이클 모호성:

- 자정 가로지르는 라운드: 23:55 시작, 00:05 추측 — 어느 날의 라운드?
- 덱 편집 중 진행 중인 라운드: 제작자가 word 비활성화 → 진행 중 라운드의 단어/시드 흔들림
- 챌린지 게이트: 자정 넘으면 "오늘 데일리 완료" 조건이 깨질 수 있음
- 챌린지 시퀀스 결정성: 같은 (deck, date)의 모든 사용자가 같은 셔플을 봐야 함

후보:
- (a) per-round `deck_version` 캡처 + per-word version history → version-aware query 복잡, lock 충돌 케이스 발생
- (b) **DailyWord에 `active_word_ids` snapshot 저장** (본 결정) — Word는 simple `active: bool` ([ADR 0010](./0010-word-soft-delete-with-permanent-ids.md))
- (c) 매 액션 시 현재 active 평가 → 셔플 결정성 깨짐, 라운드 중 편집 시 검증 흔들림

## Decision

### DailyWord에 snapshot 저장

```
daily_words:
  deck_id, date, word_id, active_word_ids bigint[], locked_at
  PK: (deck_id, date)
```

- `active_word_ids`: lock 생성 시점의 active word ID 배열
- 시드: `hash(deck + date) % active_word_ids.length` — lock 생성 시 1회 계산해 word_id 결정

### 라운드/런은 date만 캡처

- `DailyRound`: `(anon_id, deck_id, date)` PK + 진행 상태. **deck_version 캡처 X**
- `ChallengeRun`: 동일 PK 패턴
- 검증·셔플은 `DailyWord.active_word_ids`에서 직접 조회

### 첫 풀이자 lock 생성 룰

```
DailyRound 시작 시:
  DailyWord(deck, date) 존재? 
    YES → 그대로 사용
    NO  → SELECT id FROM words 
            WHERE deck_id=X AND active=true 
            ORDER BY id ASC                       -- 결정적 정렬 필수
          INSERT DailyWord(deck, date, word_id=seed_pick, 
                           active_word_ids=[정렬된 id 배열], locked_at=now())
          ON CONFLICT DO NOTHING (race-safe)
```

**핵심**:
- 같은 (deck, date)의 모든 사용자는 동일 lock(같은 word + 같은 active set + 같은 셔플) 사용
- `active_word_ids`는 **`Word.id ASC` 정렬 강제** — 정렬 안 하면 query plan/race에 따라 다른 배열 → 시드/셔플 비결정적
- re-add via toggle 시 Word.id 영구이므로 정렬 안정 ([ADR 0010](./0010-word-soft-delete-with-permanent-ids.md))

### active_word_ids 무결성

`bigint[]` 원소는 Postgres FK가 자동 검증하지 않음 (배열 타입의 한계):
- 같은 deck 소속 검증, word 존재성 검증, dangling reference 모두 DB 보장 X
- soft-delete 모델이라 일반 편집 흐름에선 dangling 거의 발생 X
- 단, 수동 DB 조작 / 잘못된 migration 시 무결성 깨질 수 있음

**생성 규칙 (server action only)**:
1. `active_word_ids`는 **client 입력 금지** — 서버가 `words` 테이블에서 직접 조회
2. `SELECT id FROM words WHERE deck_id = $1 AND active = true ORDER BY id ASC` 결과만 저장
3. `word_id`는 `active_word_ids`의 원소 중에서 시드로 선택
4. 배열 원소는 모두 같은 `deck_id`의 active Word.id여야 함

**정규화 대안 (채택 안 함)**:
- `daily_word_pool(deck_id, date, word_id, position)` 같은 join table로 word_id에 FK 걸 수도 있음
- 장점: DB 강제 무결성. 단점: lock 1개당 N개 row insert, join 비용, 셔플/검증 로직 복잡
- MVP 과잉 — 단순 bigint[] snapshot + server action 검증으로 충분

### 편집 propagation

편집 시점에 존재하는 lock은 변경 없음. 미존재 미래 date의 lock은 첫 풀이자 시점에 새 active set으로 생성:

```
오늘 lock 미존재 → 편집 즉시 반영 (다음 풀이자가 새 set으로 lock)
오늘 lock 존재 → 오늘은 변경 X. 내일 lock 미존재 시 내일부터 반영
시차로 미래(내일) lock 미리 존재 → 그 lock 유지, 모레부터 반영
```

자연스럽게 lock 생성 시점 freeze.

### 챌린지 셔플

```
ChallengeRun 시작 시:
  DailyWord.active_word_ids 가져옴 (DailyRound 게이트 통과했으므로 존재)
  shuffle = deterministic_shuffle(active_word_ids, hash(deck + date + "endurance"))
  ChallengeRun.shuffle_order bigint[] = shuffle (저장 — 매번 재계산 X)
```

같은 (deck, date) 모든 사용자 동일 셔플 보장 (입력 + 시드가 같으니 결정적).

**셔플 저장 근거**: 알고리즘 변경 시 기존 run의 시퀀스 안정성, in_progress run 무기한 보존 정책상 재로드 시 일관성, 디버깅 시 "이 run이 본 시퀀스" 추적 가능.

### Date trust boundary

`client_local_date`는 **보안 경계가 아님**. 클라이언트가 임의 date를 보낼 수 있음.

- 챌린지 1일 1회·랭킹 우회 인센티브 없음 ([ADR 0003](./0003-no-public-user-leaderboard.md) 사용자 점수 랭킹 없음)
- 제품 의사결정으로 ritual scaffolding이라 허용 가능한 abuse — 별도 강화 안 함

### Future lock 영향 범위 (freeze 공격 분석)

리뷰어 우려: attacker가 임의 future date에 lock 생성 → 작성자 편집이 그 date에 반영 안 됨 ("freeze 공격").

snapshot 모델의 영향 범위:

- future date에 lock 생성되면 **그 date 1건만** stale snapshot. 다른 date는 정상 진행
- 작성자 편집은 lock 미존재 미래 date부터 자연 반영 — 글로벌 freeze 발생 X
- DB row 누적: attacker가 모든 future date를 채우려면 매 date마다 별도 요청 필요. 현실적 cost 큼
- 디스커버리(메인 피드)는 lock과 무관 — Hot/좋아요순/최신순 모두 deck 메타 기반
- **rate limit/window 가드 도입 X** (MVP 인센티브 < 운영 비용)

작성자 보호 시나리오: 의도적으로 미리 lock된 date 발견 시 운영자 권한으로 row 삭제 → 자연 재-lock 유도. 일반 사용자는 이런 abuse 거의 안 함 (인센티브 약함).

## Consequences

### 데이터 모델
- `daily_words`에 `active_word_ids bigint[]` 컬럼 (덱당 50-500 ints, 무시 가능)
- `Word`는 `active: bool`만 ([ADR 0010](./0010-word-soft-delete-with-permanent-ids.md))
- `DailyRound`, `ChallengeRun`은 `deck_version` 컬럼 X
- `Deck`은 `version` 컬럼 X (per-row optimistic locking은 [ADR 0009](./0009-optimistic-locking-with-version.md)로 별도)

### UX
- 자정 넘김 라운드 자연 작동
- 사용자 간 같은 데일리 word + 같은 챌린지 시퀀스 보장
- 덱 편집과 진행 중 라운드 완전 분리 (snapshot이 격리)

### 운영
- DailyWord race: `INSERT ... ON CONFLICT DO NOTHING` + 기존 row 재읽기
- 클라이언트 date 조작 가능성 인지 — abuse 인센티브 약하므로 허용
- snapshot 저장 비용은 lock당 1회, 무시 가능
