# 댓글 시스템

`(deck_id, thread_date)` 단위 thread. 단일 피드, 최신순, 날짜 헤더로 그룹화.

## Thread 구조

- PK = `(deck_id, thread_date)`
- `thread_date` = 작성자의 client local date at write time
- 작성자 nick 표시는 `{nick}#{anon_id 앞 4hex}` (IDENTITY_MODEL 참고)
- 답글 / 멘션 / 이미지: 미지원

## 가시성 게이트

가림의 유일한 사유 = 데일리 라운드 결과 스포일러 방지.

```
사용자 R이 (deck, T) thread 열람·작성 가능 ⇔
  T < R.local_today                              (과거 — 항상 공개)
  OR DailyRound(R, deck, T).status === completed (오늘/미래 — 본인 라운드 완료)
```

- 과거 thread: 게이트 없음. 풀이 이력 무관
- 오늘 (T = R.local_today): 본인 데일리 완료(solved 또는 시도 소진) 후 열람·작성
- 미래 (T > R.local_today): 사실상 가림 — R이 그 시각에 도달 + 라운드 완료 시 열람
- 시차 cross-pollination 자연 흐름 — KST 작성 5/5 댓글이 PST 5/5(=KST 5/5+12h) 도달 reader에게 자동 노출

관련 ADR: [0007](../adr/0007-comment-solve-gate.md)

## 라이프사이클

- **작성**: nick + pw 입력. localStorage 자동 채움. anon_id도 row에 저장 (자기 댓글 표시·관리용)
- **삭제**: nick + pw 일치 시 가능. **디바이스 무관** — 비번만 알면 어디서든
- **편집**: 미지원 (삭제 + 재작성으로 우회)
- **신고**: 누적 3회 시 자동 hidden (MODERATION 참고)
- 본인 댓글 / 신고 가림 / 일반 삭제는 모두 `deleted` flag soft-delete

## 결과 공유 ↔ 댓글 분리

- 결과 화면에 "결과 클립보드 복사" 버튼만 제공
- 자동 부착 X — 사용자가 댓글 본문에 직접 paste 선택
- 강제 노출 X — 결과 공유는 user choice
- 결과 텍스트 형식: "[원피스 덱] 5글자 4/6 + 이모지 그리드 + 링크"

## 알림

- in-app 안읽음 카운트만 (push/email X — 익명 모델 유지)
- 자기 덱의 댓글 / 자기 댓글에 대한 답글(V2) 등에서 카운트 증가
- 카운트 reset = 알림 페이지 방문 시

## V2 후보

- 댓글 좋아요 / 이모지 리액션 (제한 셋: 👍 🔥 😂)
- 답글 / @mention
- 페이지네이션 (현재 cursor 기반, V2 무한 스크롤)
- 푸시 알림 / 웹훅
