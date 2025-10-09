# 덱 목록 페이지네이션

## 라우트

### `/demo/decks`
- **쿼리 파라미터**: `page` (선택, 기본값: 1)
- **설명**: 덱 목록을 페이지당 24개씩 표시
- **예시**: 
  - `/demo/decks` - 첫 번째 페이지
  - `/demo/decks?page=2` - 두 번째 페이지

## 스키마

### Pagination 응답 타입
```typescript
ActionResponse<Deck[]> & {
  total?: number;      // 전체 덱 개수
  page?: number;       // 현재 페이지 번호
  pageSize?: number;   // 페이지당 덱 개수 (24)
  totalPages?: number; // 전체 페이지 수
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

**반환**:
```typescript
{
  success: true,
  data: Deck[],
  message: string,
  total: number,
  page: number,
  pageSize: number,
  totalPages: number
}
```

## 컴포넌트

### `DecksContent`
**위치**: `components/decks/DecksContent.tsx`

**Props**:
- `initialDecks: Deck[]` - 현재 페이지의 덱 목록
- `total: number` - 전체 덱 개수
- `currentPage: number` - 현재 페이지 번호
- `totalPages: number` - 전체 페이지 수

**기능**:
- 덱 목록을 그리드로 표시 (2/3/4열, 화면 크기에 따라)
- 페이지네이션 UI 렌더링 (1페이지 초과 시)
- 페이지 이동 시 URL 쿼리 파라미터 업데이트
- 검색/필터는 클라이언트 사이드에서 현재 페이지 내에서만 작동

## 구현 특징

1. **서버 사이드 페이지네이션**: 
   - 대량 데이터 처리에 효율적
   - 초기 로딩 속도 향상
   
2. **24개씩 표시**:
   - 2, 3, 4의 공배수로 모든 화면 크기에서 깔끔한 레이아웃
   
3. **URL 쿼리 파라미터**:
   - 북마크 가능
   - 브라우저 뒤로가기/앞으로가기 지원
   - SEO 친화적

4. **스마트 페이지 번호 표시**:
   - 현재 페이지 주변 ±1 페이지만 표시
   - 첫 페이지와 마지막 페이지는 항상 표시
   - 생략된 페이지는 `...`로 표시

## 구현 결과

### 설치된 패키지
- `shadcn pagination` - 페이지네이션 UI 컴포넌트

### 수정된 파일
1. `app/actions/deck.ts` - getDecks 함수에 페이지네이션 로직 추가
   - 전체 개수 조회 쿼리 추가
   - `.range(offset, offset + pageSize - 1)` 적용
   - 반환 타입에 페이지네이션 메타데이터 추가

2. `app/demo/decks/page.tsx` - searchParams로 페이지 번호 처리
   - URL 쿼리 파라미터에서 page 추출
   - getDecks(page) 호출 및 메타데이터 전달

3. `components/decks/DecksContent.tsx` - Pagination UI 추가
   - shadcn Pagination 컴포넌트 통합
   - 이전/다음 버튼 비활성화 처리
   - 스마트 페이지 번호 표시 로직

### 특징
- SEO 최적화 (URL에 페이지 정보 포함)
- 북마크 가능
- 브라우저 히스토리 지원
- 24개씩 로드 (2/3/4의 공배수)
- 서버 사이드 렌더링

### 참고
이후 **무한 스크롤**로 전환되었습니다. 자세한 내용은 `deck-infinite-scroll.md` 참조
- 페이지네이션 방식은 `DecksContent` 컴포넌트에 보존됨
- 필요시 언제든 페이지네이션으로 전환 가능

