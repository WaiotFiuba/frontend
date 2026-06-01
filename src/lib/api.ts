import { withAuthorization } from './auth'
import { handleUnauthorized } from './auth'
import { ACCESS_TOKEN_KEY, TOKEN_TYPE_KEY, getRefreshToken } from './auth'

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, '') ?? ''

type ApiOptions = {
  headers?: HeadersInit
}

type ApiBody = Record<string, unknown> | BodyInit | null | undefined

type RefreshTokenResponse = {
  access_token: string
  token_type?: string
}

const buildUrl = (path: string) => new URL(path, API_BASE_URL || window.location.origin).toString()

const shouldSkipRefresh = (path: string) => path.startsWith('/auth/login') || path.startsWith('/auth/refresh')

let refreshPromise: Promise<string | null> | null = null

const buildHeaders = (headers?: HeadersInit, body?: ApiBody) => {
  const mergedHeaders = new Headers(headers ?? {})

  Object.entries(withAuthorization()).forEach(([key, value]) => {
    if (value) {
      mergedHeaders.set(key, value)
    }
  })

  if (body instanceof URLSearchParams) {
    mergedHeaders.set('Content-Type', 'application/x-www-form-urlencoded;charset=UTF-8')
  } else if (body && !(body instanceof FormData) && !(body instanceof Blob)) {
    mergedHeaders.set('Content-Type', 'application/json')
  }

  return mergedHeaders
}

const prepareBody = (body?: ApiBody) => {
  if (body == null) {
    return undefined
  }

  if (body instanceof URLSearchParams || body instanceof FormData || body instanceof Blob) {
    return body
  }

  return JSON.stringify(body)
}

const refreshAccessToken = async (): Promise<string | null> => {
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken()

    if (!refreshToken) {
      return null
    }

    try {
      const response = await fetch(buildUrl('/auth/refresh'), {
        method: 'POST',
        headers: new Headers({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ refresh_token: refreshToken }),
      })

      if (!response.ok) {
        return null
      }

      const contentType = response.headers.get('content-type') ?? ''
      if (!contentType.includes('application/json')) {
        return null
      }

      const payload = (await response.json()) as RefreshTokenResponse

      if (!payload?.access_token) {
        return null
      }

      localStorage.setItem(ACCESS_TOKEN_KEY, payload.access_token)
      localStorage.setItem(TOKEN_TYPE_KEY, payload.token_type ?? localStorage.getItem(TOKEN_TYPE_KEY) ?? 'bearer')

      return payload.access_token
    } catch {
      return null
    }
  })().finally(() => {
    refreshPromise = null
  })

  return refreshPromise
}

const request = async <T>(
  path: string,
  init: RequestInit & ApiOptions = {},
  options: { allowRetry?: boolean } = {}
): Promise<T> => {
  const { allowRetry = true } = options
  const { headers, ...requestInit } = init
  const response = await fetch(buildUrl(path), {
    ...requestInit,
    headers: buildHeaders(headers, requestInit.body),
  })

  if (!response.ok) {
    if (response.status === 401) {
      if (allowRetry && !shouldSkipRefresh(path)) {
        const refreshedToken = await refreshAccessToken()
        if (refreshedToken) {
          return request<T>(path, init, { allowRetry: false })
        }
      }

      handleUnauthorized()
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      const payload = await response.json().catch(() => null) as
        | { detail?: string; message?: string }
        | null

      const message = payload?.detail || payload?.message
      throw new Error(message || `Request failed with status ${response.status}`)
    }

    const errorText = await response.text().catch(() => '')
    throw new Error(errorText || `Request failed with status ${response.status}`)
  }

  const contentType = response.headers.get('content-type') ?? ''
  if (contentType.includes('application/json')) {
    return (await response.json()) as T
  }

  return (await response.text()) as T
}

export const api = {
  get: <T>(path: string, options?: ApiOptions) => request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: ApiBody, options?: ApiOptions) =>
    request<T>(path, {
      ...options,
      method: 'POST',
      body: prepareBody(body),
    }),
}
