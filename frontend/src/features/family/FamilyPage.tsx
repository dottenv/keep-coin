import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { AppShell } from '@/components/layout/AppShell'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Skeleton } from '@/components/ui/Skeleton'
import { useToast } from '@/components/ui/Toast'
import { errorMessage } from '@/features/auth/errors'
import {
  fetchFamily,
  inviteFamily,
  removeFamilyMember,
  updateFamilyRole,
  type AccountRole,
  type FamilyMember,
} from '@/features/accounts/api'
import { cn } from '@/lib/cn'

function Avatar({ name, email }: { name: string; email: string }) {
  const initial = (name || email || '?').trim().charAt(0).toUpperCase()
  return (
    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand-400 to-brand-600 text-white">
      {initial}
    </span>
  )
}

export function FamilyPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const queryClient = useQueryClient()

  const [email, setEmail] = useState('')
  const [role, setRole] = useState<AccountRole>('viewer')

  const family = useQuery({ queryKey: ['family'], queryFn: fetchFamily })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['family'] })
    queryClient.invalidateQueries({ queryKey: ['accounts'] })
    queryClient.invalidateQueries({ queryKey: ['transactions'] })
    queryClient.invalidateQueries({ queryKey: ['summary'] })
  }

  const inviteMutation = useMutation({
    mutationFn: () => inviteFamily(email.trim(), role),
    onSuccess: () => {
      invalidate()
      setEmail('')
      toast.show(t('family.inviteSent'), 'success')
    },
    onError: (error) => toast.show(errorMessage(error), 'error'),
  })

  const removeMutation = useMutation({
    mutationFn: (userId: string) => removeFamilyMember(userId),
    onSuccess: () => {
      invalidate()
      toast.show(t('family.memberRemoved'), 'success')
    },
    onError: (error) => toast.show(errorMessage(error), 'error'),
  })

  const leaveMutation = useMutation({
    mutationFn: (userId: string) => removeFamilyMember(userId),
    onSuccess: () => {
      invalidate()
      toast.show(t('family.leftFamily'), 'success')
    },
    onError: (error) => toast.show(errorMessage(error), 'error'),
  })

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: AccountRole }) =>
      updateFamilyRole(userId, role),
    onSuccess: () => {
      invalidate()
      toast.show(t('family.roleUpdated'), 'success')
    },
    onError: (error) => toast.show(errorMessage(error), 'error'),
  })

  const members: FamilyMember[] = family.data ?? []
  const sharedWithMe = members.filter((m) => m.relation === 'member')
  const youShare = members.filter((m) => m.relation === 'owner')

  return (
    <AppShell>
      <PageHeader title={t('family.title')} subtitle={t('family.subtitle')} backTo="/accounts" />

      <div className="space-y-4">
        <Card className="p-4 animate-fade-in-up">
          <p className="text-sm font-semibold text-ink-800 dark:text-ink-100">{t('family.invite')}</p>
          <p className="mt-0.5 text-xs text-ink-400">{t('family.manageHint')}</p>
          <div className="mt-3 flex gap-2">
            <input
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('family.invitePlaceholder')}
              className="h-10 min-w-0 flex-1 rounded-xl border border-ink-200 bg-white/80 px-3 text-sm outline-none dark:border-white/15 dark:bg-white/[0.07] dark:text-ink-100"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as AccountRole)}
              className="h-10 rounded-xl border border-ink-200 bg-white/80 px-2 text-sm outline-none dark:border-white/15 dark:bg-white/[0.07] dark:text-ink-100"
            >
              <option value="viewer">{t('roles.viewer')}</option>
              <option value="editor">{t('roles.editor')}</option>
            </select>
            <Button
              variant="primary"
              size="sm"
              loading={inviteMutation.isPending}
              disabled={!email.trim()}
              onClick={() => inviteMutation.mutate()}
            >
              {t('common.send')}
            </Button>
          </div>
        </Card>

        {family.isPending ? (
          <div className="space-y-3">
            <Skeleton className="h-20 rounded-[1.5rem]" />
            <Skeleton className="h-20 rounded-[1.5rem]" />
          </div>
        ) : members.length === 0 ? (
          <Card className="p-10 text-center animate-fade-in">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-brand-50 text-brand-500 dark:bg-brand-500/15 dark:text-brand-300">
              <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </span>
            <p className="mt-4 text-sm font-medium text-ink-700 dark:text-ink-200">{t('family.noMembers')}</p>
            <p className="mt-1 text-xs text-ink-400">{t('family.manageHint')}</p>
          </Card>
        ) : (
          <>
            {sharedWithMe.length > 0 ? (
              <section>
                <h2 className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">{t('family.sharedWithYou')}</h2>
                <div className="space-y-3">
                  {sharedWithMe.map((m, index) => (
                    <Card key={m.user_id} className="flex items-center gap-3 p-4 animate-fade-in-up" style={{ animationDelay: `${index * 60}ms` }}>
                      <Avatar name={m.display_name} email={m.email} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink-800 dark:text-ink-100">{m.display_name || m.email}</p>
                        <p className="truncate text-xs text-ink-400">{m.email}</p>
                      </div>
                      <Button variant="outline" size="sm" loading={leaveMutation.isPending} onClick={() => leaveMutation.mutate(m.user_id)}>
                        {t('family.leave')}
                      </Button>
                    </Card>
                  ))}
                </div>
              </section>
            ) : null}

            {youShare.length > 0 ? (
              <section>
                <h2 className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">{t('family.youShare')}</h2>
                <p className="px-1 pb-2 text-xs text-ink-400">{t('family.yourAccountsHint')}</p>
                <div className="space-y-3">
                  {youShare.map((m, index) => (
                    <Card key={m.user_id} className="flex items-center gap-3 p-4 animate-fade-in-up" style={{ animationDelay: `${index * 60}ms` }}>
                      <Avatar name={m.display_name} email={m.email} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-ink-800 dark:text-ink-100">{m.display_name || m.email}</p>
                        <p className="truncate text-xs text-ink-400">{m.email}</p>
                      </div>
                      <select
                        value={m.role}
                        onChange={(e) => roleMutation.mutate({ userId: m.user_id, role: e.target.value as AccountRole })}
                        disabled={roleMutation.isPending}
                        className="h-9 rounded-xl border border-ink-200 bg-white/80 px-2 text-xs outline-none dark:border-white/15 dark:bg-white/[0.07] dark:text-ink-100"
                      >
                        <option value="viewer">{t('roles.viewer')}</option>
                        <option value="editor">{t('roles.editor')}</option>
                      </select>
                      <Button variant="ghost" size="sm" loading={removeMutation.isPending} onClick={() => removeMutation.mutate(m.user_id)}>
                        {t('family.removeMember')}
                      </Button>
                    </Card>
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </div>
    </AppShell>
  )
}
