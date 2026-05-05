# IP 워들 재설계 마이그레이션

기존 "Wordle 덱 공유 사이트"에서 **Shared Word Deck (IP 기반 워들)**로 전환.
운영 데이터 없음 → greenfield 가정. Supabase auth 의존 제거.

## 충돌 매트릭스

| 영역 | 현재 | 신규 | 액션 |
|---|---|---|---|
| 신원 | Supabase Anonymous Auth + 덱별 nick/pw | 디바이스 UUID + 단일 (nick, pw) | REPLACE |
| OAuth | Google OAuth 콜백 와이어링 | 사회 로그인 안 함 | DELETE |
| decks | creator_id FK, is_public, thumbnail, description, categories[] | creator_nick·pw_hash, script, like_count, hidden, report_count, version | MODIFY |
| words | JSONB[] 컬럼 | 별도 테이블 + 영구 ID + active(soft-delete) | REPLACE |
| likes | (deck_id, user_id) PK | (deck_id, ip_hash) PK | REPLACE |
| 게임 모드 | 단일 자유 플레이 | 데일리 + 챌린지 (잠금/게이트) | REWRITE |
| 댓글 | 없음 | (deck_id, date) 단위 + 풀이 게이트 | NEW |
| 신고/모더레이션 | 없음 | 신고 + 자동 임시 가림 | NEW |
| 메인 피드 | 무한 스크롤 단일 | Hot/좋아요순/최신순 3탭 + 검색 | MODIFY |
| 라우트 | /demo/* 프리픽스 | /, /d/[id], /d/[id]/play, /search | MOVE |
| storage | deck-thumbnails 버킷 | 썸네일 제거, OG는 동적 라우트 | DELETE |
| 상태 일관성 | 낙관적 락 없음 | expected_version 동봉 | NEW |
| i18n | next-intl ko/en/ja | 유지 | KEEP |

## 마이그레이션 전략

- **Greenfield**: 기존 테이블 DROP 후 신규 스키마 생성. 데이터 이행 없음
- Supabase Postgres + service_role 패턴은 유지, auth.users 의존만 끊음
- RLS는 SELECT 공개 + 자기 anon_id 가시성 수준으로 단순화. 쓰기는 server actions에서 service_role

## Phase 단위 실행

- **Phase 0** — 신규 기획서 9개 + ADR 추가, 폐기 대상 확정
- **Phase 1** — auth/OAuth/middleware 세션 갱신·관련 컴포넌트 삭제
- **Phase 2** — Supabase 마이그레이션 1개로 신규 9개 테이블 + 트리거(좋아요 캐시·자동 가림)
- **Phase 3** — `lib/`: identity, daily 시드, challenge 셔플, optimistic lock, ip hash
- **Phase 4** — 라우트 트리 재구성 (`/demo/*` 폐기, `/d/[id]`·`/search`·`/sitemap`·`/robots`)
- **Phase 5** — 컴포넌트 재작성 (FeedTabs, DailyGame/ChallengeGame, DeckDetail, CommentThread, DeckForm, ResultCopy, ReportButton)
- **Phase 6** — `scripts/ai/` 운영자 시드 도구 (propose-topics + generate-decks)
- **Phase 7** — SEO (SSR, OG, sitemap, slug canonical)
- **Phase 8** — 미사용 deps 정리, 문서 최종 동기화, e2e 스모크

## PR 분할

1. Phase 0 문서 + Phase 1 삭제
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

- `adr/0001-use-ip-device-identity.md`
- `adr/0002-no-public-user-leaderboard.md`
- `adr/0003-content-likes-vs-user-scores-threat-model.md`
- `adr/0004-use-operator-seed-decks.md`
- `adr/0005-use-ssr-public-deck-pages.md`
- `adr/0006-use-report-based-moderation.md`
