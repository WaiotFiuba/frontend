import { act, renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { latest, useDataChanges } from '@/common/useDataChanges'
import { api } from '@/lib/api'

vi.mock('@/lib/api', () => ({ api: { get: vi.fn() } }))

const feed = (cursor: number, lastReading: string | null = null) => ({
  latest_cursor: cursor,
  sites: lastReading ? [{ last_reading: lastReading }] : [],
  has_more: false,
})

describe('useDataChanges', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('counts a change only when the cursor moves after the first answer', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(feed(10))
      .mockResolvedValueOnce(feed(10))
      .mockResolvedValueOnce(feed(12))

    const { result } = renderHook(() => useDataChanges(1000))
    await act(() => vi.advanceTimersByTimeAsync(0))
    expect(result.current.version).toBe(0)
    expect(api.get).toHaveBeenLastCalledWith('/map/sites/changes?after=0&limit=1')

    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(result.current.version).toBe(0)

    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(result.current.version).toBe(1)
    expect(api.get).toHaveBeenLastCalledWith('/map/sites/changes?after=10&limit=1')
  })

  it('waits for the previous answer before asking again', async () => {
    let answer: (value: unknown) => void = () => {}
    vi.mocked(api.get).mockImplementation(() => new Promise((resolve) => (answer = resolve)))

    renderHook(() => useDataChanges(1000))
    await act(() => vi.advanceTimersByTimeAsync(10000))
    expect(api.get).toHaveBeenCalledTimes(1)

    await act(async () => answer(feed(3)))
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(api.get).toHaveBeenCalledTimes(2)
  })

  it('keeps asking after a failed answer', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(feed(1))
      .mockRejectedValueOnce(new Error('Bad Gateway'))
      .mockResolvedValueOnce(feed(2))

    const { result } = renderHook(() => useDataChanges(1000))
    await act(() => vi.advanceTimersByTimeAsync(0))
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(result.current.version).toBe(0)

    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(result.current.version).toBe(1)
  })

  it('does not ask while the tab is hidden', async () => {
    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
    vi.mocked(api.get).mockResolvedValue(feed(1))

    renderHook(() => useDataChanges(1000))
    await act(() => vi.advanceTimersByTimeAsync(5000))
    expect(api.get).not.toHaveBeenCalled()

    visibility.mockReturnValue('visible')
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(api.get).toHaveBeenCalledTimes(1)
  })

  it('keeps the most recent reading it has seen', async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce(feed(1, '2026-11-01T10:00:00'))
      .mockResolvedValueOnce(feed(2, '2026-11-01T09:00:00'))

    const { result } = renderHook(() => useDataChanges(1000))
    await act(() => vi.advanceTimersByTimeAsync(0))
    await act(() => vi.advanceTimersByTimeAsync(1000))

    expect(result.current.latestReading).toBe('2026-11-01T10:00:00')
  })
})

describe('latest', () => {
  it('returns the most recent date, treating dates without zone as UTC', () => {
    expect(latest(null, '2026-11-01T10:00:00')).toBe('2026-11-01T10:00:00')
    expect(latest('2026-11-01T10:00:00', null)).toBe('2026-11-01T10:00:00')
    expect(latest('2026-11-01T10:00:00', '2026-11-01T10:30:00+00:00')).toBe('2026-11-01T10:30:00+00:00')
    expect(latest('2026-11-01T10:00:00Z', '2026-11-01T06:30:00-03:00')).toBe('2026-11-01T10:00:00Z')
  })
})
