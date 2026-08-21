import { api } from '@/lib/api'

export type CategoryKind = 'income' | 'expense'

export interface Category {
  id: string
  name: string
  kind: CategoryKind
  color: string
  icon: string
  created_at: string
}

export interface CreateCategoryPayload {
  name: string
  kind: CategoryKind
  color?: string
  icon?: string
}

export const CATEGORY_COLORS = [
  '#10b981',
  '#f59e0b',
  '#3b82f6',
  '#ef4444',
  '#8b5cf6',
  '#14b8a6',
  '#f97316',
  '#6366f1',
  '#e11d48',
  '#22c55e',
]

export const CATEGORY_ICONS = [
  'shopping-bag',
  'cart',
  'car',
  'bus',
  'home',
  'gamepad',
  'heart',
  'star',
  'gift',
  'coffee',
  'tag',
  'zap',
] as const

/** Коды встроенных категорий (переводятся через i18n, цвета/иконки нет). */
export const BUILTIN_CATEGORY_CODES = new Set<string>([
  'salary',
  'freelance',
  'gift',
  'food',
  'transport',
  'shopping',
  'entertainment',
  'home',
  'other',
])

export interface CategoryView {
  label: string
  color: string | null
  icon: string | null
}

/** Унифицированное отображение категории: кастомная (имя/цвет/иконка) или код. */
export function categoryView(
  t: (key: string) => string,
  opts: { category: string; name?: string | null; color?: string | null; icon?: string | null },
): CategoryView {
  if (opts.name) {
    return { label: opts.name, color: opts.color ?? null, icon: opts.icon ?? null }
  }
  if (BUILTIN_CATEGORY_CODES.has(opts.category)) {
    return { label: t(`categories.${opts.category}`), color: null, icon: null }
  }
  return { label: opts.category, color: null, icon: null }
}

export const CATEGORY_ICON_PATHS: Record<string, string> = {
  'shopping-bag': 'M5 8h14l-1 13H6zM9 8V6a3 3 0 0 1 6 0v2',
  cart: 'M3 4h2l2.4 12h11L21 8H6',
  car: 'M5 11l1.5-4.5h11L19 11M5 11h14v5h-3m-8 0H5z M7 16a1.5 1.5 0 1 0 0-1.5M17 14.5a1.5 1.5 0 1 0 0 3',
  bus: 'M5 7a7 7 0 0 1 14 0v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2zM5 11h14M6 16h4M14 16h4',
  home: 'M3 11 12 4l9 7M5 9.5V20h14V9.5',
  gamepad: 'M7 10h4M9 8v4M17 10h.01M14.5 12.5h.01M19 12a5 5 0 0 1-10 0 5 5 0 0 1 10 0z',
  heart: 'M12 19C6.5 15 3 12 3 8.5A4.5 4.5 0 0 1 7.5 4c1.8 0 3.4 1 4.5 2.5C13.1 5 14.7 4 16.5 4A4.5 4.5 0 0 1 21 8.5c0 3.5-3.5 6.5-9 10.5z',
  star: 'M12 3l2.7 5.6 6.3.8-4.6 4.3 1.2 6.1L12 16.9 6.4 19.8l1.2-6.1L3 9.4l6.3-.8z',
  gift: 'M12 20V10M12 10H6.5a2.5 2.5 0 0 1 0-5h1A4.5 4.5 0 0 1 12 10m0 0h5.5a2.5 2.5 0 0 0 0-5h-1A4.5 4.5 0 0 0 12 10M4 10h16v4H4zM4 17h16v3H4z',
  coffee: 'M4 8h13v7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4z M17 10h1a2 2 0 0 1 0 4h-1M8 2v2M12 2v2M16 2v2',
  tag: 'M20 12.5 12.5 20 4 11.5V4h7.5zM8.5 8.5h.01',
  zap: 'M13 2 4 14h7l-1 8 9-12h-7z',
}

export interface CategoriesResponse {
  categories: Category[]
}

export async function fetchCategories(): Promise<Category[]> {
  const body = await api<CategoriesResponse>('/api/categories')
  return body.categories
}

export async function createCategory(
  payload: CreateCategoryPayload,
): Promise<Category> {
  return api<Category>('/api/categories', { method: 'POST', json: payload })
}

export async function updateCategory(
  id: string,
  payload: Partial<CreateCategoryPayload>,
): Promise<Category> {
  return api<Category>(`/api/categories/${id}`, { method: 'PATCH', json: payload })
}

export async function deleteCategory(id: string): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>(`/api/categories/${id}`, { method: 'DELETE' })
}