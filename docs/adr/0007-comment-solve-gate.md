# 0007. 댓글 가시성 게이트 — 스포일러 방지 단일 룰

## Status

Accepted (revised after grill-with-docs Q7)

## Context

댓글은 사회적 hook이지만, 데일리 라운드의 정답을 스포일링할 가능성이 있다. 본 결정의 유일한 가림 사유 = 정답 스포 방지.

이전 후보 (이전 ADR 0007 안):
- "한 번이라도 풀면 모든 과거 댓글 열람" — 풀이 이력을 retention 도구로 묶었으나, 과거 댓글은 어차피 다른 날 단어라 스포 무관
- 게이트가 두 단계 (오늘 / 과거) — 복잡

스포일러 위협 모델:
- 스포 가능 = 댓글이 가리키는 thread_date의 daily word를 reader가 아직 안 풀었음
- 과거 thread (T < today): reader는 그 날의 daily word를 더 이상 풀 수 없음 (날짜 지났음). 스포 무관
- 오늘 thread (T = today): reader가 푸는 중일 수 있음. 가림 필요
- 미래 thread (T > today): timezone 차로 다른 user가 이미 작성 가능. reader가 그 날짜에 도달하기 전까지 가림

## Decision

### 단일 가시성 룰

```
Comment thread (deck, T) visible/writeable to reader R iff:

1. T < R.local_today
   → 과거 thread, 항상 공개

2. T == R.local_today
   AND DailyRound(R, deck, T).status ∈ {"completed", "failed"}
   → 오늘 thread, 본인 그날 데일리 라운드 종료(솔브 OR 시도 소진) 시 공개

3. T > R.local_today
   → 미래 thread, **항상 비공개** (다른 시간대 사용자가 먼저 작성했어도 R이 해당 날짜에 도달 전엔 차단)
```

- 시차 누설 방지: Sydney 사용자가 `2026-05-11` thread 작성한 것을 KST `2026-05-10` 사용자가 미리 보는 것을 차단
- 클라이언트 date 조작으로 future DailyRound `completed`를 위조해도 룰 #3이 우선 적용 → 차단

### 구현 경계 — server action only (강제)

게이트는 `reader.local_today` + `DailyRound` 상태 + `comment.thread_date` 조합 판정이라 Supabase RLS만으로 깔끔히 처리 어려움 (client-local date는 요청별 입력값).

**룰** (강제):
- **comments 테이블 client direct 접근 전면 금지** — Supabase JS SDK로 SELECT/INSERT/UPDATE/DELETE 모두 X
- 모든 read/write/delete/report는 **server action 또는 route handler만 사용**
- RLS는 **방어적 fallback이며 제품 권한 모델의 source 아님** — `hidden = true` 차단 정도 최소 보호
- 게이트 계산은 항상 server action에서 수행 (reader local_today 검증 + DailyRound 조회 + thread_date 비교)

### 식별 / 권한

- 작성: nick + pw 입력. anon_id도 같이 기록 (자기 댓글 표시·관리용)
- **삭제: nick + pw 일치 시 가능, 디바이스 무관** (비번만 알면 다른 기기에서도 삭제)
- 편집: 미지원. 삭제 + 재작성으로 우회

### 결과 공유 ↔ 댓글 분리

- 결과 화면에 "결과 클립보드 복사"만 제공
- 자동 부착 X — 사용자가 본문에 직접 paste 선택
- 강제 노출 X — 결과 공유는 명시적 user choice

## Consequences

- 게이트 룰 단일화 — 구현·테스트 단순. 풀이 이력 cross-deck 추적 불필요
- 과거 댓글 자유 열람 → 신규 진입자가 덱의 과거 활동을 그대로 둘러볼 수 있음. 디스커버리/신뢰 시그널
- timezone cross-pollination 자연 흐름 — KST 5/5 작성 댓글이 PST 5/5(= KST 5/5+12h) 도달 reader에게 자동 노출
- 미래 thread는 거의 모든 reader에게 가림. 작성자(본인) 외엔 사실상 비공개 상태
- 결과를 댓글로 공유하는 retention 메커니즘은 user-driven (강제 X). 자랑 욕구가 자연 인센티브
- 기획서 9c "제작자 게이트 우회 + 배지" 항목은 별도 결정 (Q7 보류 — 운영 디테일)
- ADR 0006 챌린지 게이트와 정확히 같은 status 기준 사용 (`completed` OR `failed` — 라운드 종료. 구현은 `lib/comment-gate.ts`가 [0006](./0006-challenge-daily-completion-gate.md)의 `isChallengeUnlocked()` 재사용)
