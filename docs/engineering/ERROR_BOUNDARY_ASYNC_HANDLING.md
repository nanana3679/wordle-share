# ErrorBoundary 비동기 오류 처리 개선

## 문제 상황
- React ErrorBoundary가 네트워크 오류(fetch failed)에 동작하지 않는 문제
- Supabase `getUser()` 함수에서 발생하는 비동기 오류가 ErrorBoundary를 거치지 않음
- 사용자에게 적절한 오류 메시지와 재시도 기능이 제공되지 않음

## 원인 분석
- **React ErrorBoundary의 한계**: 동기적 렌더링 오류만 잡을 수 있음
- **비동기 오류 처리**: Promise 내부에서 발생하는 네트워크 오류는 자동으로 잡히지 않음
- **Server Component 구조**: 서버에서 오류 발생 시 ErrorBoundary를 거치지 않음

## 해결 방법
비동기 오류를 상태로 관리하고, 렌더링 시점에 동기적으로 에러를 던져 ErrorBoundary가 잡을 수 있도록 함

## 핵심 원리
`useErrorBoundary`는 내부적으로 에러 상태를 관리하고, 렌더링 시점에 에러가 있으면 `throw error`를 실행하여 ErrorBoundary가 잡을 수 있게 해줌

## 구현 내용

### 서버 액션 개선 (`app/actions/auth.ts`)
```typescript
export async function getUser() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    // ... 기존 로직
  } catch (error) {
    console.error('getUser error:', error);
    throw new Error(`사용자 정보를 가져오는 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
  }
}
```

### useUser 훅 개선 (`hook/useUser.ts`)
```typescript
import { useErrorBoundary } from 'react-error-boundary';

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { showBoundary } = useErrorBoundary();
  
  const refetch = async () => {
    try {
      setLoading(true);
      const data = await getUser();
      setUser(data);
    } catch (err) {
      console.error('useUser error:', err);
      showBoundary(err); // 🎯 에러 상태를 설정하여 렌더링 시점에 throw 실행
    } finally {
      setLoading(false);
    }
  };
  
  return { user, loading, refetch };
}
```

### useErrorBoundary의 내부 동작 원리
```typescript
// useErrorBoundary가 내부적으로 하는 일 (의사코드)
function useErrorBoundary() {
  const [error, setError] = useState(null);
  
  const showBoundary = (error) => {
    setError(error); // 에러 상태 설정
  };
  
  if (error) {
    throw error; // 렌더링 시점에 에러를 던져서 ErrorBoundary가 잡도록 함
  }
  
  return { showBoundary };
}
```

### 클라이언트 컴포넌트 전환 (`app/test-login/page.tsx`)
- Server Component에서 Client Component로 변경
- `useUser` 훅 사용으로 클라이언트에서 비동기 오류 처리
- ErrorBoundary로 오류 UI 통합

## 결과
- ✅ 네트워크 오류 시 적절한 오류 메시지 표시
- ✅ "다시 시도" 기능으로 재시도 가능
- ✅ ErrorBoundary가 비동기 오류도 정상 처리
- ✅ 사용자 친화적인 오류 처리 경험

## 핵심 포인트
- **에러 상태 관리**: 비동기 오류를 React 상태로 관리
- **렌더링 시점 에러 발생**: 컴포넌트 렌더링 시 에러 상태가 있으면 `throw error` 실행
- **ErrorBoundary 동작**: 동기적으로 던져진 에러를 ErrorBoundary가 정상적으로 잡음
- **패키지 없이도 가능**: `useErrorBoundary` 없이도 동일한 로직으로 구현 가능

## 대안 구현 (패키지 없이)
```typescript
function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  // 에러 상태가 있으면 렌더링 시점에 에러 던지기
  if (error) {
    throw error; // 🎯 이렇게 하면 ErrorBoundary가 잡을 수 있음
  }
  
  const refetch = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUser();
      setUser(data);
    } catch (err) {
      setError(err as Error); // 에러 상태 설정
    } finally {
      setLoading(false);
    }
  };
  
  return { user, loading, refetch };
}
```
