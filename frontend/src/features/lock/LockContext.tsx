import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { useAuth } from '@/features/auth/AuthContext'
import { haptics } from '@/lib/haptics'

import {
  clearCredentialId,
  clearPin,
  isBiometricEnabled,
  isPinSet,
  setBiometricEnabled,
  setPin as storePin,
  verifyPin,
} from './storage'
import {
  authenticateBiometric,
  isBiometricSupported,
  registerBiometric,
} from './webauthn'

interface LockContextValue {
  /** Экран заблокирован и требует разблокировки. */
  locked: boolean
  /** Установлен ли PIN-код. */
  pinSet: boolean
  /** Биометрия поддерживается устройством/браузером. */
  biometricSupported: boolean
  /** Биометрия включена пользователем. */
  biometricEnabled: boolean
  /** Разблокировать по PIN. Возвращает успех. */
  unlockWithPin: (pin: string) => Promise<boolean>
  /** Разблокировать по биометрии. Возвращает успех. */
  unlockWithBiometric: () => Promise<boolean>
  /** Установить новый PIN (первичная настройка). */
  setupPin: (pin: string) => Promise<void>
  /** Сменить PIN: проверка старого + запись нового. */
  changePin: (oldPin: string, newPin: string) => Promise<boolean>
  /** Полностью отключить экран блокировки. */
  disablePin: () => void
  /** Включить биометрию (регистрирует credential). Может бросить ошибку. */
  enableBiometric: () => Promise<void>
  /** Отключить биометрию. */
  disableBiometric: () => void
}

const LockContext = createContext<LockContextValue | null>(null)

export function LockProvider({ children }: { children: ReactNode }) {
  const { status } = useAuth()

  const [locked, setLocked] = useState(false)
  const [pinSet, setPinSetState] = useState(false)
  const [bioEnabled, setBioEnabledState] = useState(false)
  const [bioSupported, setBioSupported] = useState(false)
  const unlockedSession = useRef(false)

  useEffect(() => {
    setPinSetState(isPinSet())
    setBioEnabledState(isBiometricEnabled())
  }, [])

  useEffect(() => {
    isBiometricSupported().then(setBioSupported).catch(() => setBioSupported(false))
  }, [])

  // Блокируем при входе в авторованную зону, если стоит PIN.
  useEffect(() => {
    if (status === 'authenticated' && isPinSet()) {
      setLocked(true)
    } else if (status !== 'authenticated') {
      setLocked(false)
      unlockedSession.current = false
    }
  }, [status])

  // Переблокировка при возврате из фона (сворачивание/разворачивание),
  // а также при восстановлении страницы из bfcache (iOS часто именно так
  // «перезагружает» PWA). Это превращает резкое пересоздание в привычный
  // экран блокировки вместо скачка на произвольный экран.
  useEffect(() => {
    const lockIfNeeded = () => {
      if (document.visibilityState !== 'visible') return
      if (status === 'authenticated' && isPinSet()) {
        setLocked(true)
      }
    }
    document.addEventListener('visibilitychange', lockIfNeeded)
    window.addEventListener('pageshow', lockIfNeeded)
    return () => {
      document.removeEventListener('visibilitychange', lockIfNeeded)
      window.removeEventListener('pageshow', lockIfNeeded)
    }
  }, [status])

  const unlockWithPin = useCallback(async (pin: string): Promise<boolean> => {
    const ok = await verifyPin(pin)
    if (ok) {
      unlockedSession.current = true
      setLocked(false)
      haptics.success()
      return true
    }
    haptics.error()
    return false
  }, [])

  const unlockWithBiometric = useCallback(async (): Promise<boolean> => {
    try {
      const ok = await authenticateBiometric()
      if (ok) {
        unlockedSession.current = true
        setLocked(false)
        haptics.success()
        return true
      }
    } catch {
      /* пользователь отменил или сбой — остаёмся заблокированными */
    }
    haptics.error()
    return false
  }, [])

  const setupPin = useCallback(async (pin: string) => {
    await storePin(pin)
    setPinSetState(true)
    haptics.success()
  }, [])

  const changePin = useCallback(async (oldPin: string, newPin: string): Promise<boolean> => {
    const ok = await verifyPin(oldPin)
    if (!ok) {
      haptics.error()
      return false
    }
    await storePin(newPin)
    haptics.success()
    return true
  }, [])

  const disablePin = useCallback(() => {
    clearPin()
    clearCredentialId()
    setBiometricEnabled(false)
    setBioEnabledState(false)
    setPinSetState(false)
    haptics.tap()
  }, [])

  const enableBiometric = useCallback(async () => {
    await registerBiometric()
    setBiometricEnabled(true)
    setBioEnabledState(true)
    haptics.success()
  }, [])

  const disableBiometric = useCallback(() => {
    setBiometricEnabled(false)
    setBioEnabledState(false)
    clearCredentialId()
    haptics.tap()
  }, [])

  const value = useMemo<LockContextValue>(
    () => ({
      locked,
      pinSet,
      biometricSupported: bioSupported,
      biometricEnabled: bioEnabled,
      unlockWithPin,
      unlockWithBiometric,
      setupPin,
      changePin,
      disablePin,
      enableBiometric,
      disableBiometric,
    }),
    [
      locked,
      pinSet,
      bioSupported,
      bioEnabled,
      unlockWithPin,
      unlockWithBiometric,
      setupPin,
      changePin,
      disablePin,
      enableBiometric,
      disableBiometric,
    ],
  )

  return <LockContext.Provider value={value}>{children}</LockContext.Provider>
}

export function useLock(): LockContextValue {
  const ctx = useContext(LockContext)
  if (!ctx) throw new Error('useLock must be used within LockProvider')
  return ctx
}
