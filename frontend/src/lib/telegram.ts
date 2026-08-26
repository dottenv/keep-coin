/**
 * Хелперы для работы с Telegram Mini App (window.Telegram.WebApp).
 * Безопасны вне Telegram — все функции возвращают null/нетоп.
 */

export type TelegramTheme = 'light' | 'dark'

export interface TelegramUser {
  id: number
  first_name?: string
  last_name?: string
  username?: string
  photo_url?: string
}

export interface TelegramWebApp {
  initData: string
  initDataUnsafe: { user?: TelegramUser; auth_date?: number; hash?: string }
  colorScheme: TelegramTheme
  themeParams: Record<string, string>
  ready: () => void
  expand: () => void
  openTelegramLink: (url: string) => void
  onThemeChanged: (cb: () => void) => void
  offThemeChanged: (cb: () => void) => void
  [key: string]: unknown
}

export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window === 'undefined') return null
  const tg = (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram?.WebApp
  return tg ?? null
}

export function isTelegramWebApp(): boolean {
  return getTelegramWebApp() !== null
}

export function getTelegramInitData(): string | null {
  const tg = getTelegramWebApp()
  if (!tg) return null
  return tg.initData || null
}

/**
 * Сообщает Telegram, что Mini App готов, раскрывает его на весь экран и
 * синхронизирует тему оформления с цветовой схемой Telegram. Возвращает
 * функцию очистки слушателя смены темы.
 */
export function initTelegramShell(
  onThemeChange?: (theme: TelegramTheme) => void,
): () => void {
  const tg = getTelegramWebApp()
  if (!tg) return () => {}

  try {
    tg.ready?.()
    tg.expand?.()
  } catch {
    /* игнорируем — некритично */
  }

  const applyTheme = () => {
    const theme: TelegramTheme = tg.colorScheme === 'dark' ? 'dark' : 'light'
    onThemeChange?.(theme)
  }
  applyTheme()

  try {
    tg.onThemeChanged?.(applyTheme)
    return () => {
      try {
        tg.offThemeChanged?.(applyTheme)
      } catch {
        /* ignore */
      }
    }
  } catch {
    return () => {}
  }
}

export function openTelegramLink(url: string): void {
  const tg = getTelegramWebApp()
  try {
    tg?.openTelegramLink?.(url)
    return
  } catch {
    /* fallback ниже */
  }
  if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener')
  }
}
