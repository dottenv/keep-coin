import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'

import { AuthProvider } from '@/features/auth/AuthContext'
import { TelegramGate } from '@/features/auth/TelegramGate'
import { ToastProvider } from '@/components/ui/Toast'
import { PrefetchProvider } from '@/components/prefetch/PrefetchProvider'
import { ThemeProvider } from '@/components/theme/ThemeProvider'
import { LockProvider } from '@/features/lock/LockContext'
import { LockScreen } from '@/features/lock/LockScreen'
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
  // Прячем инлайн-сплэш из index.html после первого маунта React.
  useEffect(() => {
    const splash = document.getElementById('boot-splash')
    if (!splash) return
    const hide = () => {
      splash.classList.add('hidden')
      window.setTimeout(() => splash.remove(), 400)
    }
    const id = window.setTimeout(hide, 150)
    return () => window.clearTimeout(id)
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <TelegramGate />
              <LockProvider>
                <PrefetchProvider>
                  <AppRoutes />
                </PrefetchProvider>
                <LockScreen />
              </LockProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}