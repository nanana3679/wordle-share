## 에러 처리 전략

### 서버 액션 (Server Actions)
- 모든 로직을 try-catch로 감싸고 Result 타입 반환
- 예상된 에러: { success: false, error: string }
- 성공: { success: true, data: T, message?: string }

### 클라이언트 측

#### 컴포넌트 렌더링 에러
- Error Boundary가 자동 처리
- 렌더링 중 동기 에러만 해당

#### 이벤트 핸들러 / 서버 액션 호출
- try-catch로 네트워크 에러 처리
- Result 타입으로 비즈니스 로직 에러 처리
- handleActionResult() 헬퍼 사용

#### 데이터 페칭 에러
- useSuspenseQuery 사용
- Error Boundary가 쿼리 에러 처리
- 계층 구조: ErrorBoundary > Suspense > Component

## 로딩 전략

- useSuspenseQuery로 선언적 로딩
- 상위 Suspense가 폴백 UI 표시
- 중첩된 Suspense로 세밀한 로딩 제어 가능