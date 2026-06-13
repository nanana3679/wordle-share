# 0002. 좋아요는 IP 해시 단독 식별

## Status

Accepted

## Context

좋아요는 메인 피드 정렬·디스커버리의 핵심 시그널이다. 식별 모델 후보:

- (a) `auth.uid()` (Supabase 익명 세션) — 시크릿 모드/세션 클리어로 무한 가능
- (b) nick+pw 확인 — 디스커버리 시그널인데 입력 마찰 과도
- (c) IP 해시 단독 — 한 IP = 한 덱당 1좋아요

좋아요와 사용자 점수 랭킹은 **위협 모델이 다르다** ([0004](./0004-content-likes-vs-user-scores-threat-model.md) 참고): 좋아요 spam은 1인이 N개 콘텐츠에 영향 미치려면 N배 액션이 필요해서 진짜 사용자 합산 대비 노이즈가 작다.

## Decision

- 좋아요 PK = `(deck_id, ip_hash)`. **IP당 한 덱에 1좋아요** 강제
- `ip_hash`는 요청 IP + 고정 salt를 SHA-256으로 해시 (개인정보 최소화)
- **풀이 무관, 누구나 가능** — 메인 피드/검색에서 둘러보다 누를 수 있음 (댓글 게이트와는 별개)
- 취소(unlike) 가능. 취소 후 재추천도 가능
- `Deck.like_count`는 캐시 컬럼, 트리거로 동기화

## Consequences

- NAT/CGN으로 인한 false-negative ("이미 추천한 IP입니다") 발생 — 한국 사용자에게 친숙한 패턴이라 UX 부담 작음
- 자동화 spam은 VPN 사이클로 가능하지만 진짜 좋아요 합산 대비 노이즈 작음 (집단 시그널의 robustness)
- IP hash salt 회전 시 기존 좋아요 무효화 → **salt는 영구 고정**. 환경변수로 관리하되 변경 금지 운영 룰
- `Like.user_id` 컬럼 폐기 — Supabase auth와 분리
- 댓글 좋아요는 V2 (이모지 리액션과 함께 검토)
- 낙관적 업데이트 UX: 클라이언트 즉시 반영 + 서버 confirm async, 409(이미 추천) 시 롤백 + 토스트
