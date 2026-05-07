# 0010. 단어 영구 ID + soft-delete + active-only partial unique

## Status

Accepted (revised after PR #54 리뷰 — re-add 정책 확정)

## Context

덱 편집은 자유롭게 허용한다 — IP 확장(새 시즌·캐릭터)을 흡수해야 함. 하지만 다음 문제가 있다:

- 데일리 잠금 레코드가 특정 단어를 가리키고 있음 — 그 단어를 hard delete하면 과거 풀이 기록이 깨짐
- 추측 검증을 단어 ID 스냅샷 기준으로 수행 ([0008](./0008-no-guess-autocomplete.md)) — ID가 사라지면 검증 깨짐
- 같은 단어를 추가/삭제 반복 시 ID가 바뀌면 통계/기록 신뢰성 저하
- "비활성화한 word를 같은 text로 다시 추가"가 가능해야 UX 자연스러움 (오타 수정 등)

## Decision

### 영구 ID + soft-delete

- 단어는 별도 `words` 테이블 (덱 row의 JSONB 컬럼이 아님)
- 각 단어는 **영구 ID** (시퀀스 또는 nanoid). 한 번 발급되면 변경 불가
- 삭제는 **soft-delete** (`removed_at_version` 설정) — row 자체는 유지
- `added_at_version`, `removed_at_version` 컬럼으로 active interval 추적
- 단어 활성 판정 (version V 기준): `added_at_version <= V AND (removed_at_version IS NULL OR removed_at_version > V)`

### Active-only partial unique

`words(deck_id, text)`에 **partial unique 인덱스**:

```sql
UNIQUE(deck_id, text) WHERE removed_at_version IS NULL
```

- 활성 word 중에서만 text 유일 강제
- 비활성 word는 같은 text로 여러 row 가능 (과거 history 보존)

### Re-add 정책

비활성화한 word를 같은 text로 다시 추가 시 → **새 ID로 새 row insert**.

```
Word A: id=1, text="x", added=1, removed=3   # 비활성
사용자가 "x" 다시 추가 (deck.version 5에서) →
Word B: id=2, text="x", added=5, removed=NULL  # 신규
```

- 두 row가 같은 text를 가질 수 있음 (단, active는 한 번에 하나)
- 각 word는 최대 한 번의 active interval만 가짐 (간단성)
- "수정 = 비활성화 + 신규 추가" 패턴이 자연스럽게 작동
- ID는 절대 재사용 X — DailyWord lock이 가리키는 옛 word_id는 영원히 안전

### 단어 텍스트 수정

지원 안 함. 텍스트 변경하려면 비활성화 + 신규 추가 (위 룰).

## Consequences

- 과거 풀이 기록·댓글·통계 무결성 보장 — DailyWord lock의 word_id가 비활성 word를 가리켜도 row 살아있음
- DB 크기는 미세하게 늘어남 (soft-deleted row + 같은 text의 신·구 row 잔존) — 무시 가능
- 활성 단어 조회 query: `WHERE deck_id = ? AND removed_at_version IS NULL` (인덱스 활용)
- Version-aware 조회: `WHERE added_at_version <= V AND (removed_at_version IS NULL OR removed_at_version > V)`
- Re-add는 **새 ID** — 통계/기록은 word ID 단위라 reactivate 패턴은 의도적으로 안 씀 (history 명확성)
- 덱 hard delete 시 cascade 정책: ON DELETE CASCADE (단어/풀이/댓글/좋아요 모두 삭제) — 기본 채택
- 동일 text의 active 중복은 partial unique로 차단됨
