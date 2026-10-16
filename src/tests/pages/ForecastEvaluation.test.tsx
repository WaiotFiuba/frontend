import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ForecastEvaluation from '@/pages/ForecastEvaluation/page'

const get = vi.hoisted(() => vi.fn())
const post = vi.hoisted(() => vi.fn())
vi.mock('@/lib/api', () => ({ api: { get, post } }))

const KEY = 'forecastEvaluation.activeId'
const evaluation = (status: string, processed = 0) => ({
  id: 7, model_key: 'baseline_operational', status, cutoff: '2026-01-01T10:00:00Z',
  horizon_hours: 24, interval_minutes: 60, critical_level: 80, level_aggregation: 'avg',
  lookback_days: 14, site_count: 20, summary: { processed_sites: processed }, metrics: [],
})
const report = {
  id: 7, model_key: 'baseline_operational', status: 'completed', summary: { site_count: 20 },
  global_metrics: {}, site_metrics: [], best_predicted_sites: [], worst_predicted_sites: [],
}

const runButton = () => screen.getByRole('button', { name: /Ejecutar Evaluación|Evaluando Modelo/ })
const statusCalls = () => get.mock.calls.filter(([url]) => String(url).endsWith('/status')).length

describe('forecast evaluation', () => {
  let statuses: string[]

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    window.localStorage.clear()
    statuses = ['pending', 'running', 'completed']
    get.mockImplementation(async (url: string) => {
      if (url.endsWith('/status')) return evaluation(statuses.length > 1 ? statuses.shift()! : statuses[0], 10)
      if (url.endsWith('/report')) return report
      return { models: [] }
    })
    post.mockResolvedValue(evaluation('pending'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.resetAllMocks()
    window.localStorage.clear()
  })

  it('waits for the evaluation to finish before showing the report', async () => {
    render(<ForecastEvaluation />)
    fireEvent.click(runButton())

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    expect(window.localStorage.getItem(KEY)).toBe('7')
    expect(await screen.findByText(/Evaluación #7 en curso: 10 de 20 sitios procesados/)).toBeInTheDocument()
    expect(runButton()).toBeDisabled()
    expect(get.mock.calls.some(([url]) => String(url).endsWith('/report'))).toBe(false)

    await act(async () => { await vi.advanceTimersByTimeAsync(6000) })

    expect(await screen.findByText(/Evaluación #7 completada/)).toBeInTheDocument()
    expect(window.localStorage.getItem(KEY)).toBeNull()
    expect(runButton()).not.toBeDisabled()
  })

  it('follows an evaluation already running after a reload instead of starting another', async () => {
    window.localStorage.setItem(KEY, '7')
    statuses = ['running']

    render(<ForecastEvaluation />)

    expect(await screen.findByText(/Evaluación #7 en curso/)).toBeInTheDocument()
    expect(runButton()).toBeDisabled()
    fireEvent.click(runButton())
    expect(post).not.toHaveBeenCalled()
    await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
    expect(statusCalls()).toBeGreaterThanOrEqual(2)
  })

  it('shows the error and frees the button when the evaluation fails', async () => {
    window.localStorage.setItem(KEY, '7')
    get.mockImplementation(async (url: string) => {
      if (url.endsWith('/status')) return { ...evaluation('failed'), summary: { error: 'Sin mediciones' } }
      return { models: [] }
    })

    render(<ForecastEvaluation />)

    expect(await screen.findByText('Sin mediciones')).toBeInTheDocument()
    expect(window.localStorage.getItem(KEY)).toBeNull()
    expect(runButton()).not.toBeDisabled()
  })
})
