# 기술 스택

## 프론트엔드

- **프레임워크**: Next.js
- **언어**: TypeScript
- **UI 라이브러리**: shadcn/ui
- **스타일링**: Tailwind CSS
- **상태관리**: React hooks (useState, useEffect)
- **데이터 페칭 & 캐싱**: React Query (TanStack Query)
  - 덱/피드 데이터 캐싱
  - 검색 결과 캐싱
  - Optimistic updates (좋아요 / 추측 제출)
- **i18n**: next-intl (ko/en/ja)

## 백엔드

- **데이터베이스**: Supabase Postgres
- **인증**: **Supabase Anonymous Auth만 사용** — 첫 방문 시 자동 익명 세션
  - 자원 단위 인증은 nick+pw bcrypt (`auth.users`와 별개 layer)
  - **OAuth 관련 route/provider/UI는 MVP에서 모두 제거**. Supabase Anonymous Auth라 기술적으로 향후 OAuth 업그레이드는 가능하지만 제품 기능으로 제공하지 않음 ([IDENTITY_MODEL](./IDENTITY_MODEL.md), [ADR 0001](../adr/0001-anon-auth-and-nick-pw-identity.md))
- **API**: Next.js Server Actions + Route Handlers
  - 쓰기는 server actions에서 service_role + 자체 인증 검증
  - RLS는 단순 SELECT 룰만

## 배포

- **플랫폼**: Vercel

## 테스트

- **단위/컴포넌트 테스트**: Vitest + React Testing Library
  - 유틸리티 함수 및 로직 테스트
  - React 컴포넌트 테스트
  - shadcn/ui 컴포넌트 통합
  - TypeScript 네이티브 지원
- **E2E 테스트**: Playwright
  - 실제 브라우저 환경 테스트
  - 사용자 시나리오 검증 (로그인, 덱 CRUD, 게임 플레이)
  - 크로스 브라우저 지원
  - 병렬 실행
- **API/서버 액션 테스트**: Vitest
  - Supabase 클라이언트 모킹
  - 서버 사이드 로직 검증
