import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import Optimization from '@/pages/Optimization/page'

// El mapa real consulta la simulación activa; acá un botón simula que arranca otra.
let nextSimulationId = 1
vi.mock('@/common/InteractiveMap', () => ({
  default: ({ onActiveSimulationChange }: { onActiveSimulationChange?: (id: number) => void }) => (
    <button type="button" onClick={() => onActiveSimulationChange?.(nextSimulationId++)}>
      nueva simulación
    </button>
  ),
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

describe('What-if refresh when a new simulation starts', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('asks again for the network KPIs and the comparison', async () => {
    const calls = { kpis: 0, comparison: 0 }
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('/plan/active')) return jsonResponse(activePlan)
      if (url.includes('/comparison')) {
        calls.comparison += 1
        return jsonResponse({ plan_id: 7, plan_status: 'active_whatif', observed_hours: 0 })
      }
      if (url.includes('/kpis')) {
        calls.kpis += 1
        throw new Error('offline')
      }
      throw new Error('offline')
    })

    render(
      <MemoryRouter>
        <Optimization />
      </MemoryRouter>
    )
    await waitFor(() => expect(calls.comparison).toBe(1))
    const before = { ...calls }

    fireEvent.click(screen.getByRole('button', { name: 'nueva simulación' }))

    await waitFor(() => expect(calls.comparison).toBe(before.comparison + 1))
    expect(calls.kpis).toBe(before.kpis + 2)
  })
})
