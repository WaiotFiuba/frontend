import { describe, it, expect, vi, beforeEach } from 'vitest'

import { fetchSitesBBox } from '@/utils/functions'
import { api } from '@/lib/api'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }))

describe('fetchSitesBBox', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  it('maps the sites of the area', async () => {
    vi.mocked(api.get).mockResolvedValue([
      { id: 7, name: 'Sitio 7', latitude: -34.6, longitude: -58.4, current_level: 40, containers: [], last_reading: '2026-11-01T10:00:00Z' },
    ])

    const sites = await fetchSitesBBox(-35, -34, -59, -58, 15)

    expect(sites).toHaveLength(1)
    expect(sites[0]).toMatchObject({ id: '7', isCluster: false, lastReading: '2026-11-01T10:00:00Z' })
  })

  it('fails when the backend fails instead of returning an empty area', async () => {
    // Una lista vacía haría que el mapa borre los pines que ya mostraba.
    vi.mocked(api.get).mockRejectedValue(new Error('Bad Gateway'))

    await expect(fetchSitesBBox(-35, -34, -59, -58, 15)).rejects.toThrow('Bad Gateway')
  })
})
