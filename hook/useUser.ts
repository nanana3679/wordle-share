'use client';

import { getUser } from '@/app/actions/auth';
import { User } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
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
      // 세션이 없는 경우는 정상적인 상황이므로 ErrorBoundary를 트리거하지 않음
      if (err instanceof Error && err.message.includes('Auth session missing')) {
        setUser(null);
      } else {
        showBoundary(err);
      }
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    refetch();
  }, []);
  
  return { user, loading, refetch };
}