import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input, Select } from '@/components/ui/Input'
import { useToast } from '@/components/ui/Toast'
import { Skeleton } from '@/components/ui/Skeleton'
import { 
  fetchCategories, 
  createCategory, 
  updateCategory, 
  deleteCategory, 
  type Category, 
  type CategoryKind,
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CATEGORY_ICON_PATHS
} from '@/features/categories/api'
import { cn } from '@/lib/cn'

interface CategoryManagerProps {
  compact?: boolean
  onCategorySelect?: (category: Category) => void
}

/** Компонент для управления категориями (можно использовать в настройках). */
export function CategoryManager({ compact = false, onCategorySelect }: CategoryManagerProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()
  
  const [isAdding, setIsAdding] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<{
    name: string
    kind: CategoryKind
    color: string
    icon: string
  }>({
    name: '',
    kind: 'expense',
    color: CATEGORY_COLORS[0],
    icon: CATEGORY_ICONS[0],
  })

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: fetchCategories,
  })

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.show(t('categories.created'), 'success')
      setIsAdding(false)
      setFormData({
        name: '',
        kind: 'expense',
        color: CATEGORY_COLORS[0],
        icon: CATEGORY_ICONS[0],
      })
    },
    onError: () => {
      toast.show(t('categories.createError'), 'error')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => updateCategory(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.show(t('categories.updated'), 'success')
      setEditingId(null)
    },
    onError: () => {
      toast.show(t('categories.updateError'), 'error')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.show(t('categories.deleted'), 'success')
    },
    onError: () => {
      toast.show(t('categories.deleteError'), 'error')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) {
      toast.show(t('categories.nameRequired'), 'error')
      return
    }

    if (editingId) {
      updateMutation.mutate({ id: editingId, payload: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleEdit = (category: Category) => {
    setEditingId(category.id)
    setFormData({
      name: category.name,
      kind: category.kind,
      color: category.color,
      icon: category.icon,
    })
    setIsAdding(true)
  }

  const handleDelete = (id: string) => {
    if (window.confirm(t('categories.confirmDelete'))) {
      deleteMutation.mutate(id)
    }
  }

  const handleCancel = () => {
    setIsAdding(false)
    setEditingId(null)
    setFormData({
      name: '',
      kind: 'expense',
      color: CATEGORY_COLORS[0],
      icon: CATEGORY_ICONS[0],
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 rounded-[1.5rem]" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Форма добавления/редактирования */}
      {(isAdding || editingId) && (
        <Card className="p-4 animate-scale-in">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-ink-700 dark:text-ink-200">
                {editingId ? t('categories.editCategory') : t('categories.addCategory')}
              </h3>
              <button
                type="button"
                onClick={handleCancel}
                className="text-sm font-medium text-ink-500 hover:text-ink-700 dark:text-ink-400 dark:hover:text-ink-200"
              >
                {t('common.cancel')}
              </button>
            </div>

            <Input
              label={t('categories.name')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={t('categories.namePlaceholder')}
              autoFocus
            />

            <Select
              label={t('categories.type')}
              value={formData.kind}
              onChange={(e) => setFormData({ ...formData, kind: e.target.value as CategoryKind })}
            >
              <option value="income">{t('common.income')}</option>
              <option value="expense">{t('common.expense')}</option>
            </Select>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="mb-1.5 block text-sm font-medium text-ink-600 dark:text-ink-300">
                  {t('categories.color')}
                </span>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_COLORS.slice(0, 6).map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={cn(
                        'h-8 w-8 rounded-full border-2 transition-all',
                        formData.color === color ? 'border-ink-300' : 'border-transparent'
                      )}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              <div>
                <span className="mb-1.5 block text-sm font-medium text-ink-600 dark:text-ink-300">
                  {t('categories.icon')}
                </span>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_ICONS.slice(0, 6).map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon })}
                      className={cn(
                        'grid h-8 w-8 place-items-center rounded-full border-2 transition-all',
                        formData.icon === icon 
                          ? 'border-brand-300 bg-brand-50 text-brand-600 dark:border-brand-400/50 dark:bg-brand-500/15 dark:text-brand-300' 
                          : 'border-ink-200 bg-white text-ink-400 hover:border-ink-300 dark:border-white/15 dark:bg-white/[0.06] dark:text-ink-400 dark:hover:border-white/30'
                      )}
                      title={icon}
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
                        <path d={CATEGORY_ICON_PATHS[icon] || CATEGORY_ICON_PATHS['tag']} />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <Button
              type="submit"
              fullWidth
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editingId ? t('common.update') : t('common.save')}
            </Button>
          </form>
        </Card>
      )}

      {/* Список категорий */}
      <div className="space-y-2">
        {categories?.map((category) => (
          <div
            key={category.id}
            className={cn(
              'glass-chip flex items-center gap-3 rounded-xl p-3 transition-colors hover:border-brand-300 hover:bg-brand-50/50 dark:hover:border-brand-400/40 dark:hover:bg-brand-500/5',
              compact && 'p-2'
            )}
          >
            <span
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
              style={{ backgroundColor: `${category.color}20`, color: category.color }}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
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
              <p className="truncate text-xs text-ink-400">
                {t(`categoryKind.${category.kind}`)}
              </p>
            </div>

            <div className="flex items-center gap-1">
              {onCategorySelect && (
                <button
                  type="button"
                  onClick={() => onCategorySelect(category)}
                  className="pressable grid h-7 w-7 place-items-center rounded-lg text-ink-400 hover:bg-ink-100 hover:text-ink-600 dark:hover:bg-white/10 dark:hover:text-ink-200"
                  title={t('common.select')}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              )}
              
              <button
                type="button"
                onClick={() => handleEdit(category)}
                className="pressable grid h-7 w-7 place-items-center rounded-lg text-ink-400 hover:bg-brand-100 hover:text-brand-600 dark:hover:bg-brand-500/20 dark:hover:text-brand-300"
                title={t('common.edit')}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              
              <button
                type="button"
                onClick={() => handleDelete(category.id)}
                disabled={deleteMutation.isPending}
                className="pressable grid h-7 w-7 place-items-center rounded-lg text-ink-400 hover:bg-red-100 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-500/20 dark:hover:text-red-400"
                title={t('common.delete')}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Кнопка добавления (если не в режиме редактирования) */}
      {!isAdding && !editingId && (
        <Button
          type="button"
          variant="outline"
          fullWidth
          onClick={() => setIsAdding(true)}
          className="border-dashed"
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
            <path d="M12 5v14M5 12h14" />
          </svg>
          {t('categories.addCategory')}
        </Button>
      )}
    </div>
  )
}