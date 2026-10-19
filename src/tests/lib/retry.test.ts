import { describe, it, expect, vi } from 'vitest'
import { withRetry } from '@/lib/retry'

describe('withRetry', () => {
  it('returns the first successful load', async () => {
    const load = vi.fn().mockResolvedValue('ok')

    await expect(withRetry(load, [0, 0])).resolves.toBe('ok')
    expect(load).toHaveBeenCalledTimes(1)
  })

  it('retries after a failure', async () => {
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error('502'))
      .mockRejectedValueOnce(new Error('502'))
      .mockResolvedValue('ok')

    await expect(withRetry(load, [0, 0])).resolves.toBe('ok')
    expect(load).toHaveBeenCalledTimes(3)
  })

  it('gives up after the last delay and keeps the last error', async () => {
    const load = vi
      .fn()
      .mockRejectedValueOnce(new Error('first'))
      .mockRejectedValueOnce(new Error('second'))
      .mockRejectedValue(new Error('last'))

    await expect(withRetry(load, [0, 0])).rejects.toThrow('last')
    expect(load).toHaveBeenCalledTimes(3)
  })

  it('waits the given delay before retrying', async () => {
    vi.useFakeTimers()
    try {
      const load = vi.fn().mockRejectedValueOnce(new Error('502')).mockResolvedValue('ok')
      const result = withRetry(load, [1000])

      await vi.advanceTimersByTimeAsync(999)
      expect(load).toHaveBeenCalledTimes(1)
      await vi.advanceTimersByTimeAsync(1)
      await expect(result).resolves.toBe('ok')
      expect(load).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })
})
