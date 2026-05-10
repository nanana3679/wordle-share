# 데이터베이스 스키마

Postgres (Supabase). 9개 도메인 테이블 + Supabase auth.users.

## auth.users (Supabase 관리)

- 첫 방문 시 익명 세션 자동 발급 (`is_anonymous = true`)
- `id` UUID = `anon_id`, RLS·신원 식별 기준
- OAuth 업그레이드 경로 보존 (V2 백업 코드)

## decks

- `id` text PK (nanoid 10자)
- `name` text — 표시·검색 매칭 대상
- `script` text enum (`roman` | `hangul` | `hiragana`)
- `creator_anon_id` UUID FK auth.users
- `creator_nick` text — 표시용 (전역 유일 X)
- `creator_pw_hash` text — bcrypt
- `like_count` int default 0 — 캐시
- `report_count` int default 0
- `hidden` bool default false — 자동 가림 또는 운영자
- `created_at`, `updated_at`

## words

- `id` bigserial PK
- `deck_id` text FK decks
- `text` text — 정규화된 canonical (NFC + roman lowercase)
- `active` bool default true
- `created_at`
- 유니크: `UNIQUE(deck_id, text)` (전체 unique — re-add는 active toggle)
- 인덱스: `(deck_id, active)` for active 조회
- **Invariant** (server action enforce, DB constraint X): 한 덱당 `count(active) >= 1`. 마지막 active 비활성화 reject (ADR 0010)

## daily_words

- `deck_id` text FK
- `date` date — client local YYYY-MM-DD
- `word_id` bigint FK words
- `active_word_ids` bigint[] — lock 시점의 active word ID 스냅샷 (DailyRound·ChallengeRun 검증·셔플 source). **`Word.id ASC` 정렬로 채움** (시드/셔플 결정성 보장)
- `locked_at` timestamptz
- PK: `(deck_id, date)`
- 첫 풀이자 발견 시 `INSERT ... ON CONFLICT DO NOTHING`. snapshot이 lock-time freeze 책임

## daily_rounds

- `anon_id` UUID, `deck_id` text, `date` date
- `word_id` bigint — daily_words.word_id 참조 (검증은 daily_words.active_word_ids 사용)
- `current_tries` jsonb — 추측 기록
- `tries_used` int
- `solved` bool default false
- `status` text enum (`in_progress` | `completed`)
- `version` int default 0 — 낙관적 락
- `started_at`, `last_action_at`, `completed_at`
- PK: `(anon_id, deck_id, date)`

## challenge_runs

- `anon_id`, `deck_id`, `date`
- `current_word_index` int default 0 — daily_words.active_word_ids에서 셔플된 시퀀스의 현재 인덱스
- `current_tries` jsonb
- `score` int default 0 — 풀어낸 라운드 수
- `status` text enum (`in_progress` | `ended`)
- `ended_reason` text enum (`failed` | `completed` | null)
- `version` int — 낙관적 락
- `started_at`, `last_action_at`, `ended_at`
- PK: `(anon_id, deck_id, date)`

## comments

- `id` text PK (nanoid)
- `deck_id` text FK
- `thread_date` date — 작성자의 client local date at write time
- `anon_id` UUID — 작성 시점
- `nick` text, `pw_hash` text bcrypt
- `text` text
- `deleted` bool default false
- `hidden` bool default false (신고 임계)
- `report_count` int default 0
- `created_at`
- 인덱스: `(deck_id, thread_date, created_at DESC)`

## likes

- `deck_id` text FK
- `ip_hash` text — SHA-256(ip + 고정_salt)
- `created_at`
- PK: `(deck_id, ip_hash)`
- 트리거: insert/delete 시 `decks.like_count` ±1

## reports

- `id` text PK
- `target_type` text enum (`deck` | `comment`)
- `target_id` text — polymorphic (FK 못 검). 무결성은 server action에서 검증
- `reporter_anon_id` UUID
- `reason` text nullable
- `resolved` bool default false
- `created_at`
- 유니크: `(target_type, target_id, reporter_anon_id)` — 중복 신고 차단
- **`report_count` / `hidden` 갱신은 server action에서 처리** (DB 트리거 X — polymorphic target에 대한 cross-table update는 server-side가 명확)

## user_deck_stats

- `anon_id` UUID, `deck_id` text
- `best_challenge_score` int default 0
- `total_clears` int default 0 — 만점 클리어 횟수
- `current_daily_streak` int default 0
- `last_played_at`
- PK: `(anon_id, deck_id)`
- **본인에게만 SELECT** (RLS) — 공개 노출 금지

## RLS 요약

- 쓰기 대부분: server actions에서 service_role + 자체 인증 검증
- SELECT 공개:
  - `decks` (where `hidden = false`)
  - `likes`
- SELECT 본인: `daily_rounds`, `challenge_runs`, `user_deck_stats` — `auth.uid() = anon_id`
- **`comments`는 클라이언트 direct SELECT 금지** — 게이트가 `reader.local_today` + DailyRound 상태 + thread_date 조합 판정이라 RLS로 표현 어려움. 조회는 **server action / route handler** 통과. RLS는 `hidden = true` 차단 정도 최소 보호만 ([ADR 0007](../adr/0007-comment-solve-gate.md))

## 인덱스 / 성능

- `decks.like_count DESC` partial where `hidden = false` — 좋아요순 정렬
- `decks.created_at DESC` partial where `hidden = false` — 최신순
- Hot score는 materialized view 또는 cron 갱신
- `comments(deck_id, thread_date, created_at DESC)` — 스레드 조회

관련 ADR: 전체 (0001~0016)
