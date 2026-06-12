# 문서 인덱스

신규 기획(Shared Word Deck — IP 기반 워들) 문서.
용어집은 [CONTEXT.md](../CONTEXT.md) (root). 결정 근거는 [adr/README.md](./adr/README.md).

## 최상위

- [PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md) — 프로젝트 컨셉·MVP 정의
- [DESIGN_PRINCIPLES.md](./DESIGN_PRINCIPLES.md) — 9개 파생 디자인 원칙

## product/ — 사용자 관점

- [GAME_MECHANICS.md](./product/GAME_MECHANICS.md) — 데일리/챌린지 메커닉, 시드, 게이트
- [FEATURES.md](./product/FEATURES.md) — 9개 주요 기능 + 도메인 문서 cross-link
- [PAGE_STRUCTURE.md](./product/PAGE_STRUCTURE.md) — URL 트리, 페이지별 컴포넌트, 진입 플로우

## architecture/ — 기술 구조

- [IDENTITY_MODEL.md](./architecture/IDENTITY_MODEL.md) — Supabase Anon Auth + nick/pw + IP hash
- [DATABASE_SCHEMA.md](./architecture/DATABASE_SCHEMA.md) — 9개 테이블 + RLS + 인덱스
- [TECH_STACK.md](./architecture/TECH_STACK.md) — Next.js / Supabase / shadcn / React Query

## domain/ — 도메인 규칙

- [COMMENT_SYSTEM.md](./domain/COMMENT_SYSTEM.md) — (deck, date) thread, 풀이 게이트
- [LIKE_SYSTEM.md](./domain/LIKE_SYSTEM.md) — IP 식별, 낙관적 UI, 위협 모델
- [FEED_AND_SEARCH.md](./domain/FEED_AND_SEARCH.md) — Hot/좋아요순/최신순 + 검색
- [MODERATION.md](./domain/MODERATION.md) — 신고 + 자동 가림 + 운영자 검토

## platform/ — 플랫폼/품질

- [SEO.md](./platform/SEO.md) — SSR/슬러그/sitemap/OG
- [ACCESSIBILITY.md](./platform/ACCESSIBILITY.md)
- [PERFORMANCE.md](./platform/PERFORMANCE.md)
- [ERROR_HANDLING.md](./platform/ERROR_HANDLING.md)
- [TEST_STRATEGY.md](./platform/TEST_STRATEGY.md)
- [METADATA_OG_OPTIMIZATION.md](./platform/METADATA_OG_OPTIMIZATION.md) — SEO.md의 구현 디테일

## operations/ — 운영

- [OPERATOR_SEED_TOOL.md](./operations/OPERATOR_SEED_TOOL.md) — 내부 시드 스크립트 정책
- [AI_DECK_GENERATION_PIPELINE.md](./operations/AI_DECK_GENERATION_PIPELINE.md)

## engineering/ — 개발 가이드

- [CODING_STANDARDS.md](./engineering/CODING_STANDARDS.md)
- [CONTRIBUTING.md](./engineering/CONTRIBUTING.md)
- [ACTION_WITH_TOAST_EXAMPLES.md](./engineering/ACTION_WITH_TOAST_EXAMPLES.md)
- [APPBAR_LAYOUT_STRUCTURE.md](./engineering/APPBAR_LAYOUT_STRUCTURE.md)
- [ERROR_BOUNDARY_ASYNC_HANDLING.md](./engineering/ERROR_BOUNDARY_ASYNC_HANDLING.md)

## adr/ — 결정 기록

- [README.md](./adr/README.md) — ADR 인덱스 (0001~0016)

## issue/ — 이슈/마이그레이션 기록

- [redesign-migration.md](./issue/redesign-migration.md) — 신규 기획 마이그레이션 계획
