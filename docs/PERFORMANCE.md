# 성능 최적화 전략

## 성능 목표

### Core Web Vitals
- LCP < 2.5s
- FID < 100ms
- CLS < 0.1

### 번들 크기
- 초기 JS: < 200KB
- 초기 CSS: < 15KB
- 라우트별 JS: < 50KB

### 네트워크
- API 응답 (p50): < 100ms
- API 응답 (p95): < 200ms
- 캐시 히트율: > 70%

## Code Splitting
- **라우트 자동 분리**: Next.js App Router
- **동적 Import**: lazy() + Suspense로 게임 컴포넌트 분리
- **라이브러리 분리**: lodash 개별 import, file-saver 동적 import

## 이미지 최적화
- **Next.js Image**: lazy loading, blur placeholder, 반응형 sizes
- **Supabase Transform**: WebP 변환, 리사이징 (600x400, quality 80)
- **블러 해시**: plaiceholder로 저화질 미리보기 생성

## React 최적화
- **memo**: Props 변경 시만 리렌더링
- **useCallback**: 함수 참조 유지
- **useMemo**: 계산 결과 메모이제이션
- **상태 분리**: 큰 객체 → 개별 상태로 분리

## DB 쿼리 최적화
- **N+1 방지**: JOIN으로 한 번에 조회
- **필요한 컬럼만**: select('id, name, ...')
- **인덱스**: is_public, created_at, deck_id
- **페이지네이션**: range(from, to)

## 캐싱 전략
- **React Query**: staleTime 5분, cacheTime 10분
- **Next.js**: revalidate 300초
- **HTTP**: Cache-Control 31536000 (1년)
- **무효화**: revalidatePath, invalidateQueries

## 성능 측정
- **Lighthouse CI**: GitHub Actions 자동화
- **Vercel Analytics**: Web Vitals 실시간 측정
- **React Query DevTools**: 캐시 상태 확인
- **Bundle Analyzer**: 번들 크기 시각화
