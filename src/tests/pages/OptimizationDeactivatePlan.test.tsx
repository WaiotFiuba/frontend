import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'

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

const move = {
  container_id: 11,
  from_site_id: 2,
  from_site_name: 'Sitio 2',
  to_site_id: 1,
  to_site_name: 'Sitio 1',
  distance_km: 0.5,
}

const activePlan = {
  id: 7,
  status: 'active_whatif',
  config: { algorithm: 'overload_mip', max_distance_km: 2, window_days: null },
  moves: [move],
  total_containers_moved: 1,
  sites_emptied: 0,
  sites_receiving: 1,
  sites_donating: 1,
  avg_distance_km: 0.5,
  expected_improvement: 0,
  created_at: '2026-10-19T12:00:00Z',
  simulation_id: null,
}

describe('Deactivate the active plan', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  const mockBackend = () =>
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
      const url = String(input)
      if (url.includes('/plan/active')) return jsonResponse(activePlan)
      if (url.includes('/plan/7/whatif') && init?.method === 'DELETE') {
        return jsonResponse({ ...activePlan, status: 'completed' })
      }
      throw new Error('offline')
    })

  const renderPage = () =>
    render(
      <MemoryRouter>
        <Optimization />
      </MemoryRouter>
    )

  const isDeactivation = ([input, init]: Parameters<typeof fetch>) =>
    String(input).includes('/plan/7/whatif') && init?.method === 'DELETE'

  it('asks for confirmation and does nothing when cancelled', async () => {
    const fetchSpy = mockBackend()
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Desactivar plan' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('¿Desactivar el plan?')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(fetchSpy.mock.calls.some(isDeactivation)).toBe(false)
    expect(screen.getByText('Sitio 2')).toBeInTheDocument()
  })

  it('deactivates the plan and clears the moves after confirming', async () => {
    const fetchSpy = mockBackend()
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'Desactivar plan' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Desactivar plan' }))

    await waitFor(() =>
      expect(screen.getByText(/Plan desactivado: el what-if vuelve a ser la red real/)).toBeInTheDocument()
    )
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/map/optimization/plan/7/whatif'),
      expect.objectContaining({ method: 'DELETE' })
    )
    expect(screen.queryByRole('button', { name: 'Desactivar plan' })).not.toBeInTheDocument()
    expect(screen.queryByText('Sitio 2')).not.toBeInTheDocument()
  })
})
