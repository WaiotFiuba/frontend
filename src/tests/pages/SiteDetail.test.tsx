import { act, render, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SiteDetail from '@/pages/SiteDetail/page'

const get = vi.hoisted(() => vi.fn())
vi.mock('@/lib/api', () => ({ api: { get } }))
vi.mock('@/context/CityConfigContext', () => ({
  useLevelThresholds: () => ({ normal: 40, high: 70, critical: 80 }),
}))

const site = (lastReading: string) => ({
  id: 332, name: 'Sitio 332', latitude: -34.6, longitude: -58.4, current_level: 50,
  container_count: 0, last_reading: lastReading, updated_at: lastReading, containers: [],
})
const projection = {
  site_id: 332, model_key: 'baseline_operational', generated_at: '2026-01-01T10:00:00Z',
  current_level: 50, horizon_hours: 24, interval_minutes: 60, critical_level: 80,
  level_aggregation: 'avg', lookback_days: 14, stop_at_full: true, confidence: 0.8, points: [],
}

const callsTo = (path: string) => get.mock.calls.filter(([url]) => String(url).includes(path)).length

const renderSite = () => render(
  <MemoryRouter initialEntries={['/map/sites/332']}>
    <Routes>
      <Route path="/map/sites/:siteId" element={<SiteDetail />} />
    </Routes>
  </MemoryRouter>
)

describe('site detail', () => {
  let readings: string[]

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    readings = ['2026-01-01T10:00:00Z', '2026-01-01T10:00:00Z', '2026-01-01T10:05:00Z']
    get.mockImplementation(async (url: string) => {
      if (url === '/map/sites/332') return site(readings.length > 1 ? readings.shift()! : readings[0])
      if (url.includes('/history')) return { site_id: 332, points: [] }
      if (url.includes('/projection')) return projection
      return { models: [] }
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.resetAllMocks()
  })

  it('requests the projection and history again only when a new reading arrives', async () => {
    renderSite()
    await waitFor(() => expect(callsTo('/projection')).toBe(1))
    expect(callsTo('/history')).toBe(1)

    // Misma lectura: no se vuelve a pedir.
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(callsTo('/projection')).toBe(1)

    // Lectura nueva: se pide de nuevo.
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    await waitFor(() => expect(callsTo('/projection')).toBe(2))
    expect(callsTo('/history')).toBe(2)
  })

  it('does not wait for the history to show the projection', async () => {
    get.mockImplementation(async (url: string) => {
      if (url === '/map/sites/332') return site('2026-01-01T10:00:00Z')
      if (url.includes('/history')) return new Promise(() => {})
      if (url.includes('/projection')) {
        return {
          ...projection,
          confidence: 0.42,
          points: [{ timestamp: '2026-01-01T11:00:00Z', predicted_level: 52, reaches_critical: false }],
        }
      }
      return { models: [] }
    })

    const { findByText } = renderSite()

    expect(await findByText('Confianza: 42%')).toBeInTheDocument()
  })

  it('aggregates multiple readings in the same hour into a single historical point with the average level', async () => {
    get.mockImplementation(async (url: string) => {
      if (url === '/map/sites/332') return site('2026-01-01T10:00:00Z')
      if (url.includes('/history')) {
        return {
          site_id: 332,
          points: [
            { timestamp: '2026-01-01T08:15:00Z', avg_level: 20, max_level: 20, min_level: 20, measurement_count: 1 },
            { timestamp: '2026-01-01T08:45:00Z', avg_level: 80, max_level: 80, min_level: 80, measurement_count: 1 },
          ],
        }
      }
      if (url.includes('/projection')) return projection
      return { models: [] }
    })

    const { container, findByText } = renderSite()

    expect(await findByText('1 históricos')).toBeInTheDocument()

    const circles = container.querySelectorAll('circle')
    const historyCircle = Array.from(circles).find((c) => c.getAttribute('fill') === '#059669')
    expect(historyCircle).toBeTruthy()
    expect(historyCircle?.querySelector('title')?.textContent).toContain('50%')
  })
})
