'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

type QueryProviderProps = {
  children: React.ReactNode
}

export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 设置默认的查询选项
            staleTime: 60 * 1000, // 1 分钟
            gcTime: 5 * 60 * 1000, // 5 分钟 (之前的 cacheTime)
            retry: (failureCount, error) => {
              // 自定义重试逻辑
              if (failureCount < 2) {
                return true
              }
              return false
            },
            refetchOnWindowFocus: false,
          },
          mutations: {
            // 设置默认的 mutation 选项
            retry: 1,
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} position="bottom" />
    </QueryClientProvider>
  )
}
