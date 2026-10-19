import { act, renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { useThrottledValue } from '@/lib/useThrottledValue'

describe('useThrottledValue', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts with the given value', () => {
    const { result } = renderHook(() => useThrottledValue(3, 1000))

    expect(result.current).toBe(3)
  })

  it('applies a change right away when the interval already passed', async () => {
    const { result, rerender } = renderHook(({ value }) => useThrottledValue(value, 1000), {
      initialProps: { value: 0 },
    })
    await act(() => vi.advanceTimersByTimeAsync(1000))

    rerender({ value: 1 })

    expect(result.current).toBe(1)
  })

  it('applies at most one change per interval and keeps the latest value', async () => {
    const { result, rerender } = renderHook(({ value }) => useThrottledValue(value, 1000), {
      initialProps: { value: 0 },
    })

    rerender({ value: 1 })
    rerender({ value: 2 })
    expect(result.current).toBe(0)

    await act(() => vi.advanceTimersByTimeAsync(999))
    expect(result.current).toBe(0)

    await act(() => vi.advanceTimersByTimeAsync(1))
    expect(result.current).toBe(2)
  })
})
