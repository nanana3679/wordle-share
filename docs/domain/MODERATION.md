# 모더레이션

신고 + 자동 임시 가림 + 운영자 수동 검토. AI 모더레이션은 V2.

## 신고 흐름

- 모든 덱/댓글에 신고 버튼
- 신고 작성: `Report { target_type, target_id, reporter_anon_id, reason?, created_at, resolved }`
- 같은 사용자가 같은 대상 중복 신고 차단 — `(target_type, target_id, reporter_anon_id)` 유니크
- 신고 사유: optional 자유 텍스트 (선택)

## 자동 임시 가림

신고가 임계 도달하면 자동 hidden:

| 대상 | 임계 | 효과 |
|---|---|---|
| Deck | 5회 | `Deck.hidden = true`. 메인 피드/검색/sitemap 제외. 직접 링크는 접근 가능 |
| Comment | 3회 | `Comment.hidden = true`. 즉시 숨김 |

- 임계치는 보수적 시작 — false-positive 늘려도 운영자 복구 가능. 운영하며 조정
- 환경변수로 분리해 코드 변경 없이 조정
- DB 트리거: `report_count` 증가 → 임계 도달 시 `hidden = true`

관련 ADR: [0013](../adr/0013-report-based-moderation-with-auto-hide.md)

## 작성자 알림 + 대응

- 자동 가림 발생 시 작성자에게 in-app 알림 — "단어 5개 미만으로 떨어져 비공개 됨" 같은 사유
- 작성자는 직접 링크로 자기 자원 접근 가능 → 수정/삭제로 대응
- 단순 hidden은 영구 삭제가 아님 — 신고 임계 미만으로 떨어지면 unhide도 검토 (V2)

## 운영자 검토

- 자동 가림 트리거 시 운영자 알림 (이메일/디스코드 웹훅)
- 운영자가 수동 검토:
  - 합법한 콘텐츠 → 복구 (`hidden = false`, report 일부 dismiss)
  - 부적절 → 영구 삭제 (`Deck.hard_delete()` 또는 `Comment.deleted = true`)
- 저작권 takedown도 동일 흐름

## 스코프 외 (V2 이후)

- AI 모더레이션 (Perspective API / Claude)
- 금칙어 사전
- 사전 검수
- 비공개 덱 / 접근 코드 덱
- 평판 가중치 — 신뢰도 높은 신고자 가중

## Cascade 정책 (보류)

- 덱 hard delete 시 댓글/풀이/좋아요 cascade — Phase 2 마이그레이션 시 결정
- 권장: ON DELETE CASCADE (운영 단순)
- DailyWord lock도 cascade 삭제

## 어뷰즈 대응

- IP당 신고 rate limit (예: 10건/일)
- anon_id당 신고 일일 한도
- 자동화된 spam 신고는 운영자 수동 검토에서 dismiss → 신고자 anon_id 반복 dismiss 시 신고 무효화 (V2 평판 가중치 자동화)
