import { api } from '@/lib/api'

export interface User {
  id: string
  email: string
  display_name: string
  locale: 'ru' | 'en'
  created_at: string
  telegram_username?: string | null
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

/* ── Telegram Mini App ─────────────────────────────────────────────── */

export interface TelegramProfile {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  photo_url?: string
}

export interface TelegramLoginResult {
  status: 'ok' | 'new'
  user?: User
  telegram?: TelegramProfile
}

export function telegramLogin(initData: string): Promise<TelegramLoginResult> {
  return api('/api/auth/telegram/login', { method: 'POST', json: { init_data: initData } })
}

export function telegramAuto(initData: string): Promise<User> {
  return api('/api/auth/telegram/auto', { method: 'POST', json: { init_data: initData } })
}

export interface TelegramRegisterPayload {
  init_data: string
  email: string
  password: string
  display_name: string
  locale: 'ru' | 'en'
}

export function telegramRegister(payload: TelegramRegisterPayload): Promise<User> {
  return api('/api/auth/telegram/register', { method: 'POST', json: payload })
}

export function telegramLink(
  initData: string,
  linkToken: string,
): Promise<{ status: 'ok'; user: User }> {
  return api('/api/auth/telegram/link', {
    method: 'POST',
    json: { init_data: initData, link_token: linkToken },
  })
}

export interface TelegramLinkToken {
  link_token: string
  bot_deep_link: string | null
  webapp_url: string | null
}

export function createTelegramLinkToken(): Promise<TelegramLinkToken> {
  return api('/api/auth/telegram/link-token', { method: 'POST' })
}
