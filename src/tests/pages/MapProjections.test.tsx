import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Site } from '@/utils/types'
import { useVisibleSiteProjections } from '@/pages/Map/hooks/useVisibleSiteProjections'

const fetchSiteProjections = vi.hoisted(() => vi.fn())
vi.mock('@/pages/Map/services/projectionApi', () => ({ fetchSiteProjections }))

const asOf = '2026-10-10T12:00:00Z'
const targetAt = '2026-10-11T12:00:00Z'
const site = (id: number, currentLevel = 20): Site => ({
  id: String(id), lat: -34.6, long: -58.4, type: 'organico',
  color: '#10b981', currentLevel, containers: [],
})
const response = (ids: number[]) => ({
  sites: ids.map((id) => ({
    site_id: id,
    current_level: 20,
    target_point: { timestamp: targetAt, predicted_level: 30 },
  })),
  skipped_site_ids: [],
})

describe('visible site projections', () => {
  afterEach(() => vi.resetAllMocks())

  it('keeps an in-flight forecast when live levels refresh for the same sites', async () => {
    let resolveRequest!: (value: ReturnType<typeof response>) => void
    fetchSiteProjections.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve }))
    const { result, rerender } = renderHook(
      ({ sites }) => useVisibleSiteProjections(sites, asOf, targetAt, 'baseline_operational'),
      { initialProps: { sites: [site(1)] } }
    )

    await waitFor(() => expect(fetchSiteProjections).toHaveBeenCalledTimes(1))
    rerender({ sites: [site(1, 80)] })
    await act(async () => resolveRequest(response([1])))

    expect(fetchSiteProjections).toHaveBeenCalledTimes(1)
    expect(result.current.projections.get(1)?.target_point?.predicted_level).toBe(30)
  })

  it('batches at 100 sites and only requests new IDs after a map move', async () => {
    fetchSiteProjections.mockImplementation(async (ids: number[]) => response(ids))
    const initialSites = Array.from({ length: 101 }, (_, index) => site(index + 1))
    const { result, rerender } = renderHook(
      ({ sites }) => useVisibleSiteProjections(sites, asOf, targetAt, 'baseline_operational'),
      { initialProps: { sites: initialSites } }
    )

    await waitFor(() => expect(result.current.projections.size).toBe(101))
    expect(fetchSiteProjections.mock.calls.map(([ids]) => ids.length)).toEqual([100, 1])

    rerender({ sites: [site(101), site(102)] })
    await waitFor(() => expect(result.current.projections.has(102)).toBe(true))
    expect(fetchSiteProjections.mock.calls[2][0]).toEqual([102])
  })

  it('requests a fresh forecast when the model changes', async () => {
    fetchSiteProjections.mockImplementation(async (ids: number[]) => response(ids))
    const { result, rerender } = renderHook(
      ({ modelKey }) => useVisibleSiteProjections([site(1)], asOf, targetAt, modelKey),
      { initialProps: { modelKey: 'baseline_operational' } }
    )

    await waitFor(() => expect(result.current.projections.has(1)).toBe(true))
    rerender({ modelKey: 'chronos_2_small' })

    await waitFor(() => expect(fetchSiteProjections).toHaveBeenCalledTimes(2))
    expect(fetchSiteProjections.mock.calls.map((call) => call[3])).toEqual([
      'baseline_operational', 'chronos_2_small',
    ])
  })
})
