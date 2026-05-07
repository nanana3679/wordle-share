# 문서 인덱스

신규 기획(Shared Word Deck — IP 기반 워들) 문서.
용어집은 [CONTEXT.md](../CONTEXT.md) (root). 결정 근거는 [adr/README.md](./adr/README.md).

## 최상위

- [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) — 프로젝트 컨셉·MVP 정의 (rewrite 예정)
- [DESIGN_PRINCIPLES.md](./DESIGN_PRINCIPLES.md) — 9개 파생 디자인 원칙

## product/ — 사용자 관점

- [GAME_MECHANICS.md](./product/GAME_MECHANICS.md) — 데일리/챌린지 메커닉, 시드, 게이트
- FEATURES.md (rewrite 예정)
- PAGE_STRUCTURE.md (rewrite 예정)

## architecture/ — 기술 구조

- [IDENTITY_MODEL.md](./architecture/IDENTITY_MODEL.md) — Supabase Anon Auth + nick/pw + IP hash
- DATABASE_SCHEMA.md (rewrite 예정)
- TECH_STACK.md (existing, OAuth 항목 제거 필요)

## domain/ — 도메인 규칙

- [COMMENT_SYSTEM.md](./domain/COMMENT_SYSTEM.md) — (deck, date) thread, 풀이 게이트
- [LIKE_SYSTEM.md](./domain/LIKE_SYSTEM.md) — IP 식별, 낙관적 UI, 위협 모델
- [FEED_AND_SEARCH.md](./domain/FEED_AND_SEARCH.md) — Hot/좋아요순/최신순 + 검색
- [MODERATION.md](./domain/MODERATION.md) — 신고 + 자동 가림 + 운영자 검토

## platform/ — 플랫폼/품질

- [SEO.md](./platform/SEO.md) — SSR/슬러그/sitemap/OG
- ACCESSIBILITY.md (existing, 이동 예정)
- PERFORMANCE.md (existing, 이동 예정)
- ERROR_HANDLING.md (existing, 이동 예정)
- TEST_STRATEGY.md (existing, 이동 예정)

## operations/ — 운영

- [OPERATOR_SEED_TOOL.md](./operations/OPERATOR_SEED_TOOL.md) — 내부 시드 스크립트 정책
- AI_DECK_GENERATION_PIPELINE.md (existing feature/, 이동 예정)
- ACTION_WITH_TOAST_EXAMPLES.md (existing, 이동 예정)

## engineering/ — 개발 가이드

- CODING_STANDARDS.md (existing, 이동 예정)
- CONTRIBUTING.md (existing, 이동 예정)

## adr/ — 결정 기록

- [README.md](./adr/README.md) — ADR 인덱스 (0001~0016)

## issue/ — 이슈/마이그레이션 기록

- [redesign-migration.md](./issue/redesign-migration.md) — 신규 기획 마이그레이션 계획

## todo.md (V2 처리)

GitHub 이슈 트래커로 이전 예정. `to-issues` 스킬로 Phase 0~8 작업을 슬라이스 이슈로 변환.
