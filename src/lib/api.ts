import { withAuthorization } from './auth'
import { handleUnauthorized } from './auth'

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, '') ?? ''

type ApiOptions = {
  headers?: HeadersInit
}

type ApiBody = Record<string, unknown> | BodyInit | null | undefined

const buildUrl = (path: string) => new URL(path, API_BASE_URL || window.location.origin).toString()

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

const request = async <T>(path: string, init: RequestInit & ApiOptions = {}): Promise<T> => {
  const { headers, ...requestInit } = init
  const response = await fetch(buildUrl(path), {
    ...requestInit,
    headers: buildHeaders(headers, requestInit.body),
  })

  if (!response.ok) {
    if (response.status === 401) {
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
  delete: <T>(path: string, options?: ApiOptions) => request<T>(path, { ...options, method: 'DELETE' }),
}
