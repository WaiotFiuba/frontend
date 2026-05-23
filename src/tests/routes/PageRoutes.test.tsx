import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi } from 'vitest'
import PageRoutes from '../../routes/PageRoutes'

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children?: ReactNode }) => <div data-testid="mock-map">{children}</div>,
  TileLayer: () => <div data-testid="mock-tile" />,
  Marker: ({ children }: { children?: ReactNode }) => <div data-testid="mock-marker">{children}</div>,
  Popup: ({ children }: { children?: ReactNode }) => <div data-testid="mock-popup">{children}</div>,
}))

// Provide a default mock for the AuthContext used by Header so tests don't need the provider
vi.mock('../../context/AuthContext', () => ({
  useAuthContext: () => ({
    user: null,
    accessToken: null,
    login: async () => false,
    register: async () => false,
    logout: () => {},
    loading: false,
    error: null,
  }),
}))

describe('PageRoutes', () => {
  it('renders Home at root path /', () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <PageRoutes />
      </MemoryRouter>
    )

    expect(screen.getByText(/Welcome to Waiot FIUBA/i)).toBeInTheDocument()
  })

  it('renders Map page at /map', () => {
    render(
      <MemoryRouter initialEntries={["/map"]}>
        <PageRoutes />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: /Map/i })).toBeInTheDocument()
  })
})
