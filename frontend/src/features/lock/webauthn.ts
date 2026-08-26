/**
 * Биометрия через WebAuthn (Face ID / Touch ID / сканер отпечатка Android).
 *
 * Используется ИСКЛЮЧИТЕЛЬНО как локальный «ключ» для снятия экрана
 * блокировки — платформенный authenticator подтверждает, что владелец
 * устройства прошёл биометрию/PIN устройства. Сервер не участвует, поэтому
 * мы лишь проверяем сам факт успешного assertion (authenticator его не
 * выпустит без user-verification). challenge генерируется случайно каждый раз.
 */

import {
  getCredentialId,
  getOrCreateWebAuthnUserId,
  setCredentialId,
} from './storage'

function getWebAuthn(): typeof window.PublicKeyCredential | null {
  if (typeof window === 'undefined' || !window.PublicKeyCredential) return null
  return window.PublicKeyCredential
}

export async function isBiometricSupported(): Promise<boolean> {
  const wa = getWebAuthn()
  if (!wa) return false
  try {
    return await wa.isUserVerifyingPlatformAuthenticatorAvailable()
  } catch {
    return false
  }
}

function randomChallenge(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32))
}

function b64urlToBytes(value: string): Uint8Array {
  const pad = value.length % 4 === 0 ? '' : '='.repeat(4 - (value.length % 4))
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/') + pad
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

/** Регистрируем платформенный credential (вызывается при включении биометрии). */
export async function registerBiometric(): Promise<void> {
  const wa = getWebAuthn()
  if (!wa) throw new Error('WebAuthn unsupported')

  const userId = b64urlToBytes(getOrCreateWebAuthnUserId())

  const publicKey: PublicKeyCredentialCreationOptions = {
    challenge: randomChallenge(),
    rp: { name: 'Keep Coin', id: location.hostname },
    user: {
      id: userId,
      name: 'keep-coin-local',
      displayName: 'Keep Coin',
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },
      { type: 'public-key', alg: -257 },
    ],
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      residentKey: 'preferred',
    },
    timeout: 60000,
    attestation: 'none',
  }

  const cred = (await navigator.credentials.create({
    publicKey,
  })) as PublicKeyCredential | null
  if (!cred) throw new Error('Credential creation failed')

  const rawId = b64urlFromArrayBuffer(cred.rawId)
  setCredentialId(rawId)
}

/** Проверяем биометрию (вызывается при попытке разблокировки). */
export async function authenticateBiometric(): Promise<boolean> {
  const wa = getWebAuthn()
  const credId = getCredentialId()
  if (!wa || !credId) throw new Error('Biometric not registered')

  const allow: PublicKeyCredentialDescriptor[] = [
    {
      type: 'public-key',
      id: b64urlToBytes(credId),
      transports: ['internal'],
    },
  ]

  const publicKey: PublicKeyCredentialRequestOptions = {
    challenge: randomChallenge(),
    rpId: location.hostname,
    allowCredentials: allow,
    userVerification: 'required',
    timeout: 60000,
  }

  const assertion = (await navigator.credentials.get({
    publicKey,
  })) as PublicKeyCredential | null
  return Boolean(assertion)
}

function b64urlFromArrayBuffer(buffer: ArrayBuffer): string {
  const arr = new Uint8Array(buffer)
  let str = ''
  for (let i = 0; i < arr.length; i++) str += String.fromCharCode(arr[i])
  return btoa(str).replace(/\+/g, '-').replace(/_/g, '/').replace(/=+$/, '')
}
