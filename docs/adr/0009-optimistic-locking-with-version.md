# 0009. 모든 액션에 expected_version 동봉

## Status

Accepted

## Context

플레이어가 같은 게임을 여러 탭/디바이스에서 열거나, 빠르게 액션을 연발하면 stale state로 인한 race가 발생한다:

- 탭 A에서 시도 → 탭 B에서 다음 시도 (탭 A는 stale 상태)
- 데일리 풀이 진행 중 자정 지나서 시도 (날짜가 바뀜)
- 챌린지 게이트 체크와 시작 사이의 race

WebSocket 실시간 sync 도입은 V2로 미루더라도, MVP에서 데이터 정합성은 보장되어야 한다.

## Decision

- 서버가 단일 진리원천(SSoT)
- `Solve`, `ChallengeRun` 등 상태성 레코드는 `version: int` 컬럼 보유, 액션마다 +1
- 모든 추측/액션 요청에 클라이언트가 `expected_version` 동봉
- 서버 검증 순서:
  1. 레코드 status 확인 (`in_progress`인지)
  2. `version === expected_version` 확인
  3. 불일치 시 `409 Conflict` + 현재 상태 반환
- 클라이언트: 409 받으면 토스트 "다른 탭에서 진행됨" + UI 강제 갱신

## Consequences

- 멀티 탭/탭 동시성 race 방지. 데이터 무결성 보장
- 서버 액션이 약간 verbose해짐 — server actions에 헬퍼 함수 (`lib/optimistic.ts`)로 통일
- WebSocket 실시간 sync는 V2 — MVP는 액션 시점 검증으로 충분
- 좋아요는 별도 모델 — `(deck_id, ip_hash)` 유니크 제약이 자체 락 역할 ([0002](./0002-ip-hash-for-likes.md))
- 클라이언트 상태 스토어(React Query 등)에 version 캐시 필요
- 통합 테스트에서 동시성 시나리오 커버 (탭 A/B 동시 시도 → 한쪽만 성공)
