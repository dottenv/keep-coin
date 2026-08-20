import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

import { Card } from '@/components/ui/Card'
import type { Account } from '@/features/accounts/api'
import type { TransactionType } from '@/features/transactions/api'
import { cn } from '@/lib/cn'

export interface TransactionFilters {
  search: string
  type: TransactionType | ''
  category: string
  account_id: string
  date_from: string
  date_to: string
}

interface CompactTransactionFiltersProps {
  accounts?: Account[]
  categories: string[]
  onFiltersChange: (filters: Partial<TransactionFilters>) => void
  initialFilters?: Partial<TransactionFilters>
}

const TYPES: Array<{ value: TransactionType | '' }> = [
  { value: '' },
  { value: 'income' },
  { value: 'expense' },
  { value: 'transfer' },
]

/** Компактные фильтры для списка операций с возможностью раскрытия. */
export function CompactTransactionFilters({
  accounts = [],
  categories,
  onFiltersChange,
  initialFilters = {},
}: CompactTransactionFiltersProps) {
  const { t } = useTranslation()
  
  const [isExpanded, setIsExpanded] = useState(false)
  const [filters, setFilters] = useState<TransactionFilters>({
    search: '',
    type: '',
    category: '',
    account_id: '',
    date_from: '',
    date_to: '',
    ...initialFilters,
  })
  
  const searchTimeoutRef = useRef<number>()
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search)

  // Дебаунс поиска
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    
    searchTimeoutRef.current = window.setTimeout(() => {
      setDebouncedSearch(filters.search)
    }, 300)
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [filters.search])

  // Обновляем внешние фильтры при изменении
  useEffect(() => {
    onFiltersChange({
      search: debouncedSearch,
      type: filters.type,
      category: filters.category,
      account_id: filters.account_id,
      date_from: filters.date_from,
      date_to: filters.date_to,
    })
  }, [debouncedSearch, filters.type, filters.category, filters.account_id, filters.date_from, filters.date_to])

  const handleFilterChange = (key: keyof TransactionFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      type: '',
      category: '',
      account_id: '',
      date_from: '',
      date_to: '',
    })
    setIsExpanded(false)
  }

  const hasActiveFilters = Object.values(filters).some(
    value => value !== '' && value !== undefined && value !== null
  )

  const activeFilterCount = Object.values(filters).filter(
    value => value !== '' && value !== undefined && value !== null
  ).length

  return (
    <div className="mb-4 animate-fade-in">
      {/* Компактная панель */}
      <div className="flex items-end gap-3">
        {/* Поиск */}
        <div className="flex-1">
          <div className="relative">
            <svg
              viewBox="0 0 24 24"
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder={t('transactions.searchPlaceholder')}
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="h-10 w-full rounded-xl border border-ink-200 bg-white/80 pl-10 pr-4 text-sm text-ink-900 outline-none backdrop-blur transition-all duration-200 placeholder:text-ink-300 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:border-white/15 dark:bg-white/[0.07] dark:text-ink-100 dark:placeholder:text-ink-500 dark:focus:ring-brand-500/20"
            />
          </div>
        </div>

        {/* Кнопка фильтров */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className={cn(
            'pressable flex h-10 items-center gap-2 rounded-xl border px-3.5 text-sm font-medium backdrop-blur transition-colors',
            hasActiveFilters
              ? 'border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-400/40 dark:bg-brand-500/15 dark:text-brand-200'
              : 'border-ink-200 bg-white/80 text-ink-600 hover:border-brand-300 hover:text-brand-600 dark:border-white/15 dark:bg-white/[0.07] dark:text-ink-300 dark:hover:border-brand-400/40 dark:hover:text-brand-300'
          )}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
          </svg>
          {t('common.filters')}
          {activeFilterCount > 0 && (
            <span className="grid h-5 min-w-5 place-items-center rounded-full bg-brand-500 px-1 text-xs font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>

        {/* Кнопка очистки */}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="pressable flex h-10 items-center gap-2 rounded-xl border border-ink-200 bg-white/80 px-3.5 text-sm font-medium text-ink-600 backdrop-blur hover:border-ink-300 hover:text-ink-700 dark:border-white/15 dark:bg-white/[0.07] dark:text-ink-300 dark:hover:border-white/30 dark:hover:text-ink-100"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
            {t('common.clear')}
          </button>
        )}
      </div>

      {/* Раскрывающаяся панель фильтров */}
      {isExpanded && (
        <Card className="mt-3 p-4 animate-scale-in">
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Тип операции */}
              <div>
                <span className="mb-1.5 block text-sm font-medium text-ink-600 dark:text-ink-300">
                  {t('transactions.type')}
                </span>
                <select
                  value={filters.type}
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                  className="h-10 w-full rounded-xl border border-ink-200 bg-white/80 px-3 text-sm text-ink-900 outline-none backdrop-blur transition-all duration-200 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:border-white/15 dark:bg-white/[0.07] dark:text-ink-100 dark:focus:ring-brand-500/20"
                >
                  {TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.value === '' ? t('common.allTypes') : t(`transactions.${type.value}`)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Категория */}
              <div>
                <span className="mb-1.5 block text-sm font-medium text-ink-600 dark:text-ink-300">
                  {t('transactions.category')}
                </span>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="h-10 w-full rounded-xl border border-ink-200 bg-white/80 px-3 text-sm text-ink-900 outline-none backdrop-blur transition-all duration-200 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:border-white/15 dark:bg-white/[0.07] dark:text-ink-100 dark:focus:ring-brand-500/20"
                >
                  <option value="">{t('common.allCategories')}</option>
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {t(`categories.${category}`)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Счет */}
              <div>
                <span className="mb-1.5 block text-sm font-medium text-ink-600 dark:text-ink-300">
                  {t('transactions.account')}
                </span>
                <select
                  value={filters.account_id}
                  onChange={(e) => handleFilterChange('account_id', e.target.value)}
                  className="h-10 w-full rounded-xl border border-ink-200 bg-white/80 px-3 text-sm text-ink-900 outline-none backdrop-blur transition-all duration-200 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 dark:border-white/15 dark:bg-white/[0.07] dark:text-ink-100 dark:focus:ring-brand-500/20"
                >
                  <option value="">{t('common.allAccounts')}</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Период */}
            <div>
              <span className="mb-1.5 block text-sm font-medium text-ink-600 dark:text-ink-300">
                {t('transactions.period')}
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <input
                    type="date"
                    value={filters.date_from}
                    onChange={(e) => handleFilterChange('date_from', e.target.value)}
                    className="w-full rounded-xl border border-ink-200 bg-white/80 px-3 py-2 text-sm outline-none backdrop-blur focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-white/15 dark:bg-white/[0.07] dark:text-ink-100 dark:focus:ring-brand-500/20"
                    placeholder={t('transactions.fromDate')}
                  />
                  <span className="mt-1 block text-xs text-ink-400">
                    {t('transactions.fromDate')}
                  </span>
                </div>
                <div>
                  <input
                    type="date"
                    value={filters.date_to}
                    onChange={(e) => handleFilterChange('date_to', e.target.value)}
                    className="w-full rounded-xl border border-ink-200 bg-white/80 px-3 py-2 text-sm outline-none backdrop-blur focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-white/15 dark:bg-white/[0.07] dark:text-ink-100 dark:focus:ring-brand-500/20"
                    placeholder={t('transactions.toDate')}
                  />
                  <span className="mt-1 block text-xs text-ink-400">
                    {t('transactions.toDate')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}