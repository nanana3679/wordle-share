# 게임 메커닉

데일리 + 챌린지 2모드. 자유 플레이 모드는 V2.

용어 정의는 [CONTEXT.md](../../CONTEXT.md) 참고. 각 결정 근거는 ADR 참고.

## Daily mode

- 덱마다 매일 1단어. 하루 1회 풀이
- 시드: `hash(deck_id + date) % DailyWord.active_word_ids.length` — lock 생성 시 1회 계산
- 첫 풀이자 발견 시 `DailyWord(deck, date)` lock 생성. lock에 active word IDs 스냅샷 저장. 이후 모두 같은 단어 + 같은 active set
- 시도 횟수: `글자수 + 1`, 5~8 클램프
- date = client local date (사용자 시간대 자정 갱신)
- DailyRound: `date`만 캡처. 검증·시드는 `DailyWord.active_word_ids` 사용
- 끝 조건: 정답 OR 시도 소진 → `status = "completed"`

관련 ADR: [0005](../adr/0005-daily-and-challenge-modes.md), [0015](../adr/0015-round-state-capture.md)

## Challenge mode

- **하루 1회**, 단어 시퀀스 연속 풀이
- 게이트: 그날 `DailyRound.status === "completed"` (solved OR 시도 소진)
- 시드: `hash(deck_id + date + "endurance")` → 결정적 셔플 시퀀스 (input set은 `DailyWord.active_word_ids`)
- ChallengeRun은 `date`만 캡처. 셔플 source는 `DailyWord.active_word_ids` — 같은 (deck, date) 모든 사용자 동일 시퀀스
- 한 라운드 시도 다 써서 못 맞춤 = 런 종료, 점수 = 풀어낸 라운드 수
- 덱 전체 다 풀면 만점 클리어 (`deck_size / deck_size`)
- 게이트는 시작 시 한 번만 평가. 진행 중 재평가 X
- **암시적 이어하기**: 명시 pause/resume UI 없음. URL 재방문 시 in_progress 자연 복원

관련 ADR: [0005](../adr/0005-daily-and-challenge-modes.md), [0006](../adr/0006-challenge-daily-completion-gate.md)

## 추측 입력

- 자동완성/단어 리스트 노출 X — IP 지식 자체가 진입 장벽
- 서버 검증: `DailyWord.active_word_ids` 스냅샷에 있으면 처리, 없으면 일반 거절
- 키보드 UI: 메인 script 알파벳은 항상 전체 고정 + 특수문자(0-9, `-`, `'`, `.`)는 snapshot에서 derive (검증 source와 일치)

관련 ADR: [0008](../adr/0008-no-guess-autocomplete.md), [0014](../adr/0014-word-character-set-and-canonical-form.md)

## 피드백

- 격자 칸 수 = char count (가변)
- **char 단위 비교**:
  - roman: letter (a-z) per cell
  - hangul: **자모 (jamo)** per cell — Word.text 완성형 NFC 저장, gameplay에서 자모 분해
  - hiragana: kana per cell (각 kana가 char)
- NYT 워들 표준 색칠 (green / yellow / gray) — 모든 script 동일
- 자모/kana 단위로 그룹별 색칠 같은 추가 디테일은 구현 단계에서 결정

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
