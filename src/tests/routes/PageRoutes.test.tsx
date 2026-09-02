import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import PageRoutes from '../../routes/PageRoutes'

const { authState } = vi.hoisted(() => ({
  authState: { accessToken: null as string | null },
}))

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children?: ReactNode }) => <div data-testid="mock-map">{children}</div>,
  TileLayer: () => <div data-testid="mock-tile" />,
  Marker: ({ children }: { children?: ReactNode }) => <div data-testid="mock-marker">{children}</div>,
  Popup: ({ children }: { children?: ReactNode }) => <div data-testid="mock-popup">{children}</div>,
  useMapEvents: () => ({
    getZoom: () => 13,
    getBounds: () => ({
      getSouthWest: () => ({ lat: -34.7, lng: -58.5 }),
      getNorthEast: () => ({ lat: -34.5, lng: -58.3 }),
    }),
    getMaxZoom: () => 19,
    flyTo: () => {},
  }),
}))

vi.mock('@/common/InteractiveMap', () => ({
  default: () => <div data-testid="interactive-map-mock">Mocked map</div>,
}))

vi.mock('../../context/AuthContext', () => ({
  useAuthContext: () => ({
    user: null,
    accessToken: authState.accessToken,
    login: async () => false,
    register: async () => false,
    logout: () => {},
    loading: false,
    error: null,
  }),
}))

describe('PageRoutes', () => {
  beforeEach(() => {
    authState.accessToken = null
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('renders Home at root path /', () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <PageRoutes />
      </MemoryRouter>
    )

    expect(screen.getByText(/Welcome to Waiot FIUBA/i)).toBeInTheDocument()
  })

  it('renders Map page at /map', () => {
    authState.accessToken = 'token-123'

    render(
      <MemoryRouter initialEntries={["/map"]}>
        <PageRoutes />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: /Map/i })).toBeInTheDocument()
  })

  it('redirects /management to login when there is no token', () => {
    render(
      <MemoryRouter initialEntries={['/management']}>
        <PageRoutes />
      </MemoryRouter>
    )

    expect(screen.getByRole('button', { name: /Iniciar Sesión/i })).toBeInTheDocument()
  })

  it('allows /management when auth bypass is enabled in development', () => {
    vi.stubEnv('VITE_AUTH_DEV_BYPASS', 'true')

    render(
      <MemoryRouter initialEntries={['/management']}>
        <PageRoutes />
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: /Container Management/i })).toBeInTheDocument()
  })
})
