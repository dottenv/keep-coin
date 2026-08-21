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
  planned_net: number
  actual_net: number
  net_diff: number
  savings_target: number
  need_to_earn: number
  current_balance: number
  projected_balance: number
  daily_budget: number
  days_left: number
  category_breakdown: CategoryPlan[]
  insights: PlannerInsight[]
  budgets: Budget[]
  goals: SavingsGoal[]
}

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