import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../lib/api'

const jsonResponse = <T,>(data: T) =>
  Promise.resolve({
    ok: true,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as Response)

describe('api client', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_BACKEND_URL', 'http://localhost:3000')
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    localStorage.clear()
  })

  it('api.get sends Authorization header and parses JSON', async () => {
    localStorage.setItem('access_token', 'token-123')
    localStorage.setItem('token_type', 'bearer')

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
      const headers = new Headers(init?.headers)

      expect(headers.get('Authorization')).toBe('bearer token-123')
      expect(init?.method).toBe('GET')

      return jsonResponse({ id: 5, name: 'Usuario' })
    })

    const result = await api.get<{ id: number; name: string }>('/users/me')

    expect(result).toEqual({ id: 5, name: 'Usuario' })
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('api.post sends JSON body with content-type', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
      const headers = new Headers(init?.headers)

      expect(headers.get('Content-Type')).toBe('application/json')
      expect(init?.method).toBe('POST')
      expect(init?.body).toBe(JSON.stringify({ name: 'Nuevo' }))

      return jsonResponse({ ok: true })
    })

    const result = await api.post<{ ok: boolean }>('/items', { name: 'Nuevo' })

    expect(result).toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('api.post sends URLSearchParams as form-urlencoded', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
      const headers = new Headers(init?.headers)

      expect(headers.get('Content-Type')).toBe('application/x-www-form-urlencoded;charset=UTF-8')
      expect(init?.body).toBeInstanceOf(URLSearchParams)
      expect(String(init?.body)).toBe('username=user%40example.com&password=secret12')

      return jsonResponse({ access_token: 'token-123', token_type: 'bearer' })
    })

    const result = await api.post<{ access_token: string; token_type: string }>(
      '/auth/login',
      new URLSearchParams({
        username: 'user@example.com',
        password: 'secret12',
      })
    )

    expect(result).toEqual({ access_token: 'token-123', token_type: 'bearer' })
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
