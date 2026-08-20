import { api } from '@/lib/api'

export async function fetchKeywords(): Promise<string[]> {
  const body = await api<{ keywords: string[] }>('/api/settings/keywords')
  return body.keywords
}

export async function resetKeywords(): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>('/api/settings/keywords', { method: 'DELETE' })
}

export async function wipeAllData(): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>('/api/settings/data', { method: 'DELETE' })
}