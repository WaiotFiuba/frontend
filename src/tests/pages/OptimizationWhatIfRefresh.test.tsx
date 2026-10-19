import { render, screen, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import Optimization from '@/pages/Optimization/page'

vi.mock('@/common/InteractiveMap', () => ({
  default: () => <div data-testid="interactive-map-mock" />,
}))

const jsonResponse = <T,>(data: T) =>
  ({
    ok: true,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as Response)

const activePlan = {
  id: 7,
  status: 'active_whatif',
  config: { algorithm: 'overload_mip', max_distance_km: 2, window_days: null },
  moves: [],
  total_containers_moved: 0,
  sites_emptied: 0,
  sites_receiving: 0,
  sites_donating: 0,
  avg_distance_km: 0,
  expected_improvement: 0,
  created_at: '2026-10-19T12:00:00Z',
  simulation_id: null,
}

const comparison = (observedHours: number) => ({
  plan_id: 7,
  plan_status: 'active_whatif',
  dispersion: null,
  observed_hours: observedHours,
  avg_critical_sites: observedHours > 0 ? { real: 120, with_plan: 90 } : null,
  avg_full_containers: observedHours > 0 ? { real: 80, with_plan: 60 } : null,
  full_container_hours: null,
  critical_sites_now: null,
  full_containers_now: null,
})

describe('What-if comparison refresh', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('asks again for the comparison while the plan is active', async () => {
    let comparisonCalls = 0
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('/plan/active')) return jsonResponse(activePlan)
      if (url.includes('/comparison')) {
        comparisonCalls += 1
        // Recién activado no hay horas medidas; después ya hay promedios.
        return jsonResponse(comparison(comparisonCalls === 1 ? 0 : 2))
      }
      throw new Error('offline')
    })

    render(
      <MemoryRouter>
        <Optimization />
      </MemoryRouter>
    )

    const withoutData = (await screen.findAllByText('Todavía sin datos')).length
    expect(comparisonCalls).toBe(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(15_000)
    })

    // Las dos tarjetas de promedios pasan a tener datos.
    expect(comparisonCalls).toBe(2)
    expect(screen.queryAllByText('Todavía sin datos')).toHaveLength(withoutData - 2)
  })
})
