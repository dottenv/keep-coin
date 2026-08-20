import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

/**
 * Глобальный boundary: при любой ошибке рендера/ленивого чанка (например,
 * когда телефон после «вылета» открывает старую/битую сборку из кеша)
 * один раз перезагружает страницу, чтобы подтянулся свежий бандл.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[error-boundary]', error, info)

    if (navigator.onLine !== false) {
      const attempts = Number(sessionStorage.getItem('kc-crash-heal') ?? '0')
      if (attempts < 2) {
        sessionStorage.setItem('kc-crash-heal', String(attempts + 1))
        window.location.reload()
      }
    }
  }

  render() {
    if (this.state.hasError) return <BoundaryFallback />
    return this.props.children
  }
}

/**
 * Фолбэк НЕ использует i18n/хуки: он рендерится из ошибки, которая сама может
 * быть вызвана сломанными хуками/локализацией. Только статичный текст — тогда
 * пользователь всегда увидит кнопку восстановления, а не белый экран.
 */
function BoundaryFallback() {
  return (
    <div className="grid min-h-dvh place-items-center bg-ink-50 px-6 dark:bg-ink-950">
      <div className="glass-card w-full max-w-sm p-8 text-center">
        <p className="text-2xl font-bold text-ink-900 dark:text-ink-100">Что-то пошло не так</p>
        <button
          type="button"
          onClick={() => {
            sessionStorage.removeItem('kc-crash-heal')
            window.location.reload()
          }}
          className="pressable mt-6 w-full rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 px-4 py-3 font-semibold text-white"
        >
          Перезапустить
        </button>
      </div>
    </div>
  )
}