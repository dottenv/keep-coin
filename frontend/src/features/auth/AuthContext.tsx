import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react'

import { onUnauthorized } from '@/lib/api'
import { getTelegramInitData } from '@/lib/telegram'

import * as authApi from './api'
import type { TelegramProfile, User } from './api'

type Session = {
  status: 'unknown' | 'authenticated' | 'anonymous'
  user: User | null
}

type Action =
  | { type: 'restore' }
  | { type: 'set_user'; user: User }
  | { type: 'clear' }

function reducer(_state: Session, action: Action): Session {
  switch (action.type) {
    case 'restore':
      return { status: 'unknown', user: null }
    case 'set_user':
      return { status: 'authenticated', user: action.user }
    case 'clear':
      return { status: 'anonymous', user: null }
  }
}

interface AuthContextValue extends Session {
  login: (email: string, password: string) => Promise<void>
  register: (payload: authApi.RegisterPayload) => Promise<void>
  updateProfile: (payload: authApi.UpdateProfilePayload) => Promise<User>
  logout: () => Promise<void>
  /** Данные Telegram-пользователя, ожидающие завершения регистрации. */
  telegramPending: TelegramProfile | null
  /**
   * Автоматический вход через Telegram WebApp: если аккаунт уже привязан —
   * авторизует, иначе сохраняет telegramPending для экрана регистрации.
   */
  telegramAutoLogin: () => Promise<'ok' | 'new' | 'none'>
  telegramRegister: (payload: authApi.TelegramRegisterPayload) => Promise<void>
  telegramLink: (initData: string, linkToken: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    status: 'unknown',
    user: null,
  })
  const [telegramPending, setTelegramPending] = useState<TelegramProfile | null>(null)

  useEffect(() => {
    dispatch({ type: 'restore' })
    authApi
      .me()
      .then((user) => dispatch({ type: 'set_user', user }))
      .catch(() => dispatch({ type: 'clear' }))
  }, [])

  useEffect(() => {
    return onUnauthorized(() => dispatch({ type: 'clear' }))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const user = await authApi.login(email, password)
    dispatch({ type: 'set_user', user })
  }, [])

  const register = useCallback(
    async (payload: authApi.RegisterPayload) => {
      const user = await authApi.register(payload)
      dispatch({ type: 'set_user', user })
    },
    [],
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      dispatch({ type: 'clear' })
    }
  }, [])

  const updateProfile = useCallback(
    async (payload: authApi.UpdateProfilePayload): Promise<User> => {
      const updated = await authApi.updateProfile(payload)
      dispatch({ type: 'set_user', user: updated })
      return updated
    },
    [],
  )

  const telegramAutoLogin = useCallback(async (): Promise<'ok' | 'new' | 'none'> => {
    const initData = getTelegramInitData()
    if (!initData) return 'none'
    try {
      const result = await authApi.telegramLogin(initData)
      if (result.status === 'ok' && result.user) {
        dispatch({ type: 'set_user', user: result.user })
        setTelegramPending(null)
        return 'ok'
      } else if (result.status === 'new' && result.telegram) {
        setTelegramPending(result.telegram)
        return 'new'
      }
    } catch {
      /* оставляем пользователя в гостевом режиме */
    }
    return 'none'
  }, [])

  const telegramRegister = useCallback(
    async (payload: authApi.TelegramRegisterPayload) => {
      const user = await authApi.telegramRegister(payload)
      dispatch({ type: 'set_user', user })
      setTelegramPending(null)
    },
    [],
  )

  const telegramLink = useCallback(async (initData: string, linkToken: string) => {
    const result = await authApi.telegramLink(initData, linkToken)
    dispatch({ type: 'set_user', user: result.user })
  }, [])

  const value = useMemo(
    () => ({
      ...state,
      login,
      register,
      updateProfile,
      logout,
      telegramPending,
      telegramAutoLogin,
      telegramRegister,
      telegramLink,
    }),
    [
      state,
      login,
      register,
      updateProfile,
      logout,
      telegramPending,
      telegramAutoLogin,
      telegramRegister,
      telegramLink,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return ctx
}