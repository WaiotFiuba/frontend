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

const activePlan = {
  id: 7,
  status: 'active_whatif',
  config: {
    max_distance_km: 2.0,
    window_days: null,
    algorithm: 'greedy',
    min_utilization_donor: 0.35,
    min_utilization_receiver: 0.65,
    target_utilization: 0.5,
    apply_capacity_constraints: true,
  },
  moves: [],
  total_containers_moved: 0,
  sites_emptied: 0,
  sites_receiving: 0,
  sites_donating: 0,
  avg_distance_km: 0,
  expected_improvement: 0,
  created_at: '2026-10-01T12:00:00Z',
  original_std_fill: 19.1,
  optimized_std_fill: 12.8,
}

const comparison = {
  plan_id: 7,
  plan_status: 'active_whatif',
  dispersion: { real: 19.1, with_plan: 12.8 },
  observed_hours: 48,
  avg_critical_sites: { real: 1500, with_plan: 1200 },
  avg_full_containers: { real: 1000, with_plan: 900 },
  full_container_hours: null,
  critical_sites_now: null,
  full_containers_now: null,
}

// Respuestas por ruta: `kpis` decide cada respuesta de /map/kpis y `compare`
// las de la comparación del plan activo (sin `compare`, no hay plan activo).
const mockBackend = (kpis: () => Response, compare?: () => Response) =>
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input)
    if (url.includes('/map/kpis')) return kpis()
    if (url.includes('/map/optimization/plan/active')) return json(compare ? activePlan : null)
    if (compare && url.includes('/comparison')) return compare()
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

  it('shows the plan comparison when the first load fails and a retry works', async () => {
    let calls = 0
    mockBackend(
      () => json(metrics),
      () => (++calls === 1 ? badGateway() : json(comparison))
    )

    renderPage()
    await vi.advanceTimersByTimeAsync(1000)

    expect(await screen.findByText('-20 %')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows the comparison error with a retry button when every attempt fails', async () => {
    let failing = true
    mockBackend(
      () => json(metrics),
      () => (failing ? badGateway() : json(comparison))
    )

    renderPage()
    await vi.advanceTimersByTimeAsync(11000)

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('No se pudo cargar lo medido desde la activación')

    failing = false
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(await screen.findByText('-20 %')).toBeInTheDocument()
  })
})
