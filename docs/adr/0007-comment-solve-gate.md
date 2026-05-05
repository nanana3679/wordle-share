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
Comment thread (deck, T) visible to reader R iff:
  T < R.local_today
  OR DailyRound(R, deck, T).status === "completed"
```

- 과거: 게이트 없음. 풀이 이력 무관
- 오늘 (T == R.local_today): 본인 데일리 완료(solved 또는 시도 소진) 후 열람·작성
- 미래 (T > R.local_today): 사실상 가림 — R이 그 시각에 도달 + 라운드 완료 시 열람

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
- ADR 0006 챌린지 게이트와 정확히 같은 status 기준 사용 (`completed`)
