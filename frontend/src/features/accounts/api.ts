import { api } from '@/lib/api'

export type AccountType = 'cash' | 'card' | 'wallet' | 'saving'

export type AccountRole = 'owner' | 'editor' | 'viewer'

export interface Account {
  id: string
  name: string
  type: AccountType
  balance: number
  currency: string
  role: AccountRole
  is_shared: boolean
  owner_name: string | null
  created_at: string
}

export interface CreateAccountPayload {
  name: string
  type: AccountType
  balance: number
  currency?: string
}

export interface AccountsResponse {
  accounts: Account[]
}

export async function fetchAccounts(): Promise<Account[]> {
  const body = await api<AccountsResponse>('/api/accounts')
  return body.accounts
}

export async function createAccount(payload: CreateAccountPayload): Promise<Account> {
  return api<Account>('/api/accounts', { method: 'POST', json: payload })
}

export async function updateAccount(
  id: string,
  payload: Partial<Pick<Account, 'name' | 'type'>>,
): Promise<Account> {
  return api<Account>(`/api/accounts/${id}`, { method: 'PATCH', json: payload })
}

export async function deleteAccount(id: string): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>(`/api/accounts/${id}`, { method: 'DELETE' })
}

export interface AccountMember {
  user_id: string
  display_name: string
  email: string
  role: AccountRole
  is_owner: boolean
}

export interface AccountInvite {
  id: string
  account_id: string
  account_name: string
  inviter_name: string
  role: AccountRole
  created_at: string
}

interface MembersResponse {
  members: AccountMember[]
}

interface InvitesResponse {
  invites: AccountInvite[]
}

export async function fetchMembers(accountId: string): Promise<AccountMember[]> {
  const body = await api<MembersResponse>(`/api/accounts/${accountId}/members`)
  return body.members
}

export async function inviteMember(
  accountId: string,
  email: string,
  role: AccountRole,
): Promise<AccountInvite> {
  return api<AccountInvite>(`/api/accounts/${accountId}/members`, {
    method: 'POST',
    json: { email, role },
  })
}

export async function updateMemberRole(
  accountId: string,
  userId: string,
  role: AccountRole,
): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>(`/api/accounts/${accountId}/members/${userId}`, {
    method: 'PATCH',
    json: { role },
  })
}

export async function removeMember(
  accountId: string,
  userId: string,
): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>(`/api/accounts/${accountId}/members/${userId}`, {
    method: 'DELETE',
  })
}

export async function fetchPendingInvites(): Promise<AccountInvite[]> {
  const body = await api<InvitesResponse>('/api/invites')
  return body.invites
}

export async function acceptInvite(inviteId: string): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>(`/api/invites/${inviteId}/accept`, { method: 'POST' })
}

export async function declineInvite(inviteId: string): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>(`/api/invites/${inviteId}`, { method: 'DELETE' })
}