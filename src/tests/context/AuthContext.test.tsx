import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { AuthProvider, useAuthContext } from '../../context/AuthContext'

function TestConsumer() {
  const { accessToken, user, login, logout, register } = useAuthContext()

  return (
    <div>
      <div>token:{accessToken ?? ''}</div>
      <div>user:{user?.name ?? ''}</div>
      <button onClick={() => void login('user@example.com', 'secret12')}>doLogin</button>
      <button onClick={() => logout()}>doLogout</button>
      <button
        onClick={async () => {
          await register({ name: 'Valid User', email: 'test@example.com', password: 'secret12' })
        }}
      >
        doRegister
      </button>
    </div>
  )
}

describe('AuthContext', () => {
  const jsonResponse = <T,>(data: T) =>
    Promise.resolve({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => data,
      text: async () => JSON.stringify(data),
    } as Response)

  beforeEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })
    it('login stores token and hydrates user', async () => {
      const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL) => {
        const url = String(input)
        if (url.endsWith('/auth/login')) {
          return jsonResponse({ access_token: 'tok-123', token_type: 'bearer' })
        }
        if (url.endsWith('/users/me')) {
          return jsonResponse({ id: 5, name: 'Usuario', email: 'usuario@example.com' })
        }
        return Promise.resolve({ ok: false, status: 404, headers: new Headers() } as Response)
    })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    const user = userEvent.setup()
    await user.click(screen.getByText('doLogin'))

    await waitFor(() => expect(localStorage.getItem('access_token')).toBe('tok-123'))
    await waitFor(() => expect(screen.getByText(/user:Usuario/)).toBeInTheDocument())

    fetchMock.mockRestore()
  })

  it('logout clears token and user', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.endsWith('/auth/login')) {
        return jsonResponse({ access_token: 'tok-456', token_type: 'bearer' })
      }
      if (url.endsWith('/users/me')) {
        return jsonResponse({ id: 5, name: 'Usuario2', email: 'u2@example.com' })
      }
      return Promise.resolve({ ok: false, status: 404, headers: new Headers() } as Response)
    })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    const u = userEvent.setup()
    await u.click(screen.getByText('doLogin'))

    await waitFor(() => expect(localStorage.getItem('access_token')).toBe('tok-456'))
    expect(screen.getByText(/user:Usuario2/)).toBeInTheDocument()

    await u.click(screen.getByText('doLogout'))

    await waitFor(() => expect(localStorage.getItem('access_token')).toBeNull())
    await waitFor(() => expect(screen.getByText('user:')).toBeInTheDocument())
  })

  it('register calls backend and returns success', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input)
      if (url.endsWith('/auth/register')) {
        const body = init?.body
        const parsed = JSON.parse(String(body))
        expect(parsed).toMatchObject({ name: 'Valid User', email: 'test@example.com', password: 'secret12' })
        return jsonResponse({})
      }
      return Promise.resolve({ ok: false, status: 404, headers: new Headers() } as Response)
    })

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    )

    const u = userEvent.setup()
    await u.click(screen.getByText('doRegister'))

    fetchMock.mockRestore()
  })
})
