# AppBar & Layout 구조

## 라우트

### Layout 계층 구조
```
/app/demo/layout.tsx (최상위)
├── /login (AppBar 없음)
├── /decks/page.tsx (AppBar 직접 렌더링)
├── /decks/[id]/layout.tsx (AppBar 렌더링)
│   └── /decks/[id]/page.tsx
└── /play/[deckId]/layout.tsx (AppBar 렌더링)
    └── /play/[deckId]/page.tsx
```

### 각 라우트별 AppBar 설정

| 라우트 | AppBar 표시 | 뒤로가기 버튼 | 설명 |
|--------|------------|-------------|------|
| `/demo/login` | ❌ | - | 로그인 페이지, AppBar 없음 |
| `/demo/decks` | ✅ | ❌ | 덱 목록, 뒤로가기 없음 |
| `/demo/decks/[id]` | ✅ | ✅ | 덱 상세, "덱 목록으로" |
| `/demo/play/[deckId]` | ✅ | ✅ | 게임 플레이, "덱 상세로" |

### AppBar 뒤로가기 동작
- **항상 `router.back()` 사용**
- 브라우저 히스토리를 활용하여 캐싱된 페이지 표시
- 스크롤 위치, 폼 입력값 등 모든 상태 보존
- `backButtonHref` 제거하여 코드 단순화

### SSR 지원
- 모든 layout에서 `await supabase.auth.getUser()` 호출
- 클라이언트 훅(`useAuth` 등) 사용 안 함
- 서버 컴포넌트로 user 정보 전달


