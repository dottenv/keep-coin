import { api } from '@/lib/api'

export interface User {
  id: string
  email: string
  display_name: string
  locale: 'ru' | 'en'
  created_at: string
}

export interface RegisterPayload {
  email: string
  password: string
  display_name: string
  locale: 'ru' | 'en'
}

export function register(payload: RegisterPayload): Promise<User> {
  return api('/api/auth/register', { method: 'POST', json: payload })
}

export function login(email: string, password: string): Promise<User> {
  return api('/api/auth/login', {
    method: 'POST',
    json: { email, password },
  })
}

export function logout(): Promise<{ ok: boolean }> {
  return api('/api/auth/logout', { method: 'POST' })
}

export function me(): Promise<User> {
  return api('/api/auth/me')
}

export interface UpdateProfilePayload {
  display_name?: string
  locale?: 'ru' | 'en'
}

export function updateProfile(payload: UpdateProfilePayload): Promise<User> {
  return api('/api/auth/me', { method: 'PUT', json: payload })
}