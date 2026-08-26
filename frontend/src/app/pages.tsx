import { lazy, type ComponentType } from 'react'

/**
 * Централизованный список страниц. Lazy-импорт вынесен в отдельные функции,
 * чтобы PrefetchProvider мог прогреть все чанки заранее (уменьшение времени
 * первого перехода между экранами).
 */

type NamedModule = Record<string, ComponentType>

function lazyNamed<T extends NamedModule>(loader: () => Promise<T>, name: keyof T) {
  return lazy(() => loader().then((m) => ({ default: m[name] })))
}

const loaders = {
  login: () => import('@/features/auth/pages/LoginPage'),
  register: () => import('@/features/auth/pages/RegisterPage'),
  telegramRegister: () => import('@/features/auth/pages/TelegramRegisterPage'),
  dashboard: () => import('@/features/dashboard/DashboardPage'),
  profile: () => import('@/features/profile/ProfilePage'),
  accountForm: () => import('@/features/accounts/pages/AccountFormPage'),
  accounts: () => import('@/features/accounts/pages/AccountsPage'),
  accountMembers: () => import('@/features/accounts/pages/AccountMembersPage'),
  invites: () => import('@/features/invites/InvitesPage'),
  family: () => import('@/features/family/FamilyPage'),
  stats: () => import('@/features/stats/StatsPage'),
  allTransactions: () => import('@/features/transactions/pages/AllTransactionsPage'),
  transactionDetail: () => import('@/features/transactions/pages/TransactionDetailPage'),
  addTransaction: () => import('@/features/transactions/pages/AddTransactionPage'),
  categories: () => import('@/features/categories/CategoriesPage'),
  planner: () => import('@/features/planner/pages/PlannerPage'),
  budgetForm: () => import('@/features/planner/pages/BudgetFormPage'),
  goalForm: () => import('@/features/planner/pages/GoalFormPage'),
  pinSetup: () => import('@/features/lock/PinSetupPage'),
} as const

export const LoginPage = lazyNamed(loaders.login, 'LoginPage')
export const RegisterPage = lazyNamed(loaders.register, 'RegisterPage')
export const TelegramRegisterPage = lazyNamed(loaders.telegramRegister, 'TelegramRegisterPage')
export const DashboardPage = lazyNamed(loaders.dashboard, 'DashboardPage')
export const ProfilePage = lazyNamed(loaders.profile, 'ProfilePage')
export const AccountFormPage = lazyNamed(loaders.accountForm, 'AccountFormPage')
export const AccountsPage = lazyNamed(loaders.accounts, 'AccountsPage')
export const AccountMembersPage = lazyNamed(loaders.accountMembers, 'AccountMembersPage')
export const InvitesPage = lazyNamed(loaders.invites, 'InvitesPage')
export const FamilyPage = lazyNamed(loaders.family, 'FamilyPage')
export const StatsPage = lazyNamed(loaders.stats, 'StatsPage')
export const AllTransactionsPage = lazyNamed(loaders.allTransactions, 'AllTransactionsPage')
export const TransactionDetailPage = lazyNamed(loaders.transactionDetail, 'TransactionDetailPage')
export const AddTransactionPage = lazyNamed(loaders.addTransaction, 'AddTransactionPage')
export const CategoriesPage = lazyNamed(loaders.categories, 'CategoriesPage')
export const PlannerPage = lazyNamed(loaders.planner, 'PlannerPage')
export const BudgetFormPage = lazyNamed(loaders.budgetForm, 'BudgetFormPage')
export const GoalFormPage = lazyNamed(loaders.goalForm, 'GoalFormPage')
export const PinSetupPage = lazyNamed(loaders.pinSetup, 'PinSetupPage')

/** Предзагружает все чанки страниц (без ожидания). */
export function prefetchAllRoutes(): void {
  for (const loader of Object.values(loaders)) {
    loader().catch(() => {})
  }
}