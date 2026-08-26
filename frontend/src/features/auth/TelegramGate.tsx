import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/components/ui/Toast'
import { useTheme } from '@/components/theme/ThemeProvider'
import { useAuth } from '@/features/auth/AuthContext'
import { initTelegramShell, isTelegramWebApp, waitForTelegramInitData, applyTelegramInsets, onTelegramSafeAreaChange, onTelegramViewportChange } from '@/lib/telegram'

/**
 * Монтируется внутри AuthProvider + ThemeProvider. Отвечает за:
 *  - синхронизацию темы оформления с Telegram (colorScheme);
 *  - автоматический вход / привязку аккаунта при открытии Mini App.
 * Ничего не рендерит.
 */
export function TelegramGate() {
  const { telegramAutoLogin, telegramLink } = useAuth()
  const { setTheme } = useTheme()
  const navigate = useNavigate()
  const toast = useToast()
  const { t } = useTranslation()

  useEffect(() => {
    const cleanupShell = initTelegramShell((theme) => setTheme(theme))
    // Учитываем safe-area отступы Telegram (верхняя/нижняя панели, вырезы).
    applyTelegramInsets()
    const offSafe = onTelegramSafeAreaChange(applyTelegramInsets)
    const offViewport = onTelegramViewportChange(applyTelegramInsets)
    return () => {
      cleanupShell()
      offSafe()
      offViewport()
    }
  }, [setTheme])

  useEffect(() => {
    if (!isTelegramWebApp()) return
    let cancelled = false

    ;(async () => {
      // Telegram может инициализировать initData чуть позже маунта.
      const initData = await waitForTelegramInitData()
      if (cancelled || !initData) {
        if (!cancelled) {
          console.warn('[TelegramGate] initData не получен — автологин пропущен')
        }
        return
      }

      const params = new URLSearchParams(window.location.search)
      const linkToken = params.get('link_token')

      if (linkToken) {
        telegramLink(initData, linkToken)
          .then(() => {
            toast.show(t('telegram.linkedToast'), 'success')
            navigate('/', { replace: true })
          })
          .catch(() => toast.show(t('telegram.linkError'), 'error'))
        return
      }

      telegramAutoLogin()
        .then((status) => {
          if (status === 'ok') navigate('/', { replace: true })
        })
        .catch((err) => {
          console.error('[TelegramGate] автологин не удался', err)
        })
    })()

    return () => {
      cancelled = true
    }
    // Запускаем один раз при монтировании.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
