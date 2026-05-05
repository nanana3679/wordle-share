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
