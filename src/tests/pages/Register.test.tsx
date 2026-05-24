import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import Register from '../../pages/Register/page'

const { navigateMock, registerMock } = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  registerMock: vi.fn(),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')

  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('../../context/AuthContext', async () => {
  return {
    useAuthContext: () => ({ register: registerMock }),
  }
})

describe('Register page', () => {
  beforeEach(() => {
    navigateMock.mockReset()
    registerMock.mockReset()
    vi.stubEnv('VITE_BACKEND_URL', 'http://localhost:3000')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('keeps the register button disabled until the form is valid', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    )

    const registerButton = screen.getByRole('button', { name: /registrarse/i })

    expect(registerButton).toBeDisabled()

    await user.type(screen.getByLabelText(/nombre/i), 'Valid User')
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/^contraseña$/i), 'secret12')
    await user.type(screen.getByLabelText(/confirmar contraseña/i), 'secret12')

    expect(registerButton).toBeEnabled()
  })

  it('shows a mismatch message and keeps the button disabled when passwords differ', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    )

    const passwordInput = screen.getByLabelText(/^contraseña$/i)
    const confirmPasswordInput = screen.getByLabelText(/confirmar contraseña/i)

    await user.type(screen.getByLabelText(/nombre/i), 'Valid User')
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(passwordInput, 'secret12')
    await user.type(confirmPasswordInput, 'secret13')

    expect(screen.getByText(/Las contraseñas deben coincidir/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /registrarse/i })).toBeDisabled()
  })

  it('sends the registration payload to the backend and navigates to login on success', async () => {
    const user = userEvent.setup()
    registerMock.mockResolvedValue(true)

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    )

    await user.type(screen.getByLabelText(/nombre/i), 'Valid User')
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/^contraseña$/i), 'secret12')
    await user.type(screen.getByLabelText(/confirmar contraseña/i), 'secret12')
    await user.click(screen.getByRole('button', { name: /registrarse/i }))

    expect(registerMock).toHaveBeenCalledWith({ name: 'Valid User', email: 'test@example.com', password: 'secret12' })
    expect(navigateMock).toHaveBeenCalledWith('/login')
  })
})