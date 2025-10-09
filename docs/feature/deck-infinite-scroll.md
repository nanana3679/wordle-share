# 덱 목록 무한 스크롤

## 구현 과정

### 1단계: 페이지네이션 구현
- `getDecks(page, pageSize)` 서버 액션에 페이지네이션 로직 추가
- Supabase `.range()`로 24개씩 데이터 조회
- Pagination UI 컴포넌트 추가 (shadcn)
- URL 쿼리 파라미터로 페이지 상태 관리

### 2단계: 무한 스크롤로 전환
- React Query의 `useInfiniteQuery` 활용
- Intersection Observer API로 스크롤 감지
- 기존 `getDecks` 서버 액션 재사용
- 페이지별 데이터 자동 누적

### 3단계: 문제 해결
**문제**: React key 중복 경고 발생
```
Encountered two children with the same key
```

**원인**: 여러 페이지를 `flatMap`으로 병합 시 중복 덱 발생

**해결**: Map을 사용한 중복 제거 로직 추가
```typescript
const allDecks = (() => {
  const decksMap = new Map();
  data?.pages.forEach(page => {
    page.data?.forEach(deck => {
      if (!decksMap.has(deck.id)) {
        decksMap.set(deck.id, deck);
      }
    });
  });
  return Array.from(decksMap.values());
})();
```

## 라우트

### `/demo/decks`
- **쿼리 파라미터**: 없음
- **설명**: 덱 목록을 무한 스크롤 방식으로 표시. 페이지당 24개씩 자동 로드
- **동작**: 사용자가 페이지 하단에 도달하면 자동으로 다음 페이지 로드

## 스키마

### InfiniteQuery 응답 타입
```typescript
{
  pages: Array<{
    success: boolean;
    data: Deck[];
    message: string;
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }>;
  pageParams: number[];
}
```

## 서비스 함수

### `getDecks(page, pageSize)`
**위치**: `app/actions/deck.ts`

**파라미터**:
- `page: number` - 요청할 페이지 번호 (기본값: 1)
- `pageSize: number` - 페이지당 덱 개수 (기본값: 24)

**동작**:
1. Supabase에서 전체 덱 개수 조회 (`count`)
2. `offset`과 `limit` 계산하여 해당 페이지의 덱만 조회
3. 페이지네이션 메타데이터와 함께 반환

**사용**: 무한 스크롤과 페이지네이션 모두에서 사용 가능

## 훅 (Hooks)

### `useInfiniteDecks(pageSize)`
**위치**: `hooks/useInfiniteDecks.ts`

**기능**:
- React Query의 `useInfiniteQuery` 활용
- 페이지별 데이터 자동 누적 관리
- 다음 페이지 존재 여부 계산
- 캐싱 및 자동 재시도

**반환값**:
```typescript
{
  data: { pages, pageParams },
  fetchNextPage: () => void,
  hasNextPage: boolean,
  isFetchingNextPage: boolean,
  isLoading: boolean,
  isError: boolean,
  error: Error | null
}
```

### `useIntersectionObserver(callback, options)`
**위치**: `hooks/useIntersectionObserver.ts`

**기능**:
- Intersection Observer API를 훅으로 래핑
- 특정 요소가 viewport에 보이면 콜백 실행
- 무한 스크롤 트리거로 사용

**파라미터**:
- `callback: () => void` - 요소가 보일 때 실행할 함수
- `options?: IntersectionObserverInit` - Intersection Observer 옵션

**반환값**:
- `elementRef: RefObject<HTMLDivElement>` - 관찰할 요소에 연결할 ref

## 컴포넌트

### `DecksContentInfinite`
**위치**: `components/decks/DecksContentInfinite.tsx`

**Props**: 없음 (모든 데이터를 클라이언트에서 fetch)

**기능**:
- `useInfiniteDecks`로 데이터 관리
- `useIntersectionObserver`로 스크롤 감지
- 모든 페이지의 덱을 flatMap으로 병합하여 표시
- 검색/필터는 로드된 모든 데이터에 대해 작동
- 로딩 인디케이터 표시 (초기 로딩 및 페이지 로딩)
- "모든 덱을 불러왔습니다" 메시지 표시

**상태 관리**:
- `searchTerm`: 검색어
- `filterPublic`: 공개/비공개 필터

## 구현 특징

### 1. 자동 로딩
- 사용자가 페이지 하단 근처(threshold: 0.1)에 도달하면 자동으로 다음 페이지 로드
- 중복 로딩 방지 (`hasNextPage && !isFetchingNextPage` 체크)

### 2. 데이터 관리
- React Query의 강력한 캐싱 기능 활용
- 페이지별 데이터를 메모리에 유지
- 자동 재시도 및 에러 처리

### 3. UX 개선
- 페이지 전환 없이 연속적인 탐색
- 모바일 친화적인 인터페이스
- 로딩 상태 명확한 표시
- 마지막 페이지 도달 시 안내 메시지

### 4. 검색/필터링
- 클라이언트 사이드에서 로드된 모든 데이터에 대해 작동
- 실시간 검색/필터링 (서버 요청 없음)

### 5. 성능 최적화
- 24개씩 로드로 초기 로딩 속도 유지
- Intersection Observer로 효율적인 스크롤 감지
- React Query 캐싱으로 불필요한 재요청 방지

## 페이지네이션 vs 무한 스크롤

### 무한 스크롤 장점
- 더 나은 UX (끊김 없는 탐색)
- 모바일 친화적
- React Query 캐싱 기능 활용
- 자동 재시도 및 에러 처리

### 무한 스크롤 단점
- URL에 페이지 상태 미저장 (북마크 불가)
- SEO가 페이지네이션보다 약간 불리
- 특정 페이지로 직접 이동 불가

## 기존 코드와의 관계

- `getDecks` 서버 액션은 동일하게 사용
- `DecksContent` 컴포넌트는 유지 (필요시 페이지네이션으로 전환 가능)
- 두 방식 모두 24개씩 로드하여 일관성 유지

## 구현 결과

### 생성된 파일
1. `hooks/useIntersectionObserver.ts` - 스크롤 감지 훅 (25줄)
2. `hooks/useInfiniteDecks.ts` - 무한 스크롤 데이터 관리 훅 (15줄)
3. `components/decks/DecksContentInfinite.tsx` - 무한 스크롤 UI (140줄)
4. `docs/feature/deck-infinite-scroll.md` - 기능 문서

### 수정된 파일
1. `app/demo/decks/page.tsx` - 무한 스크롤 컴포넌트 사용 (16줄 → 15줄)
2. `app/actions/deck.ts` - 페이지네이션 로직 추가 (55줄 → 76줄)

### 주요 개선 사항
- 페이지 이동 없이 연속적인 덱 탐색 가능
- 스크롤 시 자동으로 다음 페이지 로드 (threshold: 0.1)
- React Query 캐싱으로 성능 최적화
- 중복 데이터 제거 로직으로 key 중복 문제 해결
- 로딩 인디케이터 및 완료 메시지 표시
- 에러 처리 및 빈 상태 처리

### 성능 지표
- 초기 로딩: 24개 덱 (1 페이지)
- 추가 로딩: 스크롤 시 24개씩 자동 로드
- 메모리 효율: Map 기반 중복 제거로 메모리 사용 최적화
- 네트워크: React Query 캐싱으로 불필요한 재요청 방지

### 사용자 경험
- 모바일/데스크톱 모두 자연스러운 스크롤 경험
- 검색/필터링은 로드된 모든 덱에 대해 즉시 작동
- 마지막 페이지 도달 시 명확한 안내 메시지

