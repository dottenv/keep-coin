import { api } from '@/lib/api'
import type { AccountRole } from '@/features/accounts/api'

export type BudgetPeriod = 'month' | 'week' | 'year'

export interface Budget {
  id: string
  name: string
  amount: number
  period: BudgetPeriod
  kind: 'expense' | 'income'
  category: string | null
  currency: string
  is_active: boolean
  account_id: string | null
  account_name: string | null
  shared: boolean
  role: AccountRole
  spent: number
  remaining: number
  pct: number
  start_date: string | null
  end_date: string | null
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  created_at: string
}

export interface CreateBudgetPayload {
  name: string
  amount: number
  account_id?: string | null
  period?: BudgetPeriod
  kind?: 'expense' | 'income'
  category?: string | null
  is_active?: boolean
  start_date?: string | null
  end_date?: string | null
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
}

export type UpdateBudgetPayload = Partial<CreateBudgetPayload>

export interface SavingsGoal {
  id: string
  name: string
  target_amount: number
  saved_amount: number
  deadline: string | null
  monthly_contribution: number | null
  currency: string
  is_active: boolean
  account_id: string | null
  account_name: string | null
  shared: boolean
  pct: number
  needed_per_month: number
  start_date: string | null
  end_date: string | null
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  created_at: string
}

export interface CreateGoalPayload {
  name: string
  target_amount: number
  saved_amount?: number
  account_id?: string | null
  deadline?: string | null
  monthly_contribution?: number | null
  is_active?: boolean
  start_date?: string | null
  end_date?: string | null
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
}

export type UpdateGoalPayload = Partial<CreateGoalPayload>

export interface CategoryPlan {
  category: string
  kind: 'expense' | 'income'
  planned: number
  actual: number
  pct: number
}

export interface PlannerInsight {
  tone: 'warn' | 'good' | 'info'
  code: string
  count?: number
  amount?: number
  have?: number
  need?: number
}

export interface PlannerOverview {
  month: string
  currency: string
  month_income: number
  month_expense: number
  planned_income: number
  planned_expenses: number
  unassigned: number
  actual_net: number
  net_diff: number
  savings_target: number
  need_to_earn: number
  current_balance: number
  projected_balance: number
  daily_budget: number
  days_left: number
  has_plan: boolean
  category_breakdown: CategoryPlan[]
  insights: PlannerInsight[]
  budgets: Budget[]
  goals: SavingsGoal[]
  credits: Credit[]
}

export interface Credit {
  id: string
  name: string
  currency: string
  total_amount: number
  paid_amount: number
  remaining: number
  payment_amount: number | null
  interest_rate: number
  first_payment_date: string | null
  start_date: string | null
  payment_day: number | null
  notes: string | null
  is_active: boolean
  account_id: string | null
  account_name: string | null
  next_payment_date: string | null
}

export interface CreateCreditPayload {
  name: string
  account_id?: string | null
  currency?: string | null
  total_amount: number
  interest_rate?: number
  term_months?: number | null
  payment_amount?: number | null
  paid_amount?: number
  first_payment_date?: string | null
  start_date?: string | null
  payment_day?: number | null
  notes?: string | null
  is_active?: boolean
}

export type UpdateCreditPayload = Partial<CreateCreditPayload>

export interface Reminder {
  id: string
  type: 'generic' | 'budget' | 'goal' | 'credit'
  title: string
  body: string
  due_at: string
  timezone: string
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  enabled: boolean
  related_type: string | null
  related_id: string | null
  last_fired_at: string | null
  created_at: string
}

export interface CreateReminderPayload {
  type?: 'generic' | 'budget' | 'goal' | 'credit'
  title: string
  body?: string
  due_at: string
  timezone?: string
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'
  enabled?: boolean
  related_type?: string | null
  related_id?: string | null
}

export type UpdateReminderPayload = Partial<CreateReminderPayload>

interface BudgetsResponse {
  budgets: Budget[]
}

interface GoalsResponse {
  goals: SavingsGoal[]
}

export async function fetchPlanner(): Promise<PlannerOverview> {
  return api<PlannerOverview>('/api/planner')
}

export async function fetchBudgets(): Promise<Budget[]> {
  const body = await api<BudgetsResponse>('/api/budgets')
  return body.budgets
}

export async function createBudget(payload: CreateBudgetPayload): Promise<Budget> {
  return api<Budget>('/api/budgets', { method: 'POST', json: payload })
}

export async function updateBudget(
  id: string,
  payload: UpdateBudgetPayload,
): Promise<Budget> {
  return api<Budget>(`/api/budgets/${id}`, { method: 'PATCH', json: payload })
}

export async function deleteBudget(id: string): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>(`/api/budgets/${id}`, { method: 'DELETE' })
}

export async function fetchGoals(): Promise<SavingsGoal[]> {
  const body = await api<GoalsResponse>('/api/goals')
  return body.goals
}

export async function createGoal(payload: CreateGoalPayload): Promise<SavingsGoal> {
  return api<SavingsGoal>('/api/goals', { method: 'POST', json: payload })
}

export async function updateGoal(
  id: string,
  payload: UpdateGoalPayload,
): Promise<SavingsGoal> {
  return api<SavingsGoal>(`/api/goals/${id}`, { method: 'PATCH', json: payload })
}

export async function deleteGoal(id: string): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>(`/api/goals/${id}`, { method: 'DELETE' })
}

// ---------- Кредиты ----------

interface CreditsResponse {
  credits: Credit[]
}

export async function fetchCredits(): Promise<Credit[]> {
  const body = await api<CreditsResponse>('/api/credits')
  return body.credits
}

export async function createCredit(payload: CreateCreditPayload): Promise<Credit> {
  return api<Credit>('/api/credits', { method: 'POST', json: payload })
}

export async function updateCredit(
  id: string,
  payload: UpdateCreditPayload,
): Promise<Credit> {
  return api<Credit>(`/api/credits/${id}`, { method: 'PATCH', json: payload })
}

export async function deleteCredit(id: string): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>(`/api/credits/${id}`, { method: 'DELETE' })
}

// ---------- Напоминания ----------

interface RemindersResponse {
  reminders: Reminder[]
}

export async function fetchReminders(): Promise<Reminder[]> {
  const body = await api<RemindersResponse>('/api/reminders')
  return body.reminders
}

export async function createReminder(payload: CreateReminderPayload): Promise<Reminder> {
  return api<Reminder>('/api/reminders', { method: 'POST', json: payload })
}

export async function updateReminder(
  id: string,
  payload: UpdateReminderPayload,
): Promise<Reminder> {
  return api<Reminder>(`/api/reminders/${id}`, { method: 'PATCH', json: payload })
}

export async function deleteReminder(id: string): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>(`/api/reminders/${id}`, { method: 'DELETE' })
}

export async function sendReminderNow(id: string): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>(`/api/reminders/${id}/send`, { method: 'POST' })
}

// ---------- Часовой пояс пользователя ----------

export async function fetchUserTimezone(): Promise<string> {
  const data = await api<{ timezone: string }>('/api/settings/timezone')
  return data.timezone
}

export async function saveUserTimezone(timezone: string): Promise<string> {
  const data = await api<{ timezone: string }>('/api/settings/timezone', {
    method: 'PUT',
    json: { timezone },
  })
  return data.timezone
}