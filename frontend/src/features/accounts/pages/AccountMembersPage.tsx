import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'

import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input, Select } from '@/components/ui/Input'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { displayInitials } from '@/lib/format'
import { notifyError, errorMessage } from '@/features/auth/errors'
import {
  fetchAccounts,
  fetchMembers,
  inviteMember,
  removeMember,
  updateMemberRole,
  type AccountRole,
} from '@/features/accounts/api'
import { cn } from '@/lib/cn'

const ROLES: AccountRole[] = ['owner', 'editor', 'viewer']

/** Страница управления доступом к счёту: участники + приглашения по email. */
export function AccountMembersPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const { id } = useParams<{ id: string }>()
  const queryClient = useQueryClient()

  const [email, setEmail] = useState('')
  const [role, setRole] = useState<AccountRole>('editor')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const accounts = useQuery({ queryKey: ['accounts'], queryFn: fetchAccounts })
  const members = useQuery({
    queryKey: ['members', id],
    queryFn: () => fetchMembers(id!),
    enabled: Boolean(id),
  })

  const account = accounts.data?.find((a) => a.id === id)
  const isOwner = account?.role === 'owner'

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['members', id] })
    queryClient.invalidateQueries({ queryKey: ['accounts'] })
    queryClient.invalidateQueries({ queryKey: ['invites'] })
  }

  const inviteMutation = useMutation({
    mutationFn: ({ email, role }: { email: string; role: AccountRole }) =>
      inviteMember(id!, email, role),
    onSuccess: () => {
      invalidate()
      setEmail('')
      toast.show(t('accounts.inviteSent'), 'success')
    },
    onError: (error) =>
      setFieldErrors(notifyError(error, toast) as Record<string, string>),
  })

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: AccountRole }) =>
      updateMemberRole(id!, userId, role),
    onSuccess: () => {
      invalidate()
      toast.show(t('accounts.roleUpdated'), 'success')
    },
    onError: (error) => toast.show(errorMessage(error), 'error'),
  })

  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeMember(id!, userId),
    onSuccess: () => {
      invalidate()
      toast.show(t('accounts.memberRemoved'), 'success')
    },
    onError: (error) => toast.show(errorMessage(error), 'error'),
  })

  const handleInvite = (e: FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    if (email.trim().length === 0) {
      setFieldErrors({ email: t('errors.email_required') })
      return
    }
    inviteMutation.mutate({ email: email.trim(), role })
  }

  const loading = accounts.isPending || members.isPending

  return (
    <AppShell>
      <PageHeader title={account ? `${account.name} · ${t('accounts.members')}` : t('accounts.membersTitle')} />

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-14 rounded-2xl" />
          <Skeleton className="h-48 rounded-[2rem]" />
        </div>
      ) : (
        <div className="space-y-5">
          {isOwner ? (
            <Card className="p-5 animate-fade-in-up">
              <form onSubmit={handleInvite} className="space-y-4">
                <h3 className="text-sm font-semibold text-ink-700 dark:text-ink-200">
                  {t('accounts.manageMembers')}
                </h3>
                <p className="text-xs text-ink-400">{t('accounts.manageHint')}</p>
                <Input
                  label={t('accounts.inviteEmail')}
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder={t('accounts.invitePlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  error={fieldErrors.email}
                />
                <Select
                  label={t('accounts.role')}
                  value={role}
                  onChange={(e) => setRole(e.target.value as AccountRole)}
                >
                  {ROLES.filter((r) => r !== 'owner').map((r) => (
                    <option key={r} value={r}>
                      {t(`roles.${r}`)}
                    </option>
                  ))}
                </Select>
                <Button
                  type="submit"
                  fullWidth
                  loading={inviteMutation.isPending}
                >
                  {t('accounts.invite')}
                </Button>
              </form>
            </Card>
          ) : null}

          <Card className="overflow-hidden animate-fade-in-up" style={{ animationDelay: '80ms' }}>
            <ul className="divide-y divide-ink-50 dark:divide-white/[0.06]">
              {members.data?.map((member) => (
                <li key={member.user_id} className="flex items-center gap-3 px-4 py-3.5">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-xs font-bold text-white">
                    {displayInitials(member.display_name)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-800 dark:text-ink-100">{member.display_name}</p>
                    <p className="truncate text-xs text-ink-400">{member.email}</p>
                  </div>

                  {isOwner && !member.is_owner ? (
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Select
                        aria-label={t('accounts.changeRole')}
                        className="h-9 w-28 px-2 text-xs py-0"
                        value={member.role}
                        onChange={(e) =>
                          roleMutation.mutate({
                            userId: member.user_id,
                            role: e.target.value as AccountRole,
                          })
                        }
                      >
                        {ROLES.map((r) => (
                          <option key={r} value={r}>
                            {t(`roles.${r}`)}
                          </option>
                        ))}
                      </Select>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(t('accounts.removeMember'))) {
                            removeMutation.mutate(member.user_id)
                          }
                        }}
                        disabled={removeMutation.isPending}
                        className="pressable grid h-9 w-9 shrink-0 place-items-center rounded-xl text-red-500 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/15"
                        aria-label={t('accounts.removeMember')}
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
                          <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2.5 py-1 text-[0.65rem] font-bold',
                        member.role === 'owner'
                          ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300'
                          : member.role === 'editor'
                            ? 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300'
                            : 'bg-ink-100 text-ink-500 dark:bg-white/10 dark:text-ink-300',
                      )}
                    >
                      {t(`roles.${member.role}`)}
                    </span>
                  )}
                </li>
              ))}
            </ul>
            {members.data?.length === 0 ? (
              <p className="p-6 text-center text-xs text-ink-400">{t('accounts.noInvitesYet')}</p>
            ) : null}
          </Card>

          {!isOwner ? (
            <Link
              to="/accounts"
              className="block text-center text-sm font-semibold text-brand-600 dark:text-brand-400"
            >
              {t('common.cancel')}
            </Link>
          ) : null}
        </div>
      )}
    </AppShell>
  )
}