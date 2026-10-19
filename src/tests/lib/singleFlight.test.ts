import { describe, it, expect, vi } from 'vitest'
import { singleFlight } from '@/lib/singleFlight'

const deferred = () => {
  let resolve: () => void = () => {}
  const promise = new Promise<void>((r) => (resolve = r))
  return { promise, resolve }
}

const flush = () => new Promise((r) => setTimeout(r, 0))

describe('singleFlight', () => {
  it('never runs two loads at the same time and runs one more after the current one', async () => {
    const loads = [deferred(), deferred()]
    const run = vi.fn().mockImplementationOnce(() => loads[0].promise).mockImplementationOnce(() => loads[1].promise)
    const start = singleFlight(run)

    start()
    start()
    start()
    expect(run).toHaveBeenCalledTimes(1)

    loads[0].resolve()
    await flush()
    expect(run).toHaveBeenCalledTimes(2)

    loads[1].resolve()
    await flush()
    expect(run).toHaveBeenCalledTimes(2)
  })

  it('keeps working after a failed load', async () => {
    const run = vi.fn().mockRejectedValueOnce(new Error('Bad Gateway')).mockResolvedValue(undefined)
    const start = singleFlight(run)

    start()
    await flush()
    start()
    await flush()

    expect(run).toHaveBeenCalledTimes(2)
  })
})
