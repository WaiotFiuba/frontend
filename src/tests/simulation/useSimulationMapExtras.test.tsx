import { fireEvent, render, renderHook, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useSimulationMapExtras } from '@/simulation/useSimulationMapExtras'

vi.mock('@/utils/functions', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/functions')>()),
  fetchZoneProfiles: vi.fn().mockResolvedValue({ type: 'FeatureCollection', features: [] }),
}))

function ZoneProfileButtons() {
  const extras = useSimulationMapExtras(true)
  return <>{extras?.controls}</>
}

describe('useSimulationMapExtras', () => {
  it('adds nothing to the map when the simulator is disabled', () => {
    const { result } = renderHook(() => useSimulationMapExtras(false))

    expect(result.current).toBeUndefined()
  })

  it('adds the zone profiles layer, toggle and legend when the simulator is enabled', () => {
    const { result } = renderHook(() => useSimulationMapExtras(true))

    expect(result.current?.layers).toBeTruthy()
    expect(result.current?.controls).toBeTruthy()
    expect(result.current?.overlays).toBeTruthy()
  })

  it('turns the zone profiles on from its toggle', async () => {
    render(<ZoneProfileButtons />)
    const toggle = screen.getByTitle(/Mostrar\/ocultar perfiles de zona/i)
    expect(toggle).toHaveTextContent('Desactivado')

    fireEvent.click(toggle)

    expect(await screen.findByText('Activado')).toBeInTheDocument()
  })
})
