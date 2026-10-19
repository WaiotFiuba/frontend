import { act, renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { useNetworkKpis } from '@/common/KpiPanel/useNetworkKpis'
import { api } from '@/lib/api'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }))

const metrics = (total: number) => ({
  total_sites: total,
  critical_count: 0,
  high_count: 0,
  normal_count: 0,
  low_count: 0,
  idle_count: 0,
})

describe('useNetworkKpis', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('retries the first load', async () => {
    vi.mocked(api.get).mockRejectedValueOnce(new Error('Bad Gateway')).mockResolvedValue(metrics(10))

    const { result } = renderHook(() => useNetworkKpis())
    await act(() => vi.advanceTimersByTimeAsync(1000))

    expect(api.get).toHaveBeenCalledTimes(2)
    expect(result.current.metrics?.total_sites).toBe(10)
  })

  it('does not stack refreshes while one is pending and runs one more at the end', async () => {
    let answer: (value: unknown) => void = () => {}
    vi.mocked(api.get)
      .mockResolvedValueOnce(metrics(10))
      .mockImplementationOnce(() => new Promise((resolve) => (answer = resolve)))
      .mockResolvedValue(metrics(30))

    const { result, rerender } = renderHook(({ refresh }) => useNetworkKpis({ refreshTrigger: refresh }), {
      initialProps: { refresh: 0 },
    })
    await act(() => vi.advanceTimersByTimeAsync(0))

    rerender({ refresh: 1 })
    rerender({ refresh: 2 })
    rerender({ refresh: 3 })
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(api.get).toHaveBeenCalledTimes(2)

    await act(async () => answer(metrics(20)))
    await act(() => vi.advanceTimersByTimeAsync(0))

    expect(api.get).toHaveBeenCalledTimes(3)
    expect(result.current.metrics?.total_sites).toBe(30)
  })

  it('does not retry a failed refresh and keeps the last metrics', async () => {
    vi.mocked(api.get).mockResolvedValueOnce(metrics(10)).mockRejectedValue(new Error('Bad Gateway'))

    const { result, rerender } = renderHook(({ refresh }) => useNetworkKpis({ refreshTrigger: refresh }), {
      initialProps: { refresh: 0 },
    })
    await act(() => vi.advanceTimersByTimeAsync(0))
    rerender({ refresh: 1 })
    await act(() => vi.advanceTimersByTimeAsync(15000))

    expect(api.get).toHaveBeenCalledTimes(2)
    expect(result.current.metrics?.total_sites).toBe(10)
  })
})
