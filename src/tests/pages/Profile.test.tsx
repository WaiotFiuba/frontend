import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import Profile from '@/pages/Profile/page'
import Header from '@/common/Header'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const mockUser = {
  id: 1,
  name: 'Juan Perez',
  email: 'juan.perez@example.com',
}

const mockAuth = {
  user: mockUser,
  accessToken: 'valid-token',
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  loading: false,
  error: null,
}

vi.mock('@/context/AuthContext', () => ({
  useAuthContext: () => mockAuth,
}))

describe('Profile Page & Header Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('renders user details (name and email) on Profile page', () => {
    render(
      <MemoryRouter>
        <Profile />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: /Perfil de Usuario/i })).toBeInTheDocument()
    expect(screen.getAllByText('Juan Perez').length).toBeGreaterThan(0)
    expect(screen.getAllByText('juan.perez@example.com').length).toBeGreaterThan(0)
    expect(screen.getByText(/Idioma predeterminado/i)).toBeInTheDocument()
  })

  it('renders Header with profile button between greeting and logout, and without old language switch button', () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>
    )

    // Greeting is shown
    expect(screen.getByText(/Hola, Juan Perez/i)).toBeInTheDocument()

    // Profile icon button exists
    const profileBtn = screen.getByRole('button', { name: /Ver perfil/i })
    expect(profileBtn).toBeInTheDocument()

    // Old language switcher button ("EN" / "ES" toggle) is NOT present
    expect(screen.queryByTitle(/Cambiar idioma/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^EN$|^ES$/i })).not.toBeInTheDocument()

    // Clicking profile button navigates to /profile
    fireEvent.click(profileBtn)
    expect(mockNavigate).toHaveBeenCalledWith('/profile')

    // Logout button is present
    expect(screen.getByRole('button', { name: /Cerrar sesión/i })).toBeInTheDocument()
  })
})
