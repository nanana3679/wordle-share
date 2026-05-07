# 코딩 규칙 및 표준

## TypeScript 규칙
- **strict 모드**: 암묵적 any 금지
- **Interface 우선**: 확장 가능성 고려
- **Type**: 유니온/인터섹션에 사용
- **Generic**: 재사용 가능한 함수에 활용
- **타입 가드**: `is` 키워드로 런타임 검증

## React/Next.js 규칙
- **함수형 컴포넌트**: 클래스 컴포넌트 사용 금지
- **Server Component**: 기본, 데이터 페칭/백엔드 접근
- **Client Component**: 'use client', 인터랙티브/브라우저 API
- **서버 액션**: 'use server', 검증 → DB 작업 → 캐시 재검증

## Lint 및 포맷팅
- **ESLint 9**: Flat Config, next/core-web-vitals, next/typescript
- **Prettier**: requirePragma false, insertPragma false
- **명령어**: `npm run lint`, `npm run lint -- --fix`

## 네이밍 컨벤션
- **파일명**: kebab-case (deck-card.tsx)
- **변수/함수**: camelCase (getDeckById)
- **컴포넌트/타입**: PascalCase (DeckCard, DeckData)
- **상수**: UPPER_SNAKE_CASE (MAX_WORD_LENGTH)
- **Boolean props**: is/has/can 접두사 (isGameOver)
- **Event handler**: on/handle 접두사 (onClick, handleClick)

## 파일 구조
```
wordle-share/
├── app/           # Next.js App Router
├── components/    # React 컴포넌트 (ui/, decks/, game/)
├── lib/          # 유틸리티
├── types/        # 타입 정의
├── actions/      # Server Actions
├── hooks/        # Custom Hooks
└── tests/        # 테스트
```

## Import 순서
1. React/Next.js
2. 외부 라이브러리
3. 절대 경로 (@/)
4. 상대 경로

## Supabase 사용 규칙
- **Server용**: createSupabaseServer() with cookies
- **Client용**: createSupabaseClient()
- **타입 안전**: Database 타입 import
- **에러 처리**: 서버 액션에서 try-catch 또는 error 체크

## PR 전 체크리스트
- [ ] `npm run lint` 통과
- [ ] `npm run build` 성공
- [ ] 타입 에러 없음
- [ ] Props 타입 정의
- [ ] 서버 액션 에러 처리
- [ ] console.log 제거
