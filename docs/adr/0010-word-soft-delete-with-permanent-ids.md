# 0010. 단어 영구 ID + soft-delete + reactivate via toggle

## Status

Accepted (revised after PR #54 리뷰 — snapshot 모델 도입으로 단순화)

## Context

덱 편집은 자유롭게 허용한다 — IP 확장(새 시즌·캐릭터)을 흡수해야 함. 하지만 다음 문제가 있다:

- DailyWord lock의 word_id가 가리키는 row가 사라지면 과거 데이터 깨짐
- 추측 검증을 라운드 lock 시점 active 집합 기준으로 수행 ([0008](./0008-no-guess-autocomplete.md), [0015](./0015-round-state-capture.md))
- 같은 단어를 추가/삭제 반복 시 ID가 바뀌면 통계/기록 신뢰성 저하
- 비활성화한 word를 같은 text로 다시 추가 (오타 수정 등) UX 자연스러움 필요

후보:
- (a) per-word version history (`added_at_version`/`removed_at_version`) — 정확한 version-aware query 가능, 복잡
- (b) interval table — 가장 정확, 매우 복잡
- (c) **simple `active: bool` + DailyWord에 active set snapshot** ([0015](./0015-round-state-capture.md)) (본 결정)

## Decision

### Word 모델 단순화

```
words:
  id, deck_id, text, active: bool, created_at
  UNIQUE(deck_id, text)  -- 전체 유니크
```

- 영구 ID — 한 번 발급 후 재사용·재할당 X
- `active: bool` — true(활성) / false(soft-delete)
- 같은 deck 내 동일 text는 단일 row 영구 보유 (active 여부와 무관)

### Re-add via reactivate

비활성화한 word를 같은 text로 다시 추가하면 **기존 row의 `active`를 `true`로 toggle**:

```
초기:        Word#1 (text="피카츄", active=true)
비활성화:     Word#1 (text="피카츄", active=false)
재추가 시도:  Word#1 (text="피카츄", active=true)  -- 같은 row, 같은 ID
```

- ID 영구 — DailyWord lock의 word_id는 영원히 유효
- 통계도 word ID 단위라 history 일관

### 단어 텍스트 수정

지원 안 함. 텍스트 변경하려면 비활성화 + 다른 text로 신규 추가.

### Invariant: count(active) >= 1

- 덱 생성·편집·시드 스크립트 모두 **active word 최소 1개** 강제
- 마지막 active 단어 비활성화 시도는 server action에서 reject
- 이유: `DailyWord` lock 시 `hash(deck + date) % active_word_ids.length`에서 `length = 0` 회피 (modulo by zero)
- DB CHECK 제약 X (트리거 복잡) — server action 레벨 enforce

### Lock 보호 (snapshot)

DailyWord lock이 `active_word_ids` 스냅샷을 보유 ([ADR 0015](./0015-round-state-capture.md)). 따라서:
- lock 후 word.active toggle돼도 lock의 active set은 변하지 않음
- 진행 중 라운드/런은 lock 시점 set로 검증 — 일관성 보장

## Consequences

- 데이터 모델 단순 — Word는 `active: bool` 한 컬럼. version history 추적 X
- DailyWord lock의 `active_word_ids` snapshot이 lock-time 정합성 책임 (storage 비용 감수)
- Re-add 자연스러움 — 사용자 mental model "같은 text = 같은 entity" 보존
- DB 크기: 비활성 word도 영구 잔존 — text 영원히 unique이므로 행 수 폭증 없음
- 덱 hard delete 시 cascade: ON DELETE CASCADE (단어/풀이/댓글/좋아요 모두 삭제)
- 활성 단어 조회 query: `WHERE deck_id = ? AND active = true`
- 편집 중 라운드 진행 영향 없음 — DailyWord.active_word_ids snapshot이 격리
