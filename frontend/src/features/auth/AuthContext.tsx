import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'

import { onUnauthorized } from '@/lib/api'

import * as authApi from './api'
import type { User } from './api'

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
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    status: 'unknown',
    user: null,
  })

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

  const value = useMemo(
    () => ({ ...state, login, register, updateProfile, logout }),
    [state, login, register, updateProfile, logout],
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