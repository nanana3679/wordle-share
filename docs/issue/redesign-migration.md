# IP 워들 재설계 마이그레이션

기존 "Wordle 덱 공유 사이트"에서 **Shared Word Deck (IP 기반 워들)**로 전환.
운영 데이터 없음 → greenfield 가정. Supabase Anonymous Auth는 유지, OAuth만 제거.

> **마이그레이션 완료 (2026-06, T0~T10)**: 아래 Phase 0~8이 T-트랙(T0~T9 + T10 정리)으로 전부 구현·머지됨. 테스트 187개+ 통과가 기준선. 본 문서는 사후 기록이며, 구현 과정에서 ADR과 달라진 부분은 각 ADR의 "구현 노트 (사후 정합)" 및 본 문서의 "구현 차이 (사후 정합)" 섹션에 정리. 단, **라이브 DB 검증은 Supabase 프로젝트 복구 후 보류** (마이그레이션 6개 미적용 상태).

## 충돌 매트릭스

| 영역 | 현재 | 신규 | 액션 |
|---|---|---|---|
| 솔브/댓글 신원 | Supabase Anonymous Auth (`auth.uid`) + 덱별 nick/pw | 동일 `auth.uid` + **단일** (nick, pw) — 덱·댓글 통합 | MODIFY |
| 좋아요 신원 | (deck_id, user_id) PK | (deck_id, ip_hash) PK | REPLACE |
| OAuth | Google OAuth 콜백 와이어링 | 사회 로그인 안 함 | DELETE |
| decks | creator_id FK, is_public, thumbnail, description, categories[] | creator_nick·pw_hash, script, like_count, hidden, report_count | MODIFY |
| words | jsonb 컬럼 (배열 저장) | 별도 테이블 + 영구 ID + active(soft-delete) | REPLACE |
| 게임 모드 | 단일 자유 플레이 | 데일리 + 챌린지 (잠금/게이트) | REWRITE |
| 댓글 | 없음 | (deck_id, date) 단위 + 풀이 게이트 | NEW |
| 신고/모더레이션 | 없음 | 신고 + 자동 임시 가림 | NEW |
| 메인 피드 | 무한 스크롤 단일 | Hot/좋아요순/최신순 3탭 + 검색 | MODIFY |
| 라우트 | /demo/* 프리픽스 | /, /d/[id], /d/[id]/play, /search | MOVE |
| storage | deck-thumbnails 버킷 | 썸네일 제거, OG는 동적 라우트 | DELETE |
| 상태 일관성 | 낙관적 락 없음 | expected_version 동봉 | NEW |
| i18n | next-intl ko/en/ja | 유지 | KEEP |

## 마이그레이션 전략

- **Greenfield**: 기존 도메인 테이블 DROP 후 신규 스키마 생성. 데이터 이행 없음
- **Supabase Anonymous Auth 유지** — `auth.uid()`가 디바이스 식별 역할 (`anon_id`). 익명 세션은 **첫 쓰기/플레이 시점에 lazy 발급** (구현 차이 참고)
- nick+pw는 자원 단위 인증(덱 수정·댓글 작성·삭제). localStorage에 캐시
- OAuth(`/auth/callback`, Google provider 설정)는 제거. 미들웨어는 기존 익명 세션 refresh만 수행 (발급은 server action에서)
- RLS는 SELECT 공개 + 자기 `auth.uid()` 가시성 수준으로 단순화. 쓰기는 server actions에서 service_role

## Phase 단위 실행

전 Phase ✅ 완료 (T-트랙 매핑 병기).

- ✅ **Phase 0** — 신규 기획서 + ADR 추가, 폐기 대상 확정
- ✅ **Phase 1** — OAuth 콜백/Google provider/관련 컴포넌트 삭제. 익명 세션 미들웨어는 유지(refresh)
- ✅ **Phase 2** (T1~T2) — Supabase 마이그레이션으로 신규 도메인 테이블 + 좋아요 캐시 트리거 (자동 가림은 server action 처리)
- ✅ **Phase 3** (T1~T3) — `lib/`: 단일 nick/pw identity, daily 시드, challenge 셔플, optimistic lock, ip hash
- ✅ **Phase 4** (T7) — 라우트 트리 재구성 (`/demo/*` 폐기, `/d/[id]`·`/search`·`/sitemap`·`/robots`)
- ✅ **Phase 5** (T2~T6) — 컴포넌트 재작성 (FeedTabs, DailyGame/ChallengeGame, DeckDetail, CommentThread, DeckForm, ResultCopy, ReportButton)
- ✅ **Phase 6** (T9) — `scripts/ai/` 운영자 시드 도구 (propose-topics + generate-decks). **일반 API 호출** + `x-bot-token` 게이트
- ✅ **Phase 7** (T8) — SEO (SSR, OG, sitemap, slug canonical)
- ✅ **Phase 8** (T10) — 미사용 deps 정리, 문서 최종 동기화(본 T10b 포함)

## 구현 차이 (사후 정합)

구현 과정에서 ADR/계획과 달라진 핵심 항목. 상세는 각 ADR의 "구현 노트" 참고.

- **익명 세션 lazy 발급** — 미들웨어 자동 발급(계획) → 첫 쓰기/플레이 server action 시점 발급 (`lib/anon-session.ts`, [ADR 0001](../adr/0001-anon-auth-and-nick-pw-identity.md))
- **챌린지/댓글 게이트 = `completed` OR `failed`** — `daily_rounds.status` 3-state(in_progress/completed/failed) 도입으로 "라운드 종료" 판정 통일 ([ADR 0006](../adr/0006-challenge-daily-completion-gate.md), [0007](../adr/0007-comment-solve-gate.md))
- **Hot 정렬 200-row window 근사** — computed score라 DB 정렬 불가 → 최신 200건 fetch 후 서버 정렬 (`lib/hot-score.ts`, `app/actions/feed.ts`, [ADR 0004](../adr/0004-content-likes-vs-user-scores-threat-model.md))
- **봇 시드 `x-bot-token` 게이트** — nick+pw에 더해 `bot_` prefix nick은 `BOT_SEED_TOKEN` 일치 헤더 필수 ([ADR 0011](../adr/0011-operator-seed-via-public-api.md))
- **script enum = `latin`/`hangul`/`kana`** — `roman`/`hiragana` 아님 (식별자 이름만 차이, [ADR 0014](../adr/0014-word-character-set-and-canonical-form.md))

## PR 분할

1. Phase 0 문서 + Phase 1 OAuth 삭제
2. Phase 2 DB + Phase 3 lib (테스트 포함)
3. Phase 4 라우트 + Phase 5 핵심 (덱 상세·데일리)
4. 챌린지 + 댓글 + 좋아요(IP)
5. 메인 피드·검색·SEO
6. 운영자 시드 + 정리

## 보류 / 결정 필요

- 한글/히라가나 피드백 룰 (음절 vs 자모) — MVP는 로마자만 풀이 가능 옵션 검토
- IP hash salt 회전 정책 — salt 고정 권장 (좋아요 무효화 방지)
- 타임존: "클라이언트 로컬 날짜" 기준 데일리 잠금 — 첫 풀이자 기준 단일 word 고정 명세 그대로
- rate limit 수치, 자동 가림 임계치 (덱 5회·댓글 3회 초안)
- 덱 hard delete 시 댓글/풀이 cascade 정책

## 관련 ADR

`docs/adr/README.md` 참고 (0001~0016).
