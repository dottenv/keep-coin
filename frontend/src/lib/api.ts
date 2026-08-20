export class ApiError extends Error {
  status: number
  payload: unknown

  constructor(status: number, payload: unknown) {
    super(typeof payload === 'string' ? payload : 'api_error')
    this.status = status
    this.payload = payload
  }
}

export class UnauthorizedError extends ApiError {
  constructor(payload: unknown) {
    super(401, payload)
    this.name = 'UnauthorizedError'
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  json?: unknown
}

const REFRESH_URL = '/api/auth/refresh'

let unauthorizedHandler: (() => void) | null = null

export function onUnauthorized(handler: () => void) {
  unauthorizedHandler = handler
}

/**
 * Базовый запрос к API. JWT живут в httpOnly куках и передаются браузером
 * автоматически (credentials: 'same-origin'). При 401 пытаемся обновить
 * access-токен через refresh-токен и повторяем исходный запрос.
 */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { json, headers, ...rest } = options
  const init: RequestInit = {
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      ...(json !== undefined
        ? { 'Content-Type': 'application/json' }
        : {}),
      ...headers,
    },
    ...rest,
  }
  if (json !== undefined) {
    init.body = JSON.stringify(json)
  }

  let response = await fetch(path, init)

  if (response.status === 401 && !isRefreshRequest(path)) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      response = await fetch(path, init)
    }
  }

  if (response.status === 401) {
    unauthorizedHandler?.()
    throw new UnauthorizedError(await parseBody(response))
  }

  if (!response.ok) {
    throw new ApiError(response.status, await parseBody(response))
  }

  return parseBody(response) as T
}

function isRefreshRequest(path: string): boolean {
  return path === REFRESH_URL
}

async function tryRefresh(): Promise<boolean> {
  try {
    const response = await fetch(REFRESH_URL, {
      method: 'POST',
      credentials: 'same-origin',
    })
    return response.ok
  } catch {
    return false
  }
}

async function parseBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}