import { act, render } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import SimulationControl from '@/simulation/SimulationControl'
import { api } from '@/lib/api'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }))

const RUNNING = {
  id: 1,
  status: 'running',
  scenario: { frequency_minutes: 60, neighborhoods: [] },
  speedup: 3600,
  global_demand_current: 1,
  global_demand_target: 1,
  transition_minutes: 0,
  simulated_time: '2026-11-01T00:00:00Z',
  current_period: 1,
  total_periods: 10,
  measurements_sent: 0,
  collections_generated: 0,
  alarms_generated: 0,
  error_message: null,
  started_at: '2026-11-01T00:00:00Z',
  finished_at: null,
  zone_overrides: [],
}

const activeSimulationCalls = () =>
  vi.mocked(api.get).mock.calls.filter(([path]) => path === '/digital-twin/simulations/active').length

describe('SimulationControl polling', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not stack a new poll while the previous one has not answered', async () => {
    let firstAnswer = true
    vi.mocked(api.get).mockImplementation((path: string) => {
      if (path === '/digital-twin/simulations/active') {
        if (firstAnswer) {
          firstAnswer = false
          return Promise.resolve(RUNNING)
        }
        // Una API lenta: las consultas siguientes no vuelven.
        return new Promise(() => {})
      }
      return Promise.resolve([])
    })

    render(<SimulationControl />)
    // Carga inicial: la simulación está corriendo y arranca la consulta periódica (cada 1 s).
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(activeSimulationCalls()).toBe(1)

    await act(() => vi.advanceTimersByTimeAsync(10000))

    // Sin el arreglo serían 11 (una por segundo); con el arreglo, la segunda queda
    // esperando y no se mandan más.
    expect(activeSimulationCalls()).toBe(2)
  })
})
