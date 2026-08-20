import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton } from '@/components/ui/Skeleton'
import { fetchCategories, type Category, CATEGORY_ICON_PATHS } from '@/features/categories/api'
import { cn } from '@/lib/cn'

/** Страница «Категории»: управление категориями доходов/расходов. */
export function CategoriesPage() {
  const { t } = useTranslation()
  const categories = useQuery({ queryKey: ['categories'], queryFn: fetchCategories })

  return (
    <AppShell>
      <PageHeader
        title={t('nav.categories')}
        action={
          <Link
            to="/categories/new"
            className="pressable grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-600 text-white shadow-soft"
            aria-label={t('categories.add')}
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
          </Link>
        }
      />

      <div className="space-y-3">
        {categories.isPending ? (
          [0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-[1.5rem]" />)
        ) : categories.data?.length === 0 ? (
          <Link
            to="/categories/new"
            className="glass-card block p-10 text-center transition-colors hover:border-brand-300 hover:bg-brand-50/60 dark:hover:border-brand-400/40 dark:hover:bg-brand-500/10"
          >
            <p className="text-sm font-medium text-ink-500 dark:text-ink-400">{t('categories.noCategories')}</p>
            <span className="mt-1 inline-block text-sm font-semibold text-brand-600 dark:text-brand-400">
              {t('categories.noCategoriesCta')}
            </span>
          </Link>
        ) : (
          categories.data?.map((category: Category, index) => (
            <div
              key={category.id}
              className="glass-card flex items-center gap-4 p-4 animate-fade-in-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <span
                className={cn(
                  'grid h-10 w-10 shrink-0 place-items-center rounded-xl',
                  category.kind === 'income'
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
                    : 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-400',
                )}
                style={{ backgroundColor: `${category.color}20`, color: category.color }}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={CATEGORY_ICON_PATHS[category.icon] || CATEGORY_ICON_PATHS['tag']} />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink-800 dark:text-ink-100">{category.name}</p>
                <p className="mt-0.5 text-xs text-ink-400">{t(`categoryKind.${category.kind}`)}</p>
              </div>
              <span
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium',
                  category.kind === 'income'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                    : 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
                )}
              >
                {category.kind === 'income' ? t('common.income') : t('common.expense')}
              </span>
            </div>
          ))
        )}
      </div>
    </AppShell>
  )
}