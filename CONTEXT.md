# 도메인 용어집 (CONTEXT.md)

Shared Word Deck 도메인의 캐노니컬 용어. 새 문서·코드·대화는 이 용어집을 기준으로 한다.
용어가 흔들리면 즉시 이 파일을 갱신하고 ADR(`docs/adr/`)에 결정 근거를 남긴다.

---

## Deck (덱)

사용자가 만드는 **단어 모음** + 그 모음에 부착되는 사회적 layer (댓글 스레드, 데일리 사이클, 좋아요).

- 자유 이름 (예: "원피스 덱", "포켓몬 1세대 메인", "원피스 빌런 모음")
- 한 사용자가 여러 Deck을 만들 수 있음. 한 IP에 여러 Deck 가능 (UGC 정신, 큐레이션 취향 차이)
- **시스템에 "IP" 엔티티는 없다**. "원피스" 같은 IP는 Deck 이름·설명에만 등장하는 텍스트
- 같은 IP의 여러 Deck은 좋아요/Hot 피드로 자연 가르마
- 디자인 원칙 4: "덱 = 미니 커뮤니티 단위" — 댓글 스레드와 데일리 사이클은 Deck별로 독립
- script 하나만 가짐 (`roman` | `hangul` | `hiragana`)
- **invariant: `count(active words) >= 1`** — 생성/수정 모두 강제. 마지막 active 단어 비활성화 시도는 reject. 운영자 시드 스크립트도 동일 룰 적용
- **단어 수 상한 없음, 하한은 1만 강제** — 작은 덱은 게임감이 떨어지지만 좋아요/피드가 자연 가르마. 시스템 strict 강제 X

관련 ADR: 없음 (자명한 UGC 결정. ADR 불필요)

---

## Round (라운드)

**한 단어 풀이 단위**. 한 Round = 한 Target Word + N개 Attempt.

- 시도 횟수 상한 = `글자수 + 1`, 5~8 클램프
- 끝 조건: 정답 맞춤 OR 시도 소진
- Daily mode = Round 1개. Challenge mode = Round N개를 Run에 묶음

## Run (런)

여러 Round로 구성된 시퀀스. **Challenge mode에만 존재**.

- 1일 1회 시작 (ADR 0006)
- 점수 = 완료한 Round 수
- 데일리에는 Run 추상화 도입 X (인위적 상위 계층 회피)

## Attempt (시도, = Guess)

단일 추측 입력. NYT 워들의 한 줄 입력에 대응.

- 글자별 green / yellow / gray 피드백 (로마자)
- 한글/히라가나 피드백 룰은 보류 (음절 vs 자모)

## DailyRound, ChallengeRun (data model)

각각 데일리 Round 1개, 챌린지 Run 1개에 대한 `(anon_id, deck_id, date)` 기록.
이전 `Solve` 엔티티는 결과 함의(`solved: bool`이 따로 있음에도 이름이 성공을 함의)를 제거하기 위해 **`DailyRound`로 리네임**.

관련 ADR: 0006(챌린지 게이트), 0009(낙관적 락).

---

## Word (단어)

Deck 안의 풀이 대상. 영구 ID + soft-delete (`active` flag).

- **저장 = 정규화된 단일 텍스트**. 원본 보존 X. 표시도 정규화 형태 (수정 후에도 정규화된 모습으로 보임)
- **gameplay 분해**: hangul script는 저장은 완성형 NFC지만 격자/키보드/비교 모두 **자모 단위**. roman/hiragana는 char 그대로
- **공백 불허** — 다중-단어 IP명은 분할 또는 결합 (예: "고무고무 열매" → "고무고무열매" 또는 별개 두 Word)
- **허용 문자** = `script 알파벳 + 0-9 + - + ' + .`
  - script 알파벳: roman `a-z` / hangul `가-힣` / hiragana `ぁ-ゖゝゞ`
  - 그 외 (공백, `@#$%&` 등 기호, 다른 script, control char) 모두 reject
- **정규화**: NFC + roman script만 lowercase
- 같은 Deck 내 동일 canonical text는 단일 Word — `UNIQUE(deck_id, text)` (전체 unique)
- **Soft-delete + reactivate**: 비활성화는 `active: false`. 같은 text 재추가는 동일 row의 `active`를 다시 `true`로 toggle. Word.id는 영구 (재사용·재할당 X)

> Tag 기능은 MVP 범위 밖 (ADR 0016). Word 모델은 `{text, active}`만.

### 키보드 UI (hybrid rendering)

플레이 페이지 on-screen 키보드는 두 부분 구성:

- **기본 script 알파벳**: 항상 전체 고정 (a-z / 가-힣 / ひらがな) — snapshot/current 무관, spoiler 누설 0
- **특수문자 (0-9, `-`, `'`, `.`)**: `DailyWord.active_word_ids` snapshot에서 derive — 검증 source와 일치 (race-free). 사용 안 된 특수문자는 미표시
- **특수문자 derive 근거**: 플레이어는 "이 단어에 하이픈/마침표가 있나?" 직관이 없음 (메인 알파벳은 IP 자체가 힌트). 키보드에 노출 안 하면 punctuation-포함 단어 시도 못 함 → 약한 spoiler 비용 vs playability 이익 → playability 우선

관련 ADR: 0010(영구 ID + soft-delete), 0014(허용 문자 + 정규화)

---

## DailyWord (lock)

특정 (deck, date)에 잠긴 target Word + 그 시점의 active word ID 스냅샷. PK: `(deck_id, date)`.

- 컬럼: `(deck_id, date, word_id, active_word_ids bigint[], locked_at)`
- `active_word_ids`는 **`Word.id ASC` 정렬** 강제 — race/query plan에 따른 비결정성 차단
- 시드: `hash(deck_id + date) % active_word_ids.length` — lock 시점에 1회 계산
- **DailyRound·ChallengeRun 모두 `DailyWord.active_word_ids`를 검증·셔플 source로 사용** — 같은 (deck, date) 모든 사용자가 같은 단어·같은 시퀀스·같은 검증 set
- date = **client-local date** — 각 시간대가 자기 자정에 갱신
- 같은 date string의 lock은 글로벌 단일 row. 먼저 풀이 시작한 사람이 lock 생성, 결정적 시드라 누가 먼저든 결과 동일
- **첫 솔버 저장 안 함** — anon_id 비기록 (YAGNI)
- Word.id 영구 — lock 후 word.active toggle돼도 lock의 word_id는 유효 (Word row 영구 존재)
- **편집 propagation**: 편집 시점에 미존재 lock부터 새 active set 반영. 시차로 미래 lock이 미리 만들어졌으면 그 lock 유지, 더 미래 날짜부터 새 set
- date string은 **보안 경계가 아님** — 클라이언트 조작으로 미래/과거 round 접근 가능. 공개 랭킹 없으므로 abuse 인센티브 약함 (ADR 0015)

## DailyRound 라이프사이클

- 사용자가 Game 페이지 접속 시 시작 → `date` 캡처 (client local)
- 자정 넘어도 같은 round 계속 (date 고정)
- 추측 검증·시드 모두 `DailyWord.active_word_ids` 사용
- in_progress인 채로 무기한 유지 가능 — 사용자가 마저 풀거나 영영 안 풀거나
- 새 날짜 라운드는 별개 row (different PK) — 이전 날 미완료 라운드와 동시 진행 가능
- UI에 "이어풀기" 옵션으로 미완료 과거 라운드 노출

## ChallengeRun 라이프사이클

- 시작 시 게이트: `DailyRound(anon, deck, today).status === "completed"` (solved=true 또는 시도 소진)
- 시작 시 `date` 캡처
- 셔플은 `DailyWord.active_word_ids` 기준 — 같은 (deck, date) 모든 사용자 동일 시퀀스
- 자정 넘김/덱 편집과 무관 (snapshot 고정)
- 게이트는 시작 시 한 번만 평가 — 진행 중 재평가 X
- 1일 1회 — 같은 (anon, deck, date) PK 중복 차단
- **암시적 이어하기**: 명시 "pause/resume" UI 없음. 탭 닫고 게임 URL 다시 열면 서버에 남은 in_progress 상태로 자연 복원

관련 ADR: 0006(챌린지 게이트), 0009(낙관적 락), 0015(라운드 상태 캡처)

---

## Comment (댓글)

`(deck_id, thread_date)` 단위 thread. 단일 피드, 최신순, 날짜 헤더로 그룹화.

- `thread_date` = **작성자의 client local date at write time** (추적 필수)
- 작성: nick + pw (localStorage 자동 채움)
- 삭제: nick + pw 일치 시 가능 — **디바이스 무관**, 비번만 알면 어디서든
- 편집: 미지원. 삭제 + 재작성으로 우회
- 답글 / 멘션 / 이미지 / 답글: 미지원
- 신고 누적 시 자동 hidden (3회 임계, ADR 0013)

### 가시성 게이트

가림의 유일한 사유 = 데일리 라운드 결과 스포일러 방지.

```
사용자 R이 (deck, T) thread 열람·작성 가능 ⇔
  T < R.local_today                                            (과거 — 항상 공개)
  OR (T == R.local_today
      AND DailyRound(R, deck, T).status === "completed")       (오늘 — 본인 라운드 완료)

T > R.local_today → 무조건 비공개 (시차로 다른 사용자 미리 작성해도 차단)
```

- 과거 thread는 게이트 없음 (스포일러 무관)
- 오늘 thread는 본인 데일리 완료 후 공개
- **미래 thread는 무조건 차단** — Sydney `2026-05-11` 작성 댓글을 KST `2026-05-10` 사용자에게 노출 X
- 작성도 같은 게이트 — 본인이 풀이한 thread에만 글 쓸 수 있음

### 구현 경계 — server action only

게이트가 `reader.local_today` + DailyRound 상태 + thread_date 조합 판정이라 Supabase RLS만으로 처리 어려움. **comments 클라이언트 direct SELECT 금지**, 조회는 **server action**으로. RLS는 최소 보호 (`hidden = true` 차단).

### 결과 공유 ↔ 댓글 결합 X

- 결과 화면에 "결과 클립보드 복사" 버튼만 제공
- 사용자가 댓글 본문에 직접 paste — 자동 부착 X
- 결과 공유는 사용자의 명시적 선택 (강제 X)

관련 ADR: 0007(가시성 게이트), 0013(자동 가림)

---

## Nick / 사용자 표시

작성자 표시는 **`{nick}#{anon_id_prefix}` 형식**으로 disambiguation.

```
display = `${nick}#${anon_id.substring(0,4)}`
예: 철수#a3f9, 철수#bbbb, 철수#42c1
```

- nick은 전역 유일 X — 같은 nick을 다른 사람이 써도 자연스럽게 표시 구별
- anon_id (Supabase auth.uid UUID) 앞 4 hex chars suffix
- 디바이스 단위 고정 — 같은 사람이 항상 같은 suffix
- 다른 디바이스에서 같은 닉+비번 = anon_id 다름 = suffix 다름. **multi-device 자체가 표시상 구별됨** (privacy 강화 효과)
- nick 입력에 `#` 불허 (충돌 회피)

관련 ADR: 0001(신원 모델)
