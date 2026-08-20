import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import { en } from './en'
import { ru } from './ru'

export const LANGUAGES = [
  { code: 'ru', labelKey: 'language.ru' },
  { code: 'en', labelKey: 'language.en' },
] as const

const saved = localStorage.getItem('keep-coin-lang')
const initial = saved === 'en' || saved === 'ru' ? saved : 'ru'

i18n.use(initReactI18next).init({
  resources: {
    ru: { translation: ru },
    en: { translation: en },
  },
  lng: initial,
  fallbackLng: 'ru',
  interpolation: {
    escapeValue: false,
  },
})

export const setLanguage = (lng: 'ru' | 'en') => {
  localStorage.setItem('keep-coin-lang', lng)
  i18n.changeLanguage(lng)
}

export default i18n