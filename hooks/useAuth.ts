'use client'

import { useSuspenseQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useEffect } from 'react'

export function useAuth() {
  const queryClient = useQueryClient()

  const { data: user } = useSuspenseQuery({
    queryKey: ['auth', 'user'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      return session?.user ?? null
    },
    staleTime: Infinity,
  })

  // Auth 상태 변화 리스닝
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        queryClient.setQueryData(['auth', 'user'], session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [queryClient])

  return {
    user,
    isAuthenticated: !!user,
  }
}