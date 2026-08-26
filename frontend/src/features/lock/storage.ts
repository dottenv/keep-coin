/**
 * Локальное хранилище настроек экрана блокировки.
 *
 * Важно: это PWA-клиент, поэтому PIN и признак биометрии хранятся только на
 * устройстве (localStorage). Это НЕ заменяет серверную аутентификацию и не
 * защищает данные от физического доступа к устройству — задача экрана
 * блокировки лишь предотвратить случайный просмотр чужим человеком (при
 * возврате из фона, после блокировки телефона и т.п.). PIN хешируется,
 * но извлечь его можно при прямом доступе к localStorage — как и любой
 * client-side секрет.
 */

const PIN_HASH_KEY = 'kc-lock-pin-hash'
const BIO_ENABLED_KEY = 'kc-lock-bio'
const BIO_CRED_ID_KEY = 'kc-lock-cred-id'
const BIO_USER_ID_KEY = 'kc-lock-user-id'

const PIN_SALT = 'keep-coin::v1::pin'

function b64urlEncode(bytes: ArrayBuffer): string {
  const arr = new Uint8Array(bytes)
  let str = ''
  for (let i = 0; i < arr.length; i++) str += String.fromCharCode(arr[i])
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return b64urlEncode(digest)
}

export async function hashPin(pin: string): Promise<string> {
  return sha256(`${PIN_SALT}:${pin}`)
}

export function isPinSet(): boolean {
  try {
    return Boolean(localStorage.getItem(PIN_HASH_KEY))
  } catch {
    return false
  }
}

export async function verifyPin(pin: string): Promise<boolean> {
  try {
    const expected = localStorage.getItem(PIN_HASH_KEY)
    if (!expected) return false
    return (await hashPin(pin)) === expected
  } catch {
    return false
  }
}

export async function setPin(pin: string): Promise<void> {
  try {
    localStorage.setItem(PIN_HASH_KEY, await hashPin(pin))
  } catch {
    /* ignore */
  }
}

export function clearPin(): void {
  try {
    localStorage.removeItem(PIN_HASH_KEY)
  } catch {
    /* ignore */
  }
}

export function isBiometricEnabled(): boolean {
  try {
    return localStorage.getItem(BIO_ENABLED_KEY) === '1'
  } catch {
    return false
  }
}

export function setBiometricEnabled(value: boolean): void {
  try {
    localStorage.setItem(BIO_ENABLED_KEY, value ? '1' : '0')
  } catch {
    /* ignore */
  }
}

/** Сохраняем rawId платформенного credential в base64url. */
export function setCredentialId(id: string): void {
  try {
    localStorage.setItem(BIO_CRED_ID_KEY, id)
  } catch {
    /* ignore */
  }
}

export function getCredentialId(): string | null {
  try {
    return localStorage.getItem(BIO_CRED_ID_KEY)
  } catch {
    return null
  }
}

export function clearCredentialId(): void {
  try {
    localStorage.removeItem(BIO_CRED_ID_KEY)
  } catch {
    /* ignore */
  }
}

/** Стабильный user.id для WebAuthn (создаётся один раз). */
export function getOrCreateWebAuthnUserId(): string {
  try {
    let id = localStorage.getItem(BIO_USER_ID_KEY)
    if (!id) {
      const bytes = crypto.getRandomValues(new Uint8Array(16))
      id = b64urlEncode(bytes.buffer)
      localStorage.setItem(BIO_USER_ID_KEY, id)
    }
    return id
  } catch {
    return 'keep-coin-user'
  }
}
