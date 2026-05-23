import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import Register from '../../pages/Register/page'

describe('Register page', () => {
  it('keeps the register button disabled until the form is valid', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    )

    const registerButton = screen.getByRole('button', { name: /registrarse/i })

    expect(registerButton).toBeDisabled()

    await user.type(screen.getByLabelText(/usuario/i), 'validuser')
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(screen.getByLabelText(/^contraseña$/i), 'secret1')
    await user.type(screen.getByLabelText(/confirmar contraseña/i), 'secret1')

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

    await user.type(screen.getByLabelText(/usuario/i), 'validuser')
    await user.type(screen.getByLabelText(/email/i), 'test@example.com')
    await user.type(passwordInput, 'secret1')
    await user.type(confirmPasswordInput, 'secret2')

    expect(screen.getByText(/Las contraseñas deben coincidir/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /registrarse/i })).toBeDisabled()
  })
})