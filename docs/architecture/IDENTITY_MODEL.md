# 신원 모델

회원가입 없는 익명 모델. 두 신원 layer + 좋아요 별도 식별.

## Layer 1: 디바이스 신원 (anon_id)

- **Supabase Anonymous Auth** — 첫 방문 시 미들웨어가 자동 익명 세션 발급
- `auth.uid()` UUID = `anon_id`
- 쿠키 기반 세션 관리. 시크릿 모드/캐시 클리어 시 새 anon_id 발급
- 용도: 데일리 풀이 진행 추적, 댓글 게이트 판정, 챌린지 1회 제한, 본인 통계, 신고자 식별
- 향후 OAuth 업그레이드 경로 보존 (anonymous → email/social 시 데이터 이행 가능)

## Layer 2: 자원 단위 인증 (nick + pw)

- **단일 (nick, pw) 쌍** — 한 디바이스 = 한 쌍
- localStorage에 캐시, 쓰기 폼 자동 채움
- 첫 쓰기 액션 시 명시 입력
- pw는 bcrypt 해시 저장
- 용도: 덱·댓글 작성/수정/삭제 인증
- 디바이스 변경/시크릿 모드여도 nick+pw 알면 어디서든 자기 자원 조작

### nick 정책

- 전역 유일 X — 같은 nick 다른 사람 가능
- 표시: `{nick}#{anon_id 앞 4 hex}` (예: `철수#a3f9`)
- 다른 디바이스에서 같은 nick+pw 쓰면 anon_id가 달라 suffix도 달라짐 — 자연스럽게 multi-device 구별
- nick 입력에 `#` 불허

## Layer 3: 좋아요 식별 (ip_hash)

- 좋아요 PK = `(deck_id, ip_hash)` — IP당 한 덱 1좋아요
- `ip_hash = SHA-256(ip + 고정_salt)` — salt는 영구 고정 (회전 시 모든 좋아요 무효화)
- anon_id/nick과 무관 — 풀이 무관, 누구나 가능

관련 ADR: [0001](../adr/0001-anon-auth-and-nick-pw-identity.md), [0002](../adr/0002-ip-hash-for-likes.md)

## Enumeration 차단

- **금지 기능**: nick+pw로 "이 사람의 덱 모두 보여줘" 검색 X
- 약한 비번 사용자가 다른 사람 자원 접근하는 보안 사고 방지
- "내 덱" 페이지 = localStorage에 기록된 deck_id 목록만. 서버 query 아님
- 디바이스 변경 시 "내 덱" 리스트 손실. 단 nick+pw 알면 직접 링크로 수정 가능
- V2: 클라이언트 측 백업 코드 export/import (서버 무관)

## OAuth

- **사회 로그인 미도입** — 익명 모델 유지. 검토 후 거절
- 동기는 크로스 디바이스 기록 관리였으나 V2 백업 코드 export/import로 같은 문제 해결 가능
- 활성 제작자가 강하게 요구하기 전까지 보류
- 기존 코드의 Google OAuth 콜백은 마이그레이션 Phase 1에서 제거

## 미들웨어

- 모든 요청에 Supabase 익명 세션 갱신 (`@supabase/ssr` 패턴)
- locale 쿠키 설정 (next-intl)

## localStorage 구조

```
{
  identity: { nick, pw_hash },          // 첫 쓰기 후
  my_decks: [{ deck_id, last_visited_at }],
  first_visit_dismissed: boolean         // 튜토리얼
}
```

쿠키 X. anon_id는 Supabase가 관리하는 별도 쿠키.
