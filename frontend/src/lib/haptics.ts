/**
 * Haptics / виброотклик.
 *
 * - Android (Chrome/WebView): стандартный Web Vibration API — navigator.vibrate.
 * - Telegram Mini App: родной HapticFeedback (самый отзывчивый, работает и на iOS).
 * - iOS Safari (PWA вне Telegram): Web Vibration API НЕ поддерживается браузером,
 *   поэтому вызовы безопасно становятся no-op. Биометрия/системные жесты при этом
 *   всё равно дают нативную вибрацию через WebAuthn/скролл.
 */

type VibratePattern = number | number[]

interface TelegramHaptic {
  impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void
  notificationOccurred: (type: 'error' | 'success' | 'warning') => void
  selectionChanged: () => void
}

function getTelegramHaptics(): TelegramHaptic | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { Telegram?: { WebApp?: { HapticFeedback?: TelegramHaptic } } }
  return w.Telegram?.WebApp?.HapticFeedback ?? null
}

function canVibrate(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
}

function triggerVibrate(pattern: VibratePattern): void {
  if (!canVibrate()) return
  try {
    navigator.vibrate(pattern)
  } catch {
    /* некритично — например, ограничения фоновых вкладок */
  }
}

export const haptics = {
  /** Лёгкое нажатие кнопки/ссылки. */
  tap(): void {
    const tg = getTelegramHaptics()
    if (tg) return tg.impactOccurred('light')
    triggerVibrate(10)
  },

  /** Переключение выбора в списке/сегменте. */
  selection(): void {
    const tg = getTelegramHaptics()
    if (tg) return tg.selectionChanged()
    triggerVibrate(8)
  },

  /** Переход между экранами (нижняя навигация). */
  navigation(): void {
    const tg = getTelegramHaptics()
    if (tg) return tg.impactOccurred('light')
    triggerVibrate(12)
  },

  /** Заметное действие (открытие меню FAB, подтверждение). */
  impact(): void {
    const tg = getTelegramHaptics()
    if (tg) return tg.impactOccurred('medium')
    triggerVibrate(18)
  },

  /** Сильное действие. */
  heavy(): void {
    const tg = getTelegramHaptics()
    if (tg) return tg.impactOccurred('heavy')
    triggerVibrate([20, 30, 20])
  },

  /** Успех (верный пин-код, сохранение). */
  success(): void {
    const tg = getTelegramHaptics()
    if (tg) return tg.notificationOccurred('success')
    triggerVibrate([12, 40, 18])
  },

  /** Предупреждение. */
  warning(): void {
    const tg = getTelegramHaptics()
    if (tg) return tg.notificationOccurred('warning')
    triggerVibrate([20, 60, 20])
  },

  /** Ошибка (неверный пин-код). */
  error(): void {
    const tg = getTelegramHaptics()
    if (tg) return tg.notificationOccurred('error')
    triggerVibrate([40, 50, 40, 50, 40])
  },
}

/** Прямой доступ к вибрации (если нужен кастомный паттерн). */
export function vibrate(pattern: VibratePattern): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern)
    } catch {
      /* ignore */
    }
  }
}
