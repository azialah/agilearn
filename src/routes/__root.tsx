import { Outlet, createRootRoute } from '@tanstack/react-router'
import { QueryClientProvider } from '@tanstack/react-query'
import { TooltipProvider } from '@/components/ui/Tooltip'
import { ToastProvider } from '@/components/ui/toast'
import { CustomCursor } from '@/components/CustomCursor'
import { LocaleProvider } from '@/lib/locale'
import { queryClient } from '@/lib/queryClient'

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  return (
    <QueryClientProvider client={queryClient}>
      <LocaleProvider>
        <TooltipProvider delayDuration={200}>
          <ToastProvider>
            <CustomCursor />
            <Outlet />
          </ToastProvider>
        </TooltipProvider>
      </LocaleProvider>
    </QueryClientProvider>
  )
}
