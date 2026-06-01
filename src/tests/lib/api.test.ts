import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { api } from '../../lib/api'
import { setUnauthorizedHandler } from '../../lib/auth'

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
    setUnauthorizedHandler(null)
    localStorage.clear()
  })

  it('api client triggers unauthorized handler on 401', async () => {
    const handler = vi.fn()
    setUnauthorizedHandler(handler)

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers({ 'content-type': 'text/plain' }),
      text: async () => 'Unauthorized',
    } as Response)

    await expect(api.get('/private')).rejects.toThrow('Unauthorized')
    expect(handler).toHaveBeenCalledOnce()
  })

  it('api client refreshes access token and retries request on 401', async () => {
    localStorage.setItem('access_token', 'expired-token')
    localStorage.setItem('refresh_token', 'refresh-123')
    localStorage.setItem('token_type', 'bearer')

    let meCalls = 0

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)

      if (url.endsWith('/users/me')) {
        meCalls += 1
        const headers = new Headers(init?.headers)

        if (meCalls === 1) {
          expect(headers.get('Authorization')).toBe('bearer expired-token')
          return {
            ok: false,
            status: 401,
            headers: new Headers({ 'content-type': 'text/plain' }),
            text: async () => 'Unauthorized',
          } as Response
        }

        expect(headers.get('Authorization')).toBe('bearer new-token')
        return jsonResponse({ id: 1, name: 'Alice' })
      }

      if (url.endsWith('/auth/refresh')) {
        expect(init?.method).toBe('POST')
        expect(init?.body).toBe(JSON.stringify({ refresh_token: 'refresh-123' }))

        return jsonResponse({ access_token: 'new-token', token_type: 'bearer' })
      }

      return {
        ok: false,
        status: 404,
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: async () => 'Not found',
      } as Response
    })

    const result = await api.get<{ id: number; name: string }>('/users/me')

    expect(result).toEqual({ id: 1, name: 'Alice' })
    expect(localStorage.getItem('access_token')).toBe('new-token')
    expect(meCalls).toBe(2)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('api client calls unauthorized handler when refresh fails', async () => {
    localStorage.setItem('access_token', 'expired-token')
    localStorage.setItem('refresh_token', 'refresh-123')
    localStorage.setItem('token_type', 'bearer')

    const handler = vi.fn()
    setUnauthorizedHandler(handler)

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)

      if (url.endsWith('/users/me')) {
        return {
          ok: false,
          status: 401,
          headers: new Headers({ 'content-type': 'text/plain' }),
          text: async () => 'Unauthorized',
        } as Response
      }

      if (url.endsWith('/auth/refresh')) {
        return {
          ok: false,
          status: 401,
          headers: new Headers({ 'content-type': 'application/json' }),
          json: async () => ({ detail: 'Refresh token expired' }),
          text: async () => JSON.stringify({ detail: 'Refresh token expired' }),
        } as Response
      }

      return {
        ok: false,
        status: 404,
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: async () => 'Not found',
      } as Response
    })

    await expect(api.get('/users/me')).rejects.toThrow('Unauthorized')
    expect(handler).toHaveBeenCalledOnce()
  })

  it('api client surfaces JSON detail field on errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 401,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ detail: 'Incorrect email or password' }),
      text: async () => JSON.stringify({ detail: 'Incorrect email or password' }),
    } as Response)

    await expect(api.post('/auth/login', { email: 'x', password: 'y' })).rejects.toThrow(
      'Incorrect email or password'
    )
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

      return jsonResponse({ access_token: 'token-123', token_type: 'bearer', refresh_token: 'refresh-123' })
    })

    const result = await api.post<{ access_token: string; token_type: string; refresh_token: string }>(
      '/auth/login',
      new URLSearchParams({
        username: 'user@example.com',
        password: 'secret12',
      })
    )

    expect(result).toEqual({ access_token: 'token-123', token_type: 'bearer', refresh_token: 'refresh-123' })
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
