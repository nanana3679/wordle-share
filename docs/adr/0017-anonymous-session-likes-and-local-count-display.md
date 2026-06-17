# 0017. 익명 세션 좋아요와 로컬 count 표시

## Status

Accepted

## Context

좋아요는 덱 디스커버리의 시그널이지만, 사용자가 체감하는 핵심 UX는 두 가지다.

- 내가 이 덱에 좋아요를 눌렀는지
- 버튼을 눌렀을 때 즉시 반응하는지

기존 [0002](./0002-ip-hash-for-likes.md)는 IP hash를 좋아요 식별 기준으로 삼았다. 그러나 같은 IP를 공유하는 사용자가 서로의 좋아요 상태에 영향을 줄 수 있고, 로그인 없는 환경에서도 Supabase anonymous session이 있으므로 `likedByMe`와 toggle idempotency는 세션 기준이 더 적합하다.

또한 `like_count`를 mutation마다 서버 최신값으로 전역 cache에 동기화하려 하면 overlapping mutation, stale query, rollback snapshot 문제가 커진다. 이 제품에서는 전체 좋아요 수의 실시간 정합성보다 개인 토글 반응성이 더 중요하다.

## Decision

- 좋아요 식별과 idempotency는 `likes.anon_id` 기준으로 처리한다.
- `ip_hash`는 abuse/rate-limit/운영 분석 보조 신호로만 유지한다.
- `likedByMe`는 익명 세션 기준으로 정확하게 표시한다.
- `like_count`는 페이지 로드 시점 값 `n`을 기준으로 표시한다.
- 이후 내 좋아요/취소는 `n + localDelta`로만 표현한다.
  - 처음 안 누른 상태: `n -> n + 1 -> n`
  - 처음 누른 상태: `n -> n - 1 -> n`
- 좋아요/취소 클릭은 debounce해서 마지막 의도만 서버에 보낸다.
- 서버 응답의 `likeCount`로 모든 feed/search cache를 매번 덮어쓰지 않는다.
- 실패 시 내 로컬 토글 상태만 페이지 로드 기준으로 롤백한다.

## Consequences

- 목록의 `like_count`는 다른 사용자의 동시 좋아요를 즉시 반영하지 않을 수 있다.
- 페이지를 새로 로드하거나 feed를 다시 가져오면 서버의 최신 count를 다시 기준값으로 삼는다.
- 좋아요 UX는 단순해지고, cache rollback이 다른 덱이나 다른 query 상태를 덮어쓰는 위험이 줄어든다.
- 정렬은 다음 feed fetch 시점의 서버 count에 따라 갱신된다.
- `likedByMe`는 개인 상태이므로 전역 공개 feed cache에 섞어 저장하지 않는다.
- 댓글 리액션이나 실시간 집계가 필요해지면 별도 ADR로 다룬다.
