import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import Optimization from '@/pages/Optimization/page'

vi.mock('@/common/InteractiveMap', () => ({
  default: () => <div data-testid="interactive-map-mock" />,
}))

const metrics = {
  total_sites: 120,
  total_containers: 284,
  mean_fill_level: 62.4,
  std_fill_level: 19.1,
  critical_count: 14,
  high_count: 26,
  normal_count: 50,
  low_count: 20,
  idle_count: 10,
  sites: [],
}

const json = (data: unknown) =>
  ({
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => data,
    text: async () => JSON.stringify(data),
  }) as Response

const badGateway = () =>
  ({
    ok: false,
    status: 502,
    headers: new Headers({ 'content-type': 'text/plain' }),
    json: async () => null,
    text: async () => 'Bad Gateway',
  }) as Response

// Respuestas por ruta; `kpis` decide cada respuesta de /map/kpis.
const mockBackend = (kpis: () => Response) =>
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input)
    if (url.includes('/map/kpis')) return kpis()
    if (url.includes('/map/optimization/plan/active')) return json(null)
    return json({})
  })

const renderPage = () =>
  render(
    <MemoryRouter>
      <Optimization />
    </MemoryRouter>
  )

describe('Optimization page loads', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('shows the network KPIs when the first load fails and a retry works', async () => {
    let calls = 0
    mockBackend(() => (++calls <= 2 ? badGateway() : json(metrics)))

    renderPage()
    await vi.advanceTimersByTimeAsync(1000)

    expect(await screen.findByText('Métricas de la Red (What-If)')).toBeInTheDocument()
    expect(screen.getByText('284')).toBeInTheDocument()
  })

  it('shows the error with a retry button when every attempt fails', async () => {
    let failing = true
    const fetchSpy = mockBackend(() => (failing ? badGateway() : json(metrics)))

    renderPage()
    await vi.advanceTimersByTimeAsync(11000)

    const retry = await screen.findByRole('button', { name: 'Reintentar' })
    expect(screen.getByText(/No se pudieron cargar las métricas de red/)).toBeInTheDocument()

    failing = false
    const callsBefore = fetchSpy.mock.calls.length
    fireEvent.click(retry)

    expect(await screen.findByText('Métricas de la Red (What-If)')).toBeInTheDocument()
    expect(fetchSpy.mock.calls.length).toBeGreaterThan(callsBefore)
  })
})
