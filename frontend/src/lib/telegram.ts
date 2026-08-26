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

/**
 * Безопасные отступы (в пикселях), которые Telegram резервирует под свою
 * собственную оболочку (верхняя панель с кнопкой закрытия, нижняя панель,
 * вырезы устройства). Используем contentSafeAreaInset, при его отсутствии —
 * safeAreaInset. Вне Telegram возвращает нули.
 */
export interface TelegramInsets {
  top: number
  bottom: number
  left: number
  right: number
}

export function getTelegramContentSafeArea(): TelegramInsets {
  const tg = getTelegramWebApp() as unknown as {
    contentSafeAreaInset?: TelegramInsets
    safeAreaInset?: TelegramInsets
  } | null
  if (!tg) return { top: 0, bottom: 0, left: 0, right: 0 }
  const area = tg.contentSafeAreaInset ?? tg.safeAreaInset
  if (!area) return { top: 0, bottom: 0, left: 0, right: 0 }
  return {
    top: Number(area.top) || 0,
    bottom: Number(area.bottom) || 0,
    left: Number(area.left) || 0,
    right: Number(area.right) || 0,
  }
}

/** Стабильная высота видимой области Mini App (без всплывающей клавиатуры). */
export function getTelegramViewportStableHeight(): number | null {
  const tg = getTelegramWebApp() as unknown as { viewportStableHeight?: number } | null
  const h = tg?.viewportStableHeight
  return typeof h === 'number' && h > 0 ? h : null
}

/**
 * Прокидывает safe-area отступы и высоту viewport в CSS-переменные на <html>,
 * чтобы верстка (шапка, нижняя навигация) корректно учитывала оболочку Telegram.
 * Вне Telegram переменные не устанавливаются (используются значения по умолчанию).
 */
export function applyTelegramInsets(): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const { top, bottom, left, right } = getTelegramContentSafeArea()
  root.style.setProperty('--tg-safe-area-top', `${top}px`)
  root.style.setProperty('--tg-safe-area-bottom', `${bottom}px`)
  root.style.setProperty('--tg-safe-area-left', `${left}px`)
  root.style.setProperty('--tg-safe-area-right', `${right}px`)
  const h = getTelegramViewportStableHeight()
  if (h) root.style.setProperty('--tg-viewport-height', `${h}px`)
}

type TelegramEventCb = () => void

/** Подписка на изменение safe-area (например, вход/выход из fullscreen). */
export function onTelegramSafeAreaChange(cb: TelegramEventCb): () => void {
  const tg = getTelegramWebApp() as unknown as {
    onContentSafeAreaChanged?: (cb: TelegramEventCb) => void
    offContentSafeAreaChanged?: (cb: TelegramEventCb) => void
    onSafeAreaChanged?: (cb: TelegramEventCb) => void
    offSafeAreaChanged?: (cb: TelegramEventCb) => void
  } | null
  if (!tg) return () => {}

  const offs: Array<() => void> = []
  const bind = (
    on?: (cb: TelegramEventCb) => void,
    off?: (cb: TelegramEventCb) => void,
  ) => {
    if (typeof on !== 'function') return
    const handler: TelegramEventCb = () => cb()
    try {
      on(handler)
      offs.push(() => {
        try {
          off?.(handler)
        } catch {
          /* ignore */
        }
      })
    } catch {
      /* ignore */
    }
  }

  bind(tg.onContentSafeAreaChanged, tg.offContentSafeAreaChanged)
  bind(tg.onSafeAreaChanged, tg.offSafeAreaChanged)
  return () => offs.forEach((off) => off())
}

/** Подписка на изменение viewport (в т.ч. высоты при открытии клавиатуры). */
export function onTelegramViewportChange(cb: TelegramEventCb): () => void {
  const tg = getTelegramWebApp() as unknown as {
    onViewportChanged?: (cb: TelegramEventCb) => void
    offViewportChanged?: (cb: TelegramEventCb) => void
  } | null
  if (!tg || typeof tg.onViewportChanged !== 'function') return () => {}

  const handler: TelegramEventCb = () => cb()
  try {
    tg.onViewportChanged(handler)
    return () => {
      try {
        tg.offViewportChanged?.(handler)
      } catch {
        /* ignore */
      }
    }
  } catch {
    return () => {}
  }
}
