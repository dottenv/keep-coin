import { api } from '@/lib/api'

export type TransactionType = 'income' | 'expense' | 'transfer'

export interface Transaction {
  id: string
  type: TransactionType
  account_id: string
  to_account_id?: string | null
  title: string
  category: string
  category_id?: string | null
  category_color?: string | null
  category_icon?: string | null
  author_name?: string | null
  is_own?: boolean
  amount: number
  currency: string
  date: string
  recurring?: boolean
}

export interface CreateTransactionPayload {
  type: TransactionType
  account_id: string
  to_account_id?: string | null
  title: string
  category: string
  category_id?: string | null
  amount: number
  date: string
}

export type UpdateTransactionPayload = Partial<CreateTransactionPayload>

export interface CategoryTotal {
  category: string
  category_id?: string | null
  name?: string | null
  color?: string | null
  icon?: string | null
  total: number
}

export interface AccountTotal {
  account_id: string
  account_name: string
  total: number
}

export interface MonthlyTotal {
  month: string
  income: number
  expense: number
}

export interface SummaryFilters {
  account_id?: string
  category?: string
  type?: TransactionType
  date_from?: string
  date_to?: string
}

export interface Summary {
  total_income: number
  total_expense: number
  month_income: number
  month_expense: number
  expense_by_category: CategoryTotal[]
  expense_by_account: AccountTotal[]
  recurring_count: number
  monthly: MonthlyTotal[]
}

export interface TransactionSuggestion {
  title: string
  category: string
  amount: number
  currency: string
  count: number
  last_date: string
}

interface TransactionsResponse {
  transactions: Transaction[]
}

export interface TransactionFilters {
  search?: string
  type?: TransactionType
  category?: string
  account_id?: string
  recurring?: boolean
}

export async function fetchTransactions(
  limit?: number,
  filters?: TransactionFilters,
): Promise<Transaction[]> {
  const params = new URLSearchParams()
  if (limit) params.set('limit', String(limit))
  if (filters?.search) params.set('q', filters.search)
  if (filters?.type) params.set('type', filters.type)
  if (filters?.category) params.set('category', filters.category)
  if (filters?.account_id) params.set('account_id', filters.account_id)
  if (filters?.recurring !== undefined) params.set('recurring', String(filters.recurring))

  const query = params.toString()
  const body = await api<TransactionsResponse>(`/api/transactions${query ? `?${query}` : ''}`)
  return body.transactions
}

export async function fetchTransaction(id: string): Promise<Transaction> {
  return api<Transaction>(`/api/transactions/${id}`)
}

export async function createTransaction(
  payload: CreateTransactionPayload,
): Promise<Transaction> {
  return api<Transaction>('/api/transactions', { method: 'POST', json: payload })
}

export async function updateTransaction(
  id: string,
  payload: UpdateTransactionPayload,
): Promise<Transaction> {
  return api<Transaction>(`/api/transactions/${id}`, { method: 'PATCH', json: payload })
}

export async function deleteTransaction(id: string): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>(`/api/transactions/${id}`, { method: 'DELETE' })
}

export async function fetchSummary(filters?: SummaryFilters): Promise<Summary> {
  const params = new URLSearchParams()
  if (filters?.account_id) params.set('account_id', filters.account_id)
  if (filters?.category) params.set('category', filters.category)
  if (filters?.type) params.set('type', filters.type)
  if (filters?.date_from) params.set('date_from', filters.date_from)
  if (filters?.date_to) params.set('date_to', filters.date_to)
  const query = params.toString()
  return api<Summary>(`/api/transactions/summary${query ? `?${query}` : ''}`)
}

export interface SuggestedCategory {
  id: string
  name: string
  color: string
  icon: string
  kind: 'income' | 'expense'
}

export async function fetchCategorySuggestion(
  q: string,
): Promise<SuggestedCategory | null> {
  const body = await api<{ category: SuggestedCategory | null }>(
    `/api/transactions/category-suggestion?q=${encodeURIComponent(q)}`,
  )
  return body.category
}

export async function fetchSuggestions(
  type?: TransactionType,
  q?: string,
): Promise<TransactionSuggestion[]> {
  const params = new URLSearchParams()
  if (type) params.set('type', type)
  if (q) params.set('q', q)
  const query = params.toString()
  const body = await api<{ suggestions: TransactionSuggestion[] }>(
    `/api/transactions/suggestions${query ? `?${query}` : ''}`,
  )
  return body.suggestions
}