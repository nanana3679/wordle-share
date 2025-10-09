# generateMetadata 및 Open Graph 최적화

## 라우트

### 1. 덱 상세 페이지 메타데이터
- **경로**: `app/demo/decks/[id]/page.tsx`
- **함수**: `generateMetadata`
- **목적**: 덱 상세 페이지의 동적 메타데이터 생성 및 SNS 공유 최적화

### 2. OG 이미지 생성 API
- **경로**: `app/api/og/route.tsx`
- **메서드**: `GET`
- **목적**: 동적 Open Graph 이미지 생성 (1200x630)
- **파라미터**:
  - `title`: 덱 이름
  - `words`: 단어 개수
  - `description`: 설명 (선택)

## 스키마

### Metadata 구조
```typescript
{
  title: string;           // 페이지 제목
  description: string;     // 페이지 설명
  openGraph: {
    title: string;
    description: string;
    url: string;          // 정규 URL
    siteName: string;
    images: [{
      url: string;        // OG 이미지 URL
      width: 1200;
      height: 630;
      alt: string;
    }];
    locale: "ko_KR";
    type: "website";
  };
  twitter: {
    card: "summary_large_image";
    title: string;
    description: string;
    images: string[];
  };
  alternates: {
    canonical: string;    // 정규 URL
  };
}
```

### OG 이미지 쿼리 파라미터
```typescript
{
  title: string;          // 덱 이름 (인코딩 필요)
  words: string;          // 단어 개수
  description?: string;   // 설명 (선택)
}
```

## 서비스 함수

### generateMetadata (app/demo/decks/[id]/page.tsx)
```typescript
export async function generateMetadata({ params }: DeckPageProps): Promise<Metadata>
```

**동작 과정**:
1. `getDeck(id)`로 덱 정보 조회
2. 덱이 없으면 `notFound()` 호출
3. 환경 변수에서 사이트 URL 가져오기
4. 덱 설명 생성 (기본값 또는 커스텀)
5. OG 이미지 URL 결정:
   - 썸네일이 있으면 `deck.thumbnail_url` 사용
   - 없으면 동적 생성 API 사용: `/api/og?title=...&words=...`
6. Open Graph, Twitter Card, canonical URL 메타데이터 반환

**주요 기능**:
- 동적 제목/설명 생성
- 썸네일 fallback 처리
- SNS 공유 최적화 (Open Graph, Twitter Card)
- SEO 최적화 (canonical URL, locale)

### OG 이미지 생성 API (app/api/og/route.tsx)
```typescript
export async function GET(request: Request): Promise<ImageResponse>
```

**동작 과정**:
1. URL 쿼리 파라미터에서 `title`, `words`, `description` 추출
2. Next.js `ImageResponse`로 1200x630 이미지 생성
3. Edge Runtime에서 실행하여 빠른 응답 속도 보장

**디자인 요소**:
- 다크 그라데이션 배경 (#0f172a → #1e293b)
- 파란색 강조 컬러 (#3b82f6)
- W 로고 아이콘
- 덱 제목 (64px, bold)
- 설명 텍스트 (32px, 선택)
- 단어 개수 배지
- 하단 브랜딩 (wordledecks + CTA)

**성능 최적화**:
- Edge Runtime 사용
- 정적 스타일로 빠른 렌더링
- 에러 핸들링 (500 응답)

## 환경 변수

```bash
NEXT_PUBLIC_SITE_URL=https://yourdomain.com  # 프로덕션 URL
```

## 사용 예시

### 1. 덱 페이지 접근 시 자동 메타데이터 생성
```
https://yourdomain.com/demo/decks/deck-id
```
→ 해당 덱의 정보로 메타데이터 자동 생성

### 2. OG 이미지 직접 생성
```
https://yourdomain.com/api/og?title=영어%20단어&words=50
```
→ 1200x630 PNG 이미지 반환

## SEO 최적화 항목

- 동적 제목 생성 (`{덱 이름} - Wordle Deck`)
- 의미있는 설명 (단어 개수 포함)
- Open Graph 프로토콜 완전 지원
- Twitter Card (Large Image) 지원
- Canonical URL 설정
- 한국어 locale 설정
- 고품질 OG 이미지 (1200x630)
- Alt 텍스트 제공

## 참고 사항

- OG 이미지는 Edge Runtime에서 실행되어 전 세계 어디서나 빠른 응답
- 썸네일이 없는 덱은 자동으로 동적 OG 이미지 생성
- 모든 메타데이터는 서버 사이드에서 생성되어 크롤러에서 완전히 인식 가능


