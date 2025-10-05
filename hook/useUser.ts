'use client';

import { getUser } from '@/app/actions/auth';
import { User } from '@/type/user';
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
      showBoundary(err);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    refetch();
  }, []);
  
  return { user, loading, refetch };
}