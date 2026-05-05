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
- **공백 불허** — 다중-단어 IP명은 분할 또는 결합 (예: "고무고무 열매" → "고무고무열매" 또는 별개 두 Word)
- **허용 문자** = `script 알파벳 + 0-9 + - + ' + .`
  - script 알파벳: roman `a-z` / hangul `가-힣` / hiragana `ぁ-ゖゝゞ`
  - 그 외 (공백, `@#$%&` 등 기호, 다른 script, control char) 모두 reject
- **정규화**: NFC + roman script만 lowercase
- 같은 Deck 내 동일 canonical text는 단일 Word — `(deck_id, text)` 유니크 인덱스
- Tag union: 동일 Word를 다른 tag로 다시 추가하면 tag 합집합

### 키보드 UI (smart rendering)

- `effective_alphabet = union(active_words.chars)`
- on-screen 키보드는 effective alphabet만 render — 사용 안 된 키는 미표시
- 단순 알파벳 덱 → 깔끔한 a-z. 숫자/하이픈 포함 덱 → 사용된 만큼만 추가 표시

관련 ADR: 0010(영구 ID + soft-delete), 0014(허용 문자 + 정규화)

---

## DailyWord (lock)

특정 (deck, date)에 잠긴 target Word. PK: `(deck_id, date)`.

- 시드: `hash(deck_id + date) % active_words.length` — 라운드 시작 시점 active 집합 기준 (= 캡처된 deck_version)
- date = **client-local date** — 각 시간대가 자기 자정에 갱신
- 같은 date string의 lock은 글로벌 단일 row. 먼저 풀이 시작한 사람이 lock 생성, 결정적 시드라 누가 먼저든 결과 동일
- Word.id 영구 + soft-delete라 lock 후 단어 삭제돼도 그날 데일리는 그 단어 유지

## DailyRound 라이프사이클

- 사용자가 Game 페이지 접속 시 시작 → **`(date, deck_version)` 캡처**
- 자정 넘어도 같은 round 계속 (date 고정)
- 추측마다 캡처된 deck_version의 active word 집합으로 검증
- in_progress인 채로 무기한 유지 가능 — 사용자가 마저 풀거나 영영 안 풀거나
- 새 날짜 라운드는 별개 row (different PK) — 이전 날 미완료 라운드와 동시 진행 가능
- UI에 "이어풀기" 옵션으로 미완료 과거 라운드 노출

## ChallengeRun 라이프사이클

- 시작 시 게이트: `DailyRound(anon, deck, today).status === "completed"` (solved=true 또는 시도 소진)
- 시작 시 `(date, deck_version)` 캡처
- 자정 넘김/덱 편집과 무관하게 캡처된 스냅샷 기준으로 진행
- 게이트는 시작 시 한 번만 평가 — 진행 중 재평가 X
- 1일 1회 — 같은 (anon, deck, date) PK 중복 차단

관련 ADR: 0006(챌린지 게이트), 0009(낙관적 락), 0015(라운드 상태 캡처)

## deck.version

Deck의 word membership 변경 시 increment되는 정수. Round 시작 시 캡처됨.

- Word 추가/비활성화마다 +1 (메타데이터 변경은 무관)
- Word는 `added_at_version`과 `removed_at_version` 보유 → "version V 시점 active 집합" 판정 가능
- Round.deck_version으로 진행 중 라운드 ↔ 진행 중 덱 편집 분리

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
사용자 R이 (deck, T) thread 열람 가능 ⇔
  T < R.local_today                              (과거 — 항상 공개)
  OR DailyRound(R, deck, T).status === completed (오늘/미래 — 본인 라운드 완료)
```

- 과거 thread는 게이트 없음 (스포일러 무관)
- 미래 thread (T > today)는 사실상 가림 — 시차로 인해 다른 timezone 사용자가 미리 작성 가능. R이 자기 시간대로 그 날짜에 도달 + 라운드 완료 후 열람
- 작성도 같은 게이트 — 본인이 풀이한 thread에만 글 쓸 수 있음

### 결과 공유 ↔ 댓글 결합 X

- 결과 화면에 "결과 클립보드 복사" 버튼만 제공
- 사용자가 댓글 본문에 직접 paste — 자동 부착 X
- 결과 공유는 사용자의 명시적 선택 (강제 X)

관련 ADR: 0007(가시성 게이트), 0013(자동 가림)
