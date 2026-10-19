import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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
  id: 7, model_key: 'baseline_operational', status: 'completed',
  summary: { site_count: 20, cutoff_count: 14, case_count: 280, critical_at_cutoff: 12 },
  global_metrics: {
    event_f1: 0.94, event_precision: 0.91, event_recall: 0.97, event_horizon_f1: 0.96,
    event_observed: 40, event_too_early: 3, event_too_late: 1, mae: 1.93, rmse: 2.27,
  },
  site_metrics: [], best_predicted_sites: [], worst_predicted_sites: [],
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

  it('sends the new evaluation parameters', async () => {
    render(<ForecastEvaluation />)
    fireEvent.change(screen.getByLabelText(/Horas entre cortes/), { target: { value: '12' } })
    fireEvent.click(runButton())

    await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
    expect(post.mock.calls[0][1]).toMatchObject({
      site_sample_size: 500,
      cutoff_count: 14,
      cutoff_spacing_hours: 12,
      min_history_days: 7,
      critical_early_hours: 3,
      critical_late_hours: 1,
    })
  })

  it('shows the event metrics and the short history warning', async () => {
    window.localStorage.setItem(KEY, '7')
    statuses = ['completed']
    get.mockImplementation(async (url: string) => {
      if (url.endsWith('/status')) return evaluation('completed')
      if (url.endsWith('/report')) return { ...report, summary: { ...report.summary, short_history: true } }
      return { models: [] }
    })

    render(<ForecastEvaluation />)

    expect(await screen.findByText('F1 por evento')).toBeInTheDocument()
    expect(screen.getByText('94%')).toBeInTheDocument()
    expect(screen.getByText('Avisos por evento')).toBeInTheDocument()
    expect(screen.getByText(/Historia corta/)).toBeInTheDocument()
    expect(screen.queryByText('Precisión crítico')).not.toBeInTheDocument()
  })

  it('shows the main parameters and keeps the advanced ones closed', () => {
    render(<ForecastEvaluation />)

    for (const label of ['Modelo', 'Cantidad de sitios', 'Horizonte de predicción', 'Umbral crítico']) {
      expect(screen.getByLabelText(new RegExp(`^${label}`))).toBeInTheDocument()
    }
    const advanced = screen.getByText('Opciones avanzadas').closest('details')
    expect(advanced).not.toHaveAttribute('open')
    expect(advanced).toContainElement(screen.getByLabelText(/^Horas entre cortes/))
    expect(advanced).toContainElement(screen.getByLabelText(/^Anticipación aceptada/))
  })

  it('explains each event warning card on hover', async () => {
    window.localStorage.setItem(KEY, '7')
    get.mockImplementation(async (url: string) => {
      if (url.endsWith('/status')) return evaluation('completed')
      if (url.endsWith('/report')) return report
      return { models: [] }
    })
    render(<ForecastEvaluation />)
    const card = (await screen.findByText('Avisos tardíos')).closest('[tabindex]') as HTMLElement

    await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).hover(card)

    expect(await screen.findByRole('tooltip')).toHaveTextContent(/cuenta como cruce perdido/)
  })
})
