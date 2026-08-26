import { api } from '@/lib/api'

export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export function notificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied'
  return Notification.permission
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i)
  return output
}

export async function getVapidPublicKey(): Promise<string> {
  const data = await api<{ publicKey: string }>('/api/push/vapid-public-key')
  return data.publicKey
}

export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator)) return null
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

/** Запрашивает разрешение, подписывается на push и сохраняет подписку на бэкенде. */
export async function subscribeToPush(): Promise<boolean> {
  if (!isPushSupported()) return false
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  const reg = await navigator.serviceWorker.ready
  let subscription = await reg.pushManager.getSubscription()
  if (!subscription) {
    const vapidKey = await getVapidPublicKey()
    subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    })
  }

  const raw = JSON.parse(JSON.stringify(subscription))
  await api('/api/push/subscribe', {
    method: 'POST',
    json: { endpoint: raw.endpoint, p256dh: raw.keys.p256dh, auth: raw.keys.auth },
  })
  return true
}

export async function unsubscribeFromPush(): Promise<void> {
  if (!('serviceWorker' in navigator)) return
  const reg = await navigator.serviceWorker.ready
  const subscription = await reg.pushManager.getSubscription()
  if (subscription) {
    await api('/api/push/unsubscribe', {
      method: 'DELETE',
      json: { endpoint: subscription.endpoint },
    })
    await subscription.unsubscribe()
  }
}

export async function sendTestPush(): Promise<number> {
  const data = await api<{ sent: number }>('/api/push/test', { method: 'POST' })
  return data.sent
}
