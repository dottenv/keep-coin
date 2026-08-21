import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { TransactionsList } from '@/features/dashboard/components/TransactionsList'
import { CompactTransactionFilters, type TransactionFilters as FiltersType } from '@/features/transactions/components/CompactTransactionFilters'
import { fetchAccounts } from '@/features/accounts/api'
import { fetchTransactions, type TransactionType } from '@/features/transactions/api'

/** Страница «Все операции» (открывается из виджета последних операций). */
export function AllTransactionsPage() {
  const { t } = useTranslation()
  
  const [filters, setFilters] = useState<Partial<FiltersType>>({})

  const accounts = useQuery({ queryKey: ['accounts'], queryFn: fetchAccounts })
  const all = useQuery({
    queryKey: ['transactions', 'all', filters],
    queryFn: () => fetchTransactions(500, {
      search: filters.search,
      type: filters.type as TransactionType,
      category: filters.category,
      account_id: filters.account_id,
    }),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })

  // Получаем уникальные категории из транзакций
  const categories = Array.from(
    new Set(all.data?.map(tx => tx.category).filter(Boolean) || [])
  ).sort()

  // Фильтрация по дате на клиенте (если backend не поддерживает)
  const filteredTransactions = all.data?.filter(transaction => {
    if (!transaction) return false
    
    // Фильтрация по дате
    if (filters.date_from) {
      const transactionDate = new Date(transaction.date)
      const fromDate = new Date(filters.date_from)
      if (transactionDate < fromDate) return false
    }
    
    if (filters.date_to) {
      const transactionDate = new Date(transaction.date)
      const toDate = new Date(filters.date_to)
      if (transactionDate > toDate) return false
    }
    
    return true
  })

  const handleFiltersChange = (newFilters: Partial<FiltersType>) => {
    setFilters(newFilters)
  }

  // Первичная загрузка — скелетоны; повторная выборка (поиск/фильтры) — спиннер.
  const initialLoading = all.isPending || accounts.isPending
  const refetching = all.isFetching && !all.isPending

  return (
    <AppShell>
      <PageHeader title={t('transactions.allTitle')} />
      
      <CompactTransactionFilters
        accounts={accounts.data}
        categories={categories}
        onFiltersChange={handleFiltersChange}
        initialFilters={filters}
      />
      
      <TransactionsList
        transactions={filteredTransactions}
        accounts={accounts.data}
        loading={initialLoading}
        refetching={refetching}
      />
      
      {filteredTransactions?.length === 0 && !all.isPending && (
        <div className="glass-card p-8 text-center">
          <p className="text-sm font-medium text-ink-700 dark:text-ink-200">
            {Object.keys(filters).length > 0 
              ? t('transactions.noFilteredTransactions')
              : t('dashboard.noTransactions')}
          </p>
          <p className="mt-1 text-xs text-ink-400">
            {Object.keys(filters).length > 0 
              ? t('transactions.noFilteredTransactionsSub')
              : t('dashboard.noTransactionsSub')}
          </p>
        </div>
      )}
    </AppShell>
  )
}