import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'

import { App } from '@/app/App'
import { AppErrorBoundary } from '@/components/ui/AppErrorBoundary'
import './index.css'

/**
 * В dev-режиме PWA не нужен, а вот случайно зарегистрированный dev-сервис-воркер —
 * вреден: он кэширует чанки со старыми `?v=`-хэшами предбандла Vite и отдаёт их
 * вперемешку с новыми. Это даёт сразу две копии React в одной странице →
 * «Invalid hook call» и белый экран. Снимаем все регистрации и чистим кеши.
 * В проде ничего не трогаем — там работает штатный sw.js (autoUpdate).
 */
function cleanupStaleWorkers(): void {
  if (import.meta.env.PROD) return
  if (!('serviceWorker' in navigator)) return
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) =>
      Promise.all(registrations.map((reg) => reg.unregister().catch(() => false))),
    )
    .then(() => caches.keys())
    .then((names) => Promise.all(names.map((name) => caches.delete(name).catch(() => false))))
    .catch(() => {})
}

if (import.meta.env.PROD) {
  registerSW({ immediate: true })
} else {
  cleanupStaleWorkers()
}

/*
 * Самовосстановление UI на мобильных: HTML часто успевает загрузиться,
 * а CSS-запрос на слабой сети отклоняется/гаснет (особенно после «вылета»
 * или восстановления вкладки) — приложение рендерится без стилей,
 * «чёрно-белым». Если через пару секунд маркер стилей не сработал —
 * один раз перезагружаем страницу (свежий запрос CSS).
 */
function isStandalonePwa(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: fullscreen)').matches ||
    ('standalone' in navigator && (navigator as Navigator & { standalone?: boolean }).standalone === true)
  )
}

function healMissingCss(): void {
  const probe = document.createElement('span')
  probe.className = 'css-probe'
  probe.style.position = 'absolute'
  probe.style.top = '-9999px'
  document.body.appendChild(probe)

  const applied = () =>
    getComputedStyle(probe).getPropertyValue('--probe').trim() === '1'

  if (applied()) {
    probe.remove()
    return
  }

  window.setTimeout(() => {
    const healed = applied()
    probe.remove()
    if (healed) return
    const attempts = Number(sessionStorage.getItem('kc-css-heal') ?? '0')
    // В установленном PWA перезагрузка может выбросить в Safari — не делаем её.
    // SW кеширует CSS, поэтому на повторных открытиях стили будут сразу.
    if (navigator.onLine === false || attempts >= 2 || isStandalonePwa()) return
    sessionStorage.setItem('kc-css-heal', String(attempts + 1))
    window.location.reload()
  }, 2500)
}

healMissingCss()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </StrictMode>,
)