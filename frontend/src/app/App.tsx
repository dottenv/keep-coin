import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'

import { AuthProvider } from '@/features/auth/AuthContext'
import { TelegramGate } from '@/features/auth/TelegramGate'
import { ToastProvider } from '@/components/ui/Toast'
import { PrefetchProvider } from '@/components/prefetch/PrefetchProvider'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { AppRoutes } from './router'
import '@/i18n'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000,
    },
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <TelegramGate />
              <PrefetchProvider>
                <AppRoutes />
              </PrefetchProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}