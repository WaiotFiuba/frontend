import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import Optimization from '@/pages/Optimization/page'

// El mapa real avisa cuando llegan lecturas nuevas; acá lo simula un botón.
vi.mock('@/common/InteractiveMap', () => ({
  default: ({ onDataChange }: { onDataChange?: () => void }) => (
    <button type="button" onClick={() => onDataChange?.()}>
      lecturas nuevas
    </button>
  ),
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

describe('Network KPI refresh on the optimization page', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('does not stack KPI requests when readings arrive faster than the backend answers', async () => {
    let kpiCalls = 0
    const pending: Array<() => void> = []
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('/map/kpis')) {
        kpiCalls += 1
        // La carga inicial responde; los refrescos quedan esperando hasta que el test los suelte.
        if (kpiCalls <= 2) return json(metrics)
        return new Promise<Response>((resolve) => pending.push(() => resolve(json(metrics))))
      }
      if (url.includes('/plan/active')) return json(null)
      return json({})
    })

    render(
      <MemoryRouter>
        <Optimization />
      </MemoryRouter>
    )
    expect(await screen.findByText('Métricas de la Red (What-If)')).toBeInTheDocument()
    expect(kpiCalls).toBe(2)

    const newReadings = screen.getByRole('button', { name: 'lecturas nuevas' })
    fireEvent.click(newReadings)
    fireEvent.click(newReadings)
    fireEvent.click(newReadings)

    // Un solo refresco (real y con el plan) en curso, aunque llegaron tres avisos.
    await waitFor(() => expect(kpiCalls).toBe(4))

    // Al terminar, uno más con los datos nuevos, y nada después.
    pending.splice(0).forEach((release) => release())
    await waitFor(() => expect(kpiCalls).toBe(6))
    pending.splice(0).forEach((release) => release())
    await new Promise((r) => setTimeout(r, 50))
    expect(kpiCalls).toBe(6)
  })
})
