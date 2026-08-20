import i18n from '@/i18n'

/** BCP-47-локаль для Intl API (ru-RU для русского, иначе en-US). */
export function getIntlLocale(): string {
  return i18n.language.startsWith('ru') ? 'ru-RU' : 'en-US'
}

export function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat(getIntlLocale(), {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/** Сумма операции: расход идёт с минусом и «danger»-цветом (цвет выбирает вызывающий код). */
export function formatSignedMoney(value: number, currency: string): string {
  const sign = value < 0 ? '−' : '+'
  return `${sign} ${formatMoney(Math.abs(value), currency)}`
}

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
}

const MONTHYEAR_FORMAT: Intl.DateTimeFormatOptions = {
  month: 'long',
  year: 'numeric',
}

export function formatShortDate(iso: string): string {
  return new Intl.DateTimeFormat(getIntlLocale(), DATE_FORMAT).format(new Date(iso))
}

const LONG_DATE_FORMAT: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}

export function formatLongDate(iso: string): string {
  return new Intl.DateTimeFormat(getIntlLocale(), LONG_DATE_FORMAT).format(new Date(iso))
}

export function formatMonthYear(iso: string): string {
  return new Intl.DateTimeFormat(getIntlLocale(), MONTHYEAR_FORMAT).format(new Date(iso))
}

export function isToday(iso: string): boolean {
  const now = new Date()
  const d = new Date(iso)
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  )
}

/** Сегодня в формате yyyy-mm-dd (для <input type="date">). */
export function todayISO(): string {
  const now = new Date()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${mm}-${dd}`
}

/** Инициалы из имени пользователя («Иван Петров» → «ИП»). */
export function displayInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  const initials = (parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')
  return initials.toUpperCase() || '?'
}