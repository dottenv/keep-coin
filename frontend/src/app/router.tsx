import { Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'

import { useAuth } from '@/features/auth/AuthContext'
import { LoadingBlock } from '@/components/ui/Spinner'
import {
  AccountFormPage,
  AccountMembersPage,
  AccountsPage,
  AddTransactionPage,
  AllTransactionsPage,
  CategoriesPage,
  DashboardPage,
  FamilyPage,
  InvitesPage,
  LoginPage,
  ProfilePage,
  RegisterPage,
  StatsPage,
  TransactionDetailPage,
  PlannerPage,
  BudgetFormPage,
  GoalFormPage,
} from './pages'

function BootScreen({ label }: { label?: string }) {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-50 dark:bg-ink-950">
      <LoadingBlock label={label} />
    </div>
  )
}

/** Маршруты, требующие авторизации. */
function Protected({ children }: { children: ReactNode }) {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'unknown') return <BootScreen />
  if (status === 'anonymous') {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }
  return <>{children}</>
}

/** Маршруты только для гостей (редирект, если уже авторизованы). */
function GuestOnly({ children }: { children: ReactNode }) {
  const { status } = useAuth()

  if (status === 'unknown') return <BootScreen />
  if (status === 'authenticated') return <Navigate to="/" replace />
  return <>{children}</>
}

export function AppRoutes() {
  return (
    <Suspense fallback={<BootScreen />}>
      <Routes>
        <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
        <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />
        <Route path="/" element={<Protected><DashboardPage /></Protected>} />
        <Route path="/profile" element={<Protected><ProfilePage /></Protected>} />
        <Route path="/accounts" element={<Protected><AccountsPage /></Protected>} />
        <Route path="/accounts/new" element={<Protected><AccountFormPage /></Protected>} />
        <Route path="/accounts/:id/edit" element={<Protected><AccountFormPage /></Protected>} />
        <Route path="/accounts/:id/members" element={<Protected><AccountMembersPage /></Protected>} />
        <Route path="/invites" element={<Protected><InvitesPage /></Protected>} />
        <Route path="/family" element={<Protected><FamilyPage /></Protected>} />
        <Route path="/categories" element={<Protected><CategoriesPage /></Protected>} />
        <Route path="/planner" element={<Protected><PlannerPage /></Protected>} />
        <Route path="/planner/budgets/new" element={<Protected><BudgetFormPage /></Protected>} />
        <Route path="/planner/budgets/:id/edit" element={<Protected><BudgetFormPage /></Protected>} />
        <Route path="/planner/goals/new" element={<Protected><GoalFormPage /></Protected>} />
        <Route path="/planner/goals/:id/edit" element={<Protected><GoalFormPage /></Protected>} />
        <Route path="/stats" element={<Protected><StatsPage /></Protected>} />
        <Route path="/transactions" element={<Protected><AllTransactionsPage /></Protected>} />
        <Route path="/transactions/:id" element={<Protected><TransactionDetailPage /></Protected>} />
        <Route path="/transactions/:id/edit" element={<Protected><AddTransactionPage /></Protected>} />
        <Route path="/add" element={<Protected><AddTransactionPage /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}