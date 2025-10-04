# 접근성 전략

## 키보드 네비게이션
- **게임 제어**: 알파벳 입력, Backspace(삭제), Enter(제출), Escape(나가기)
- **모달 관리**: Tab/Shift+Tab 순환, Escape 닫기, 포커스 트랩
- **Skip Links**: 본문/네비게이션 건너뛰기
- **포커스 스타일**: 2px solid blue outline, offset 2px

## 스크린 리더 지원
- **시맨틱 HTML**: header, nav, main, aside, footer, section, article
- **ARIA 레이블**: 게임 타일 상태 안내 (정답 위치/다른 위치/없음)
- **Live Regions**: 게임 결과, 좋아요 알림 실시간 안내
- **폼 레이블**: label-input 연결, aria-describedby, aria-invalid
- **랜드마크 영역**: role="banner/navigation/main/complementary/contentinfo"

## 색상 및 대비
- **WCAG AA 준수**: 대비율 4.5:1 이상
- **색맹 대응**: 색상 + 아이콘 조합 (CheckCircle, AlertCircle)
- **타일 색상**:
  - GREEN: #538d4e (대비율 4.6:1)
  - YELLOW: #b59f3b (대비율 4.5:1)
  - GRAY: #3a3a3c (대비율 12.6:1)
- **하이 컨트라스트 모드**: @media (prefers-contrast: high)
- **다크 모드**: 대비율 유지하며 색상 조정

## 반응형 및 확대
- **텍스트 확대**: rem 단위 사용, 200% 확대 지원
- **뷰포트 설정**: maximumScale 5배까지 허용
- **터치 타겟**: 최소 44x44px (WCAG 2.5.5)
- **게임 타일**: 56px × 56px

## 접근성 테스트
- **자동화 테스트**: axe-core, jest-axe
- **E2E 테스트**: Playwright + AxeBuilder
- **키보드 테스트**: Tab, Enter, Escape 시나리오
- **스크린 리더**: NVDA(Windows), VoiceOver(macOS/iOS), TalkBack(Android)

## WCAG 준수 체크리스트
### Level A (필수)
- 1.1.1 텍스트 대체
- 2.1.1 키보드 접근
- 2.4.1 블록 건너뛰기
- 3.3.2 레이블 제공
- 4.1.2 ARIA 올바른 사용

### Level AA (목표)
- 1.4.3 대비율 4.5:1
- 2.4.7 포커스 가시성
- 3.3.3 에러 수정 제안

## 측정 목표
- Lighthouse Accessibility: 95+
- axe 위반: 0개
- 키보드 접근: 100%
- 대비율 WCAG AA: 100%
