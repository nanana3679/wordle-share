# 게임 메커닉

데일리 + 챌린지 2모드. 자유 플레이 모드는 V2.

용어 정의는 [CONTEXT.md](../../CONTEXT.md) 참고. 각 결정 근거는 ADR 참고.

## Daily mode

- 덱마다 매일 1단어. 하루 1회 풀이
- 시드: `hash(deck_id + date) % len(active_words_at_version)`
- 첫 풀이자 발견 시 `DailyWord(deck, date)` lock 생성. 이후 모두 같은 단어
- 시도 횟수: `글자수 + 1`, 5~8 클램프
- date = client local date (사용자 시간대 자정 갱신)
- Round = (date, deck_version) 캡처 후 라이프사이클 동안 고정
- 끝 조건: 정답 OR 시도 소진 → `status = "completed"`

관련 ADR: [0005](../adr/0005-daily-and-challenge-modes.md), [0015](../adr/0015-round-state-capture.md)

## Challenge mode

- **하루 1회**, 단어 시퀀스 연속 풀이
- 게이트: 그날 `DailyRound.status === "completed"` (solved OR 시도 소진)
- 시드: `hash(deck_id + date + "endurance")` → 결정적 셔플 시퀀스
- 시작 시 `(date, deck_version)` 캡처 → 이후 덱 편집/자정 무관
- 한 라운드 시도 다 써서 못 맞춤 = 런 종료, 점수 = 풀어낸 라운드 수
- 덱 전체 다 풀면 만점 클리어 (`deck_size / deck_size`)
- 게이트는 시작 시 한 번만 평가. 진행 중 재평가 X
- **암시적 이어하기**: 명시 pause/resume UI 없음. URL 재방문 시 in_progress 자연 복원

관련 ADR: [0005](../adr/0005-daily-and-challenge-modes.md), [0006](../adr/0006-challenge-daily-completion-gate.md)

## 추측 입력

- 자동완성/단어 리스트 노출 X — IP 지식 자체가 진입 장벽
- 서버 검증: 활성 단어 ID 스냅샷(round_start_version)에 있으면 처리, 없으면 일반 거절
- 키보드 UI: deck의 `effective_alphabet = union(active_words.chars)`만 render

관련 ADR: [0008](../adr/0008-no-guess-autocomplete.md), [0014](../adr/0014-word-character-set-and-canonical-form.md)

## 피드백

- 로마자: NYT 워들 표준 (green / yellow / gray)
- 가변 길이라 격자 칸 수 동적
- 한글/히라가나 피드백 룰: **보류** (음절 단위 vs 자모 분해 별도 결정)

## 상태 일관성

- 서버가 단일 진리원천 (SSoT)
- 모든 추측·액션에 `expected_version` 동봉 → 서버 검증 후 +1
- 불일치 시 `409 Conflict` + 현재 상태 반환 → 클라이언트 강제 갱신 + 토스트
- WebSocket 실시간 sync는 V2

관련 ADR: [0009](../adr/0009-optimistic-locking-with-version.md)

## 점수 / 통계

- **공개 사용자 점수 랭킹 없음** (ADR 0003)
- `UserDeckStats`는 본인에게만 표시 — `best_challenge_score`, `total_clears`, `current_daily_streak`
- 외부 공유는 사용자 명시 선택 (결과 클립보드 복사 + 댓글에 paste 형태)
