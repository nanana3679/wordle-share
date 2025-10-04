# 페이지 구조 (MVP)

## 필수 페이지

### 1. 메인/랜딩 페이지

- **경로**: `/`
- **기능**: 서비스 소개, 인기/추천 덱 목록, 검색 바, CTA (로그인, 덱 만들기)
- **접근 권한**: 모두

### 2. 인증 페이지

- **경로**: `/login`
- **기능**: Google 소셜 로그인
- **접근 권한**: 비로그인 사용자

- **경로**: `/auth/callback`
- **기능**: OAuth 콜백 처리
- **접근 권한**: 시스템

### 3. 덱 관련 페이지

- **경로**: `/decks`
- **기능**: 덱 탐색 (검색, 필터링, 정렬)
- **접근 권한**: 모두

- **경로**: `/decks/create`
- **기능**: 새 덱 만들기
- **접근 권한**: 로그인 사용자

- **경로**: `/decks/[id]`
- **기능**: 덱 상세 보기 (플레이 시작, 정보 확인, 좋아요)
- **접근 권한**: 모두 (비공개 덱은 소유자만)

- **경로**: `/decks/[id]/edit`
- **기능**: 덱 수정
- **접근 권한**: 소유자만

### 4. 게임 페이지

- **경로**: `/play/[deckId]`
- **기능**: Wordle 게임 플레이
- **접근 권한**: 모두

- **경로**: `/play/[deckId]/result`
- **기능**: 게임 결과 확인 및 공유
- **접근 권한**: 모두

### 5. 사용자 페이지

- **경로**: `/profile`
- **기능**: 내 프로필 (내가 만든 덱, 게임 통계)
- **접근 권한**: 로그인 사용자

- **경로**: `/profile/decks`
- **기능**: 내가 만든 덱 관리
- **접근 권한**: 로그인 사용자

- **경로**: `/profile/history`
- **기능**: 게임 히스토리
- **접근 권한**: 로그인 사용자

### 6. 기타 페이지

- **경로**: `/about`
- **기능**: 서비스 소개
- **접근 권한**: 모두

- **경로**: `/404`
- **기능**: 페이지를 찾을 수 없음
- **접근 권한**: 모두

- **경로**: `/500`
- **기능**: 서버 오류
- **접근 권한**: 모두

## 페이지 구조 트리

```
/
├── (auth)
│   ├── login
│   └── auth/callback
├── decks
│   ├── [id]
│   │   └── edit
│   └── create
├── play/[deckId]
│   └── result
├── profile
│   ├── decks
│   └── history
├── about
├── 404
└── 500
```

## 향후 확장 가능 페이지 (Phase 3-4)

- `/decks/trending` - 트렌딩 덱
- `/decks/popular` - 인기 덱
- `/collections/[category]` - 카테고리별 덱 모음
- `/users/[id]` - 다른 사용자 프로필
- `/settings` - 계정 설정

## 페이지별 주요 컴포넌트

### `/` (메인)

- HeroSection
- PopularDecks
- SearchBar
- CTAButtons

### `/decks` (탐색)

- DeckGrid
- SearchFilters
- SortOptions
- Pagination

### `/decks/[id]` (상세)

- DeckInfo
- PlayButton
- LikeButton
- ShareButton
- WordList

### `/play/[deckId]` (게임)

- GameBoard
- Keyboard
- GameStats
- GuessHistory

### `/profile` (프로필)

- UserInfo
- DeckList
- GameStats
- HistoryTimeline
