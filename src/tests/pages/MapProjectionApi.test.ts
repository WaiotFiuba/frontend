import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchSiteProjections } from '@/pages/Map/services/projectionApi'

describe('map projection API', () => {
  afterEach(() => vi.restoreAllMocks())

  it('requests a forecast for the supplied sites and frozen time', async () => {
    const payload = {
      model_key: 'baseline_operational',
      generated_at: '2026-10-10T12:00:00Z',
      site_count: 0,
      sites: [],
      skipped_site_ids: [2],
      target_at: '2026-10-11T12:00:00Z',
    }
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => payload,
    } as Response)

    const result = await fetchSiteProjections(
      [1, 2],
      '2026-10-10T12:00:00Z',
      '2026-10-11T12:00:00Z'
    )

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/map/site-projections'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          site_ids: [1, 2],
          as_of: '2026-10-10T12:00:00Z',
          target_at: '2026-10-11T12:00:00Z',
          model_key: 'baseline_operational',
        }),
      })
    )
    expect(result.skipped_site_ids).toEqual([2])
  })
})
