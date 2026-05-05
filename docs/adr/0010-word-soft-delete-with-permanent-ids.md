# 0010. 단어 영구 ID + soft-delete

## Status

Accepted

## Context

덱 편집은 자유롭게 허용한다 — IP 확장(새 시즌·캐릭터)을 흡수해야 함. 하지만 다음 문제가 있다:

- 데일리 잠금 레코드가 특정 단어를 가리키고 있음 — 그 단어를 hard delete하면 과거 풀이 기록이 깨짐
- 추측 검증을 단어 ID 스냅샷 기준으로 수행 ([0008](./0008-no-guess-autocomplete.md)) — ID가 사라지면 검증 깨짐
- 같은 단어를 추가/삭제 반복 시 ID가 바뀌면 통계/기록 신뢰성 저하

## Decision

- 단어는 별도 `words` 테이블 (덱 row의 JSONB 컬럼이 아님)
- 각 단어는 **영구 ID** (시퀀스 또는 nanoid). 한 번 발급되면 변경 불가
- 삭제는 **soft-delete** (`active: false`) — row 자체는 유지
- 활성 단어 집합 = `words.filter(deck_id = X AND active = true)`
- 데일리 시드 계산은 활성 단어만 대상
- 데일리는 잠긴 그날 단어 유지 — 제작자가 그 단어를 비활성화해도 그날 데일리는 영향 없음
- 챌린지는 다음 런부터 새 활성 집합 반영

## Consequences

- 과거 풀이 기록·댓글·통계 무결성 보장
- DB 크기는 미세하게 늘어나지만 (soft-deleted row 잔존) 무시 가능
- 단어 정규화 (trim, 중복 제거) 시 같은 텍스트가 다른 ID로 이미 있으면 reactivate 옵션 — UX 결정 필요 (V2)
- 덱 hard delete 시 cascade 정책은 별도 결정 (보류) — 기본은 cascade로 단어/풀이/댓글 모두 삭제
- 단어 텍스트 수정은 정책 미정 — 일단 "수정 = 비활성화 + 신규 추가" 패턴 권장 (ID 의미 보존)
