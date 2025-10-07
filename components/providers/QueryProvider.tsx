'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 데이터가 stale 상태가 되기까지의 시간 (5분)
            staleTime: 1000 * 60 * 5,
            // 캐시에서 데이터를 유지하는 시간 (10분)
            gcTime: 1000 * 60 * 10,
            // 자동으로 refetch하지 않음
            refetchOnWindowFocus: false,
            // 네트워크가 다시 연결될 때 refetch
            refetchOnReconnect: true,
            // 재시도 횟수
            retry: 1,
          },
          mutations: {
            // mutation 재시도 횟수
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
