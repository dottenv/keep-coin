import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { useToast } from '@/components/ui/Toast'
import { useTheme } from '@/components/theme/ThemeProvider'
import { useAuth } from '@/features/auth/AuthContext'
import { getTelegramInitData, initTelegramShell, isTelegramWebApp } from '@/lib/telegram'

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
    const cleanup = initTelegramShell((theme) => setTheme(theme))
    return cleanup
  }, [setTheme])

  useEffect(() => {
    if (!isTelegramWebApp()) return
    const initData = getTelegramInitData()
    if (!initData) return

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

    telegramAutoLogin().then((status) => {
      if (status === 'new') {
        navigate('/telegram/register', { replace: true })
      }
    })
    // Запускаем один раз при монтировании.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
