# 0014. Word 허용 문자 집합 + canonical form

## Status

Accepted

## Context

Word는 게임 격자·키보드 UI·추측 검증·dedupe·검색의 근본 단위. 허용 문자 집합과 정규화 규칙이 흔들리면 다음에서 모두 혼선:

- 격자 칸 수 = 글자 수 → 멀티-바이트/조합 문자 처리
- 키보드 UI에 어떤 키를 그릴지
- 두 Word가 같은가 판정 (dedupe, 추측 매칭)
- 결과 공유 텍스트의 시각적 일관성

후보 모델:
- (a) 풀 creator-defined — 자유도 최대. UX 파편화. 어뷰즈 표면
- (b) script + `allow_digits` 토글 — 단순. 실 IP명 일부 케이스(L'Arc, X-Men) 못 다룸
- (c) **script + 고정 확장 allowlist** (본 결정)
- (d) 키보드-typeable 모두 — 노이즈 큼 (`@#$&` 등 거의 안 쓰임)

## Decision

### 허용 문자

- script 알파벳: roman `a-z` / hangul `가-힣` (완성형) / hiragana `ぁ-ゖゝゞ`
- 추가 (모든 script 공통): `0-9`, `-`, `'`, `.`
- 그 외 (공백, `@#$%&` 등 기호, 다른 script, control char) 모두 reject

### 정규화

- NFC Unicode normalization (모든 입력)
- roman script: lowercase
- 저장 = 정규화된 단일 텍스트. 원본 보존 X. 수정 후에도 정규화 형태로 표시
- `(deck_id, text)` 유니크로 dedupe 강제

### 키보드 UI (smart rendering)

- `deck.effective_alphabet = union(active_words.chars)`
- 키보드는 effective alphabet만 render — 사용 안 된 키는 미표시
- 데이터 모델에 `allow_digits` 같은 토글 컬럼 없음. `script`만 유지

### 위반 처리

- 자동 변환 가능(대→소문자, NFC) → 변환 후 저장
- 변환 불가능(`@`, 공백, 다른 script) → 폼에서 reject + 메시지
- 사용자가 우회 (예: "AT&T" → "atandt", "고무고무 열매" → "고무고무열매" 또는 분할)

## Consequences

- 모든 덱이 같은 알파벳 규칙 → 플레이어 학습 비용 0
- 80%+ IP명 자연 수용 (X-Men, L'Arc, Mr., 1세대, FF14)
- 케이스 정보 손실(LoL → lol) 감수 — IP 팬은 자연 매핑
- 키보드 UI가 deck 내용에서 derive → 약한 정보 노출 ("이 덱에 하이픈 단어 있음") 감수. 단어 자체 누설 X
- script 혼용은 약한 경고(기획서 입장 그대로)
- 향후 `~` `+` `&` 등 추가 필요시 allowlist 확장 = 한 줄 변경. **축소(이미 쓰이는 문자 제거)는 어려움** — 기존 Word 무효화 필요
