# 테스트 전략

## 테스트 스택
- **단위/컴포넌트**: Vitest + React Testing Library
- **E2E**: Playwright
- **API/서버 액션**: Vitest

## 테스트 구조
```
tests/
├── unit/         # 유틸, 로직
├── components/   # UI 컴포넌트
├── integration/  # API, 서버 액션
└── e2e/         # auth, deck-crud, game-play
```

## MVP 우선순위

### 🔴 Critical
- E2E: 로그인 플로우 (Google OAuth)
- E2E: 덱 CRUD
- E2E: 게임 플레이
- Unit: Wordle 게임 로직

### 🟡 Important
- Component: 덱 카드, 게임 보드
- Integration: Supabase 쿼리
- E2E: 좋아요 기능

### 🟢 Nice-to-have
- Component: shadcn/ui 커스텀
- Unit: 유틸리티 함수
- E2E: 검색/필터링

## 주요 테스트 시나리오

### E2E 로그인
- Google OAuth 플로우 완료 → 메인 페이지 리다이렉트

### E2E 덱 CRUD
- 덱 생성 → 상세 페이지 → 수정 → 삭제 확인

### E2E 게임 플레이
- 단어 입력 → 제출 → 타일 색상 피드백 → 결과

### Unit Wordle 로직
- GREEN: 정답 위치 일치
- YELLOW: 글자 있지만 위치 틀림
- GRAY: 글자 없음

### Integration Supabase
- createDeck → getDeck → 데이터 일치 확인

## 커버리지 목표
- 전체: 70%+
- 핵심 로직: 90%+
- UI 컴포넌트: 60%+
- E2E 주요 플로우: 100%

## CI/CD
```yaml
# GitHub Actions
- npm run test:unit
- npm run test:e2e
- npm run coverage
```

## 명령어
- `npm run test` - 전체
- `npm run test:unit` - 단위/컴포넌트
- `npm run test:e2e` - E2E
- `npm run test:coverage` - 커버리지
- `npm run test:watch` - Watch
