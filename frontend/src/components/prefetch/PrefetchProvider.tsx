import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'

import { useAuth } from '@/features/auth/AuthContext'
import { fetchAccounts } from '@/features/accounts/api'
import { fetchCategories } from '@/features/categories/api'
import { fetchSummary } from '@/features/transactions/api'
import { prefetchAllRoutes } from '@/app/pages'

/**
 * Предзагрузка: как только пользователь авторизован — греем все чанки страниц
 * и ключевые данные (счета, категории, сводку). При последующих переходах
 * страницы и данные уже в кэше/вкладке, поэтому экраны открываются быстрее.
 */
export function PrefetchProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (status !== 'authenticated') return

    prefetchAllRoutes()

    const preload: Array<Promise<unknown>> = [
      queryClient.prefetchQuery({ queryKey: ['accounts'], queryFn: fetchAccounts }),
      queryClient.prefetchQuery({ queryKey: ['categories'], queryFn: fetchCategories }),
      queryClient.prefetchQuery({ queryKey: ['transactions', 'summary'], queryFn: fetchSummary }),
    ]
    void Promise.allSettled(preload)
  }, [status, queryClient])

  return <>{children}</>
}