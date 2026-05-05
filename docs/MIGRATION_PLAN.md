# 마이그레이션 계획: IP 기반 워들로 전환

## 배경

`shelf` 레포 PR #5 의 새 기획(가칭 *Shared Word Deck*)으로 컨셉을 재정의한다. 단순 단어 덱 공유에서 **IP 팬덤 커뮤니티가 같은 덱을 데일리/챌린지로 함께 푸는 모델**로 전환한다.

핵심 변화: 검색·디렉토리 제거, 좋아요 제거, 데일리/챌린지 모드 도입, 댓글 게이트 도입, Supabase Anonymous Auth → device UUID + 닉/비번 단일화, soft-delete + 영구 word ID, 시드 도구 비공개화.

세부 신기획은 사용자 메시지 본문 참조 (이 문서 작성 시점의 SSoT).

## Before / After 매트릭스

| 영역 | 현재 | 신기획 |
|---|---|---|
| 컨셉 | 관심사 단어 덱 공유, 외부 바이럴 | IP 팬덤 커뮤니티 데일리·챌린지 |
| 발견 | `/decks` 검색·필터·디렉토리, `is_public` | 링크 공유만, 디렉토리 없음 |
| 게임 모드 | 매 진입 = 새 라운드 | **데일리** (덱·날짜별 1단어 잠금) + **챌린지** (1일 1회 연속 풀이) |
| 시도 횟수 | 6 고정 (5글자 가정) | `len + 1`, 5~8 클램프 |
| 추측 입력 | 자유 입력 검증 | 덱 활성 단어 집합 안에서만, 아니면 조용히 거절 |
| 신원 | `auth.users` (Supabase Anon) + 덱별 닉/비번 | device UUID (localStorage) + 단일 (닉, pw_hash) — 덱·댓글 통합 |
| 소셜 | `likes` 테이블 | 좋아요 제거, **댓글 (deck_id, date 단위)** + 풀이 게이트 |
| 발견 차단 | 없음 | 닉으로 enumeration 검색 금지 |
| 단어 모델 | `{word, tags}` jsonb | `Word` 별도 테이블, 영구 `id` + `active` (soft-delete) |
| 스크립트 | en (a-z 만) + 길이 제약 | roman / hangul / hiragana, **길이 제한 없음** |
| 카테고리 | `decks.categories` | 제거 (태그만 자유 텍스트 메타) |
| 썸네일 | `thumbnail_url` + Storage | 신기획에 언급 없음 → 제거 |
| 멀티탭 | 없음 | 모든 액션 `expected_version` 낙관적 락 |
| AI 시드 | Skill (`propose-topics` / `generate-decks`) 공개 | 운영자 내부 스크립트, 일반 API 호출, 봇 식별 표시 없음 |
| 모더레이션 | 없음 | `reports` 테이블 + 운영자 수동 처리 |
| 페이지 | `/decks`, `/play/[id]`, `/my/*` | `/d/[id]` (덱 허브) + `/d/[id]/play/{daily,challenge}` |

## 영향 범위

### DB (Supabase, 파괴적 변경)

- **Drop**: `likes`, `decks.is_public`, `decks.categories`, `decks.thumbnail_url`, `decks.creator_id`, `decks.description`
- **Rename / 정규화**: `decks.author_handle` → `creator_nick`, `decks.author_password_hash` → `creator_pw_hash`
- **Add 테이블**: `words`, `daily_words`, `solves`, `challenge_runs`, `comments`, `reports`, (옵션) `user_deck_stats`
- **Add 컬럼**: `decks.script` 은 이미 있음 — enum 제약을 `roman|hangul|hiragana` 로 정정
- **RLS 재설계**: `auth.uid()` 의존 제거. `solves`/`challenge_runs`/`comments` 모두 익명 신원 (`anon_id` + `pw_hash`) 검증을 Server Action 에서 수행 (RLS 는 SELECT 정책만)
- 마이그레이션 SQL: `supabase/migrations/2026MMDD_*` 시리즈로 분리

### Server Actions

- **삭제**: `app/actions/like.ts`, `app/actions/auth.ts` (anon session 발급 의존), `app/actions/storage.ts` (썸네일)
- **재작성**: `app/actions/deck.ts` — 단어를 별도 테이블로, soft-delete 지원, 시뮬레이션용 dry-run
- **신규**: `solve.ts` (start/guess with `expected_version`), `challenge.ts` (start/guess), `comment.ts` (create/delete/list with gate), `report.ts`, `daily-word.ts` (lock 발급)
- 모든 액션 입력에 `anon_id` + (쓰기 시) `nick + pw` 동봉

### 클라이언트

- **삭제 페이지**: `/decks` (탐색), `/decks/[id]/edit` (덱 상세에 통합), `/my/history`, 모든 검색/필터 UI
- **신규**: `/d/[id]` (덱 허브 = 데일리 카드 + 챌린지 카드 + 댓글 피드), `/d/[id]/play/daily`, `/d/[id]/play/challenge`, 튜토리얼 모달, 시드 입력 form
- **신규 클라이언트 상태**: `device_id` (UUID), `identity { nick, pw_hash }`, `my_decks[]`, `first_visit_dismissed` — 모두 localStorage. 쿠키 의존 제거
- **i18n**: `next-intl` 인프라 유지하되 메시지 키는 신규 페이지 기준으로 재작성
- **공유 포맷**: 기존 결과 공유 컴포넌트 → 신기획 포맷 (이름 + 시도 + 그리드 + 링크) 으로 교체

### AI 파이프라인 / Skills

- `propose-topics`, `generate-decks` skill 자체는 유지 가능 (운영자 내부 도구로 재포지셔닝)
- 출력 스키마를 신규 `Word` 모델 (`{id, text, tags, active}`) 에 맞춰 수정
- 기존 결정 사항 (Roster-first IP, taxonomy 기준) 은 그대로 통용
- 봇 덱 식별 표시 추가 금지 — 일반 사용자 API 또는 어드민 엔드포인트로 그대로 등록
- `pnpm ai:generate-decks` 등 npm 스크립트는 어드민 전용임을 README/SKILL 문서에 명시

### 문서 (/docs)

- **재작성**: `PROJECT_OVERVIEW.md`, `FEATURES.md`, `PAGE_STRUCTURE.md`, `DATABASE_SCHEMA.md`
- **삭제 대상 feature 문서**: `likes-flow.md`, `deck-pagination.md`, `deck-infinite-scroll.md`, `metadata-og-optimization.md` (재검토), `google-login-flow.md` (보류 항목으로 강등)
- **유지**: `CODING_STANDARDS.md`, `TEST_STRATEGY.md`, `ACCESSIBILITY.md`, `PERFORMANCE.md`, `ERROR_HANDLING.md`, `ai-deck-generation-pipeline.md` (스키마 업데이트만)
- **신규 feature 문서** (구현 시점 작성): `daily-mode.md`, `challenge-mode.md`, `comments-thread.md`, `optimistic-locking.md`, `device-identity.md`, `deck-creation-syntax.md`

## 단계별 계획

각 단계 완료 시 PR 분할. 한 단계가 다음 단계의 머지 의존성.

### Phase 0 — 합의 & 정리

- 이 문서 검토 + 결정 사항 잠금
- 폐기 대상 코드/문서 목록 confirm
- 신규 페이지 라우트 (`/d/[id]/...`) 와 기존 (`/decks/[id]/...`) 공존 여부 결정 (권장: 신규 라우트로 전면 교체, 기존은 삭제)

### Phase 1 — 데이터 모델 마이그레이션

- 신규 마이그레이션 SQL 작성 (drop columns, rename, new tables)
- `types/database.ts` 재생성 (`supabase gen types`)
- `types/decks.ts` 재정의 (Word, DailyWord, Solve, ChallengeRun, Comment 등)
- 기존 데이터: 운영 데이터 거의 없음 가정. 있다면 `decks` 만 보존하고 `words` 로 풀어 옮기는 일회성 스크립트

### Phase 2 — 익명 신원 모델 교체

- Supabase Anonymous Auth 의존 제거 (`middleware.ts`, `app/actions/auth.ts`)
- 클라이언트 device_id 발급 + identity 캐시 훅
- 닉/비번 입력 modal + 자동 채움 흐름
- 모든 쓰기 액션이 `anon_id` 또는 `nick+pw` 인증으로 동작하도록 표준화

### Phase 3 — 덱 CRUD 재작성

- 덱 + 단어 분리 schema 적용
- 덱 생성 폼: 인라인 `#tag` + 블록 `#tag {...}` 파서 (lib/scripts 에 추가)
- 시뮬레이션 버튼 (게시 전 dry-run 라운드)
- soft-delete 지원, 자유 편집

### Phase 4 — 데일리 모드

- `daily_words` 잠금 레코드 발급 로직 (그날 첫 풀이자 시드 계산)
- `solves` + 낙관적 락 (`expected_version`)
- 게임 페이지 재구성 (가변 칸 수, `len+1` 시도, 침묵 거절)
- 결과 화면 + 이모지 그리드 공유

### Phase 5 — 댓글 시스템

- `(deck_id, date)` 스레드, 단일 피드 + 날짜 헤더
- 게이트: solve 완료 여부 검사 (오늘은 오늘만, 과거는 한 번이라도)
- 제작자 우회 + 배지

### Phase 6 — 챌린지 모드

- `challenge_runs` + 결정적 셔플 시퀀스
- 데일리 완료 → 챌린지 잠금 해제 게이트
- 결과 공유 포맷 (점수 라인)

### Phase 7 — 운영 도구 / 모더레이션

- `reports` 테이블 + 신고 버튼
- 운영자 알림 (Discord 웹훅)
- AI 시드 skill 의 출력 스키마 신규 Word 모델로 정렬
- 어드민 엔드포인트 (rate limit 우회) 검토

### Phase 8 — 문서 / 정리

- 폐기 코드 제거 (likes, storage, search 등)
- /docs 재작성 + 신규 feature 문서 작성
- README, .claude/CLAUDE.md 갱신

## 위험 / 오픈 이슈

- **한글/히라가나 피드백 룰**: 신기획에서 보류. Phase 4 진입 시점에 별도 결정 필요 (음절 단위 vs 자모 분해)
- **rate limit 수치, hard delete cascade**: 신기획에서 보류
- **i18n 유지 여부**: 신기획에 명시 없음. 멀티 스크립트 지원과 별개로 UI 다국어는 유지 권장 (영어 기본 + 한국어)
- **마이그레이션 데이터 보존**: 현 운영 덱 수가 적으면 wipe + 재시드 권장. 보존 시 Phase 1 에 일회성 스크립트 추가
- **next-intl 쿠키 ↔ 신기획 "쿠키 X, localStorage 만"**: locale 저장도 localStorage 로 옮길지 결정 필요
- **enumeration 차단** 과 "내 덱" 페이지: 신기획에서 localStorage 만 사용 — 디바이스 변경 시 손실. V2 백업 코드 export 까지는 감수
