# 에러 처리 전략

## 네트워크 에러
- React Query 자동 재시도 (3회, exponential backoff)
- 오프라인 감지 및 UI 안내
- 타임아웃 처리 (10초)
- 에러 메시지 + 재시도 버튼 제공

## 파일 업로드 에러
- 클라이언트 검증: 5MB 이하, JPEG/PNG/WebP만 허용
- 업로드 진행률 표시 (XMLHttpRequest)
- 서버 검증: 클라이언트 우회 방지
- Storage quota 초과 시 명확한 안내

## 인증 에러
- 서버 액션에서 인증 상태 확인
- 에러 코드별 처리:
  - `UNAUTHENTICATED`: 로그인 페이지 리다이렉트
  - `FORBIDDEN`: 권한 없음 안내
  - `NOT_FOUND`: 리소스 없음 처리
- OAuth 콜백 에러 처리 및 재시도 옵션

## 게임 로직 에러
- 입력 검증: 길이, 영문 대문자만 허용
- 덱 데이터 검증: 단어 개수, 길이 확인
- 로컬 스토리지 에러 처리 (실패해도 게임 진행)
- 게임 상태 무결성 검증

## 전역 에러 처리
- Error Boundary로 React 에러 캐치
- 전역 에러 페이지 (error.tsx)
- Not Found 페이지 (404.tsx)
- 에러 로깅:
  - 개발: console.log
  - 프로덕션: Sentry 통합

## 측정 목표
- 에러율: < 1%
- 평균 해결 시간: < 24시간
- 에러 재발 방지율: 80%+
