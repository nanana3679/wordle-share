# 0001. Supabase Anonymous Auth + 단일 nick/pw 자격증명

## Status

Accepted

## Context

회원가입 없는 익명 모델을 유지하면서, 다음 두 신원이 모두 필요하다:

- **디바이스 식별 (anon_id)**: 데일리 풀이 진행 상태 추적, 댓글 게이트 판정, 챌린지 1일 1회 제한, 본인 통계
- **자원 단위 인증**: 덱 수정/삭제, 댓글 작성/삭제 시 본인 확인

기존 코드가 이미 Supabase Anonymous Auth로 디바이스 세션을 발급하고 있고, 자체 디바이스 UUID를 localStorage에 굴리는 방식보다:

- 쿠키 기반 세션 관리 검증됨 (시크릿 모드/캐시 클리어 시 새 세션은 동일 거동)
- 향후 OAuth 업그레이드 경로 보존 (anonymous → email/social 시 데이터 이행 가능)
- RLS 정책에서 `auth.uid()` 그대로 활용

자원 단위 인증은 별도 메커니즘이 필요한데, 기존엔 **덱별 nick/pw**였다. 신규 모델은 댓글까지 nick/pw가 필요하므로, 덱마다 다른 nick/pw를 받으면 마찰이 크다.

## Decision

- **anon_id = `auth.uid()`** (Supabase Anonymous Auth로 발급되는 UUID). 첫 방문 시 미들웨어가 자동 발급
- **단일 (nick, pw)**: 한 디바이스 = 하나의 (nick, pw) 쌍. localStorage에 캐시 후 자동 채움. 첫 쓰기 액션 시 명시 입력
- nick은 표시용, pw는 bcrypt 해시로 저장
- 덱·댓글 모두 같은 자격증명으로 작성/수정/삭제
- enumeration 방어: nick+pw로 "이 사람의 덱 모두 보여줘" 검색 기능 없음

## Consequences

- 디바이스 변경/시크릿 모드/캐시 삭제 시 anon_id가 새로 발급됨 → "내 덱" 목록은 localStorage 의존이라 손실. 단 nick+pw를 알면 어떤 디바이스에서도 수정 가능
- nick은 전역 유일이 아님 (충돌 가능). 같은 nick을 다른 사람이 써도 문제 없음 — pw가 자원별 잠금
- 약한 pw 사용자가 다른 사람 덱 접근하는 보안 사고를 enumeration 차단으로 완화
- `decks.author_xor` 제약 (creator_id XOR (handle+pw_hash))은 폐기. 신규 스키마에서는 둘 다 필수: `creator_id = auth.uid()` + `creator_nick` + `creator_pw_hash`
- OAuth 콜백(`/auth/callback`)은 미사용 → 제거 ([0001과 별개로 진행])
- V2: 백업 코드 export/import로 디바이스 간 신원 이동 가능 (서버 무관)
