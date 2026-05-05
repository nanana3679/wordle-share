# Architecture Decision Records

신규 기획(Shared Word Deck) 설계 결정 기록.

## 작성 규칙

- 파일명: `NNNN-<kebab-title>.md`
- 섹션: `Status` / `Context` / `Decision` / `Consequences`
- Status: `Proposed` / `Accepted` / `Superseded by NNNN`
- 결정이 바뀌면 새 번호로 ADR을 추가하고, 이전 ADR은 `Superseded by` 표기

## 인덱스

### 신원 / 인증
- [0001](./0001-anon-auth-and-nick-pw-identity.md) — Supabase Anonymous Auth + 단일 nick/pw 자격증명
- [0002](./0002-ip-hash-for-likes.md) — 좋아요는 IP 해시 단독 식별

### 게임 디자인 철학
- [0003](./0003-no-public-user-leaderboard.md) — 사용자 점수 랭킹/리더보드 없음
- [0004](./0004-content-likes-vs-user-scores-threat-model.md) — 콘텐츠 좋아요와 사용자 점수의 위협 모델 분리
- [0005](./0005-daily-and-challenge-modes.md) — 데일리 + 챌린지 2모드 구성
- [0006](./0006-challenge-daily-completion-gate.md) — 챌린지 1일 1회 + 데일리 완료 게이트
- [0007](./0007-comment-solve-gate.md) — 댓글 풀이-게이트 ((deck, date) 단위)

### 게임 메커닉
- [0008](./0008-no-guess-autocomplete.md) — 추측 입력 자동완성/덱 노출 없음
- [0010](./0010-word-soft-delete-with-permanent-ids.md) — 단어 영구 ID + soft-delete

### 엔지니어링
- [0009](./0009-optimistic-locking-with-version.md) — 모든 액션에 expected_version 동봉

### 운영
- [0011](./0011-operator-seed-via-public-api.md) — 운영자 시드 덱은 일반 API 호출 + 지속 업데이트
- [0012](./0012-ssr-public-deck-pages.md) — 공개 페이지 SSR + 슬러그 + sitemap + OG
- [0013](./0013-report-based-moderation-with-auto-hide.md) — 신고 누적 자동 가림
