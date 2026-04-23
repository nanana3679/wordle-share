# 페이지 구조 (MVP)

## 필수 페이지

### 1. 메인/랜딩 페이지

- **경로**: `/`
- **기능**: 서비스 소개, 인기/추천 덱 목록, 검색 바, CTA (로그인, 덱 만들기)
- **접근 권한**: 모두

### 2. 인증 페이지

별도의 로그인 페이지 없음. Supabase Anonymous Auth 세션은 미들웨어/루트 레이아웃에서 자동 발급됩니다. 향후 계정 업그레이드 기능 도입 시 `/auth/upgrade` 를 추가할 예정입니다.

### 3. 덱 관련 페이지

- **경로**: `/decks`
- **기능**: 덱 탐색 (검색, 필터링, 정렬)
- **접근 권한**: 모두

- **경로**: `/decks/create`
- **기능**: 새 덱 만들기 (닉네임 + 비밀번호 입력 포함)
- **접근 권한**: 누구나

- **경로**: `/decks/[id]`
- **기능**: 덱 상세 보기 (플레이 시작, 정보 확인, 좋아요)
- **접근 권한**: 누구나 (비공개 덱은 URL 을 아는 사람만)

- **경로**: `/decks/[id]/edit`
- **기능**: 덱 수정 (비밀번호 검증 후 편집 UI 노출)
- **접근 권한**: 덱 비밀번호를 아는 사람만 (Server Action 에서 해시 검증)

### 4. 게임 페이지

- **경로**: `/play/[deckId]`
- **기능**: Wordle 게임 플레이
- **접근 권한**: 모두

- **경로**: `/play/[deckId]/result`
- **기능**: 게임 결과 확인 및 공유
- **접근 권한**: 모두

### 5. 내 활동 페이지

회원 계정 대신 **브라우저 localStorage + 익명 세션** 기준으로 개인 데이터를 보여줍니다.

- **경로**: `/my/decks`
- **기능**: 내가 만든/편집한 덱 목록 (localStorage 기반 + `creator_session_id` 백업)
- **접근 권한**: 누구나 (각자 브라우저 기준)

- **경로**: `/my/history`
- **기능**: 게임 히스토리 (익명 세션 `auth.uid()` 기준)
- **접근 권한**: 누구나 (각자 세션 기준)

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
├── decks
│   ├── [id]
│   │   └── edit
│   └── create
├── play/[deckId]
│   └── result
├── my
│   ├── decks
│   └── history
├── about
├── 404
└── 500
```

## 향후 확장 가능 페이지 (Phase 3-4)

- `/auth/upgrade` - 익명 세션을 Google/Discord 계정으로 업그레이드
- `/leaderboard` - 전체/덱별 랭킹
- `/decks/daily` - 데일리 챌린지
- `/decks/trending` - 트렌딩 덱
- `/collections/[category]` - 카테고리별 덱 모음

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

### `/my/decks` (내 덱)

- MyDeckList (localStorage + creator_session_id 기반)
- EmptyState (첫 방문자용 안내)

### `/my/history` (내 기록)

- GameStats (익명 세션 기준)
- HistoryTimeline
