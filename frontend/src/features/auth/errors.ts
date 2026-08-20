import i18n from '@/i18n'
import { ApiError } from '@/lib/api'
import type { ToastContextValue } from '@/components/ui/Toast'

interface ValidationPayload {
  error?: string
  message?: string
  messages?: Record<string, string[] | string>
}

/** Переводит код ошибки API (например email_taken) через i18n. */
export function translateCode(code: string): string {
  const authKey = `auth.errors.${code}`
  if (i18n.exists(authKey)) return i18n.t(authKey)
  const genericKey = `errors.${code}`
  if (i18n.exists(genericKey)) return i18n.t(genericKey)
  return code
}

/** Разворачивает messages валидации API в { field: переведённая_ошибка }. */
export function extractFieldErrors(payload: ValidationPayload | null): Record<string, string> {
  const result: Record<string, string> = {}
  if (!payload || typeof payload !== 'object') return result
  const messages = (payload as ValidationPayload).messages
  if (!messages) return result
  for (const [field, value] of Object.entries(messages)) {
    const codes = Array.isArray(value) ? value : [value]
    result[field] = translateCode(codes[0])
  }
  return result
}

/** Человекочитаемое сообщение об ошибке поверх ApiError. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const payload = error.payload as ValidationPayload | null
    if (payload?.message) return String(payload.message)
    if (payload?.error) return translateCode(payload.error)
    if (payload?.messages) {
      const first = Object.values(payload.messages).flat()[0]
      if (first) return translateCode(String(first))
    }
  }
  return i18n.t('api.networkError')
}

/** Показать нотификацию фейла + вернуть fieldErrors для формы. */
export function notifyError(
  error: unknown,
  toast: Pick<ToastContextValue, 'show'>,
): Record<string, string> {
  const fieldErrors = extractFieldErrors(
    error instanceof ApiError ? (error.payload as ValidationPayload | null) : null,
  )
  toast.show(errorMessage(error), 'error')
  return fieldErrors
}