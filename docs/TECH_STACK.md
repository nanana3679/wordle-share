# 기술 스택

## 프론트엔드

- **프레임워크**: Next.js
- **언어**: TypeScript
- **UI 라이브러리**: shadcn/ui
- **스타일링**: Tailwind CSS
- **상태관리**: React hooks (useState, useEffect)
- **데이터 페칭 & 캐싱**: React Query (TanStack Query)
  - 덱 데이터 캐싱 (변경 빈도 낮음)
  - 검색 결과 캐싱
  - Optimistic updates (좋아요 기능)
  - Supabase 실시간 구독 연동

## 백엔드

- **데이터베이스**: Supabase
- **인증**: Supabase Auth
  - 소셜 로그인 (Google, GitHub)
  - JWT 토큰 기반 세션 관리
- **API**: Supabase API

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
