import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    // 'always', not the default 'online': offline, the default PAUSES a
    // mutation before mutationFn runs, so the attendance and score queues never
    // saw a failure to park. Let the request be attempted and fail, and the
    // offline handling in queries/attendance.ts and queries/grades.ts takes over.
    mutations: { networkMode: 'always' },
  },
})
