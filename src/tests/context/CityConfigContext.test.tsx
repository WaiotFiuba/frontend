import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import {
  CityConfigProvider,
  DEFAULT_LEVEL_THRESHOLDS,
  useLevelThresholds,
} from '@/context/CityConfigContext'
import { api } from '@/lib/api'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }))

function ThresholdsConsumer() {
  const { normal, high, critical, full } = useLevelThresholds()
  return <div>thresholds:{`${normal}/${high}/${critical}/${full}`}</div>
}

const baseConfig = {
  city_name: 'Buenos Aires',
  center: { lat: -34.6, lng: -58.4 },
  default_zoom: 13,
  bounds: null,
}

describe('CityConfigContext thresholds', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
  })

  it('uses the thresholds sent by /map/config', async () => {
    vi.mocked(api.get).mockResolvedValue({
      ...baseConfig,
      thresholds: { normal: 30, high: 60, critical: 90, full: 100 },
    })

    render(
      <CityConfigProvider>
        <ThresholdsConsumer />
      </CityConfigProvider>
    )

    await waitFor(() => expect(screen.getByText('thresholds:30/60/90/100')).toBeInTheDocument())
  })

  it('falls back to the default thresholds when the backend does not send them', async () => {
    vi.mocked(api.get).mockResolvedValue(baseConfig)

    render(
      <CityConfigProvider>
        <ThresholdsConsumer />
      </CityConfigProvider>
    )

    const { normal, high, critical, full } = DEFAULT_LEVEL_THRESHOLDS
    await waitFor(() => expect(api.get).toHaveBeenCalledWith('/map/config'))
    expect(screen.getByText(`thresholds:${normal}/${high}/${critical}/${full}`)).toBeInTheDocument()
  })

  it('retries /map/config when the first load fails', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      vi.mocked(api.get)
        .mockRejectedValueOnce(new Error('Bad Gateway'))
        .mockResolvedValue({
          ...baseConfig,
          thresholds: { normal: 30, high: 60, critical: 90, full: 100 },
        })

      render(
        <CityConfigProvider>
          <ThresholdsConsumer />
        </CityConfigProvider>
      )

      await vi.advanceTimersByTimeAsync(1000)
      await waitFor(() => expect(screen.getByText('thresholds:30/60/90/100')).toBeInTheDocument())
      expect(api.get).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })
})
