import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Activity,
  AlertCircle,
  BarChart3,
  CheckCircle2,
  Clock3,
  Database,
  Download,
  FileText,
  Gauge,
  Info,
  Layers,
  LineChart,
  Target,
} from 'lucide-react'

import { Button } from '@/utils/ui/button'
import { Input } from '@/utils/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/utils/ui/tooltip'
import { api } from '@/lib/api'
import { HelpButton } from '@/documentation'

interface EvaluationMetric {
  id: number
  metric_scope: string
  metric_key: string
  metric_value: number | null
  site_id?: number | null
  sample_count?: number | null
}

interface SiteMetric {
  site_id: number
  sample_count?: number | null
  mae?: number | null
  rmse?: number | null
  critical_time_error_hours?: number | null
  threshold_precision?: number | null
  threshold_recall?: number | null
}

interface EvaluationResponse {
  id: number
  model_key: string
  status: string
  cutoff: string
  completed_at?: string | null
  horizon_hours: number
  interval_minutes: number
  critical_level: number
  level_aggregation: 'avg' | 'max'
  lookback_days: number
  site_count: number
  summary?: Record<string, unknown> | null
  metrics: EvaluationMetric[]
}

interface EvaluationReport {
  id: number
  model_key: string
  status: string
  completed_at?: string | null
  summary?: Record<string, unknown> | null
  global_metrics: Record<string, number | null>
  site_metrics: SiteMetric[]
  best_predicted_sites: SiteMetric[]
  worst_predicted_sites: SiteMetric[]
}

interface ModelOption {
  key: string
  name: string
  status?: string
}

// Id de la evaluacion en curso: se sigue al recargar o desde otra pestana.
const ACTIVE_EVALUATION_KEY = 'forecastEvaluation.activeId'
const STATUS_POLL_MS = 3000
const MAX_STATUS_FAILURES = 3

const readActiveEvaluation = (): number | null => {
  try {
    const value = window.localStorage.getItem(ACTIVE_EVALUATION_KEY)
    return value ? Number(value) : null
  } catch {
    return null
  }
}

const saveActiveEvaluation = (id: number | null) => {
  try {
    if (id === null) window.localStorage.removeItem(ACTIVE_EVALUATION_KEY)
    else window.localStorage.setItem(ACTIVE_EVALUATION_KEY, String(id))
  } catch {
    // Sin localStorage la pagina sigue andando; solo no recuerda la evaluacion.
  }
}

const formatNumber = (value: number | null | undefined, suffix = '') => {
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/A'
  return `${value.toFixed(2)}${suffix}`
}

const formatPercent = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) return 'N/A'
  return `${Math.round(value * 100)}%`
}

const formatDateTime = (value?: string | null) => {
  if (!value) return 'N/A'
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value))
}

const formatCount = (value: unknown) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return 'N/A'
  return String(Math.round(Number(value)))
}

const metricCards = [
  { key: 'event_f1', icon: Target, percent: true, tone: 'sky' },
  { key: 'event_precision', icon: CheckCircle2, percent: true, tone: 'amber' },
  { key: 'event_recall', icon: LineChart, percent: true, tone: 'emerald' },
  { key: 'mae', icon: Gauge, suffix: ' pts', tone: 'slate' },
]

const toneStyles = {
  sky: {
    panel: 'from-sky-50/80 to-slate-50 border-sky-100',
    text: 'text-sky-700',
    badge: 'bg-sky-100',
  },
  slate: {
    panel: 'from-slate-100/80 to-slate-50 border-slate-200',
    text: 'text-slate-700',
    badge: 'bg-slate-200',
  },
  amber: {
    panel: 'from-amber-50/80 to-slate-50 border-amber-100',
    text: 'text-amber-700',
    badge: 'bg-amber-100',
  },
  emerald: {
    panel: 'from-emerald-50/80 to-slate-50 border-emerald-100',
    text: 'text-emerald-700',
    badge: 'bg-emerald-100',
  },
}

function Panel({
  title,
  description,
  icon: Icon,
  children,
  actions,
}: {
  title: string
  description?: string
  icon?: typeof Gauge
  children: ReactNode
  actions?: ReactNode
}) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="p-2 rounded-lg bg-sky-50 text-sky-700">
              <Icon className="h-5 w-5" />
            </div>
          )}
          <div>
            <h2 className="font-bold text-slate-900 text-base">{title}</h2>
            {description && <p className="text-xs text-slate-500">{description}</p>}
          </div>
        </div>
        {actions}
      </div>
      {children}
    </section>
  )
}

function MetricCard({
  label,
  detail,
  value,
  icon: Icon,
  suffix,
  percent,
  tone,
}: {
  label: string
  detail: string
  value: number | null | undefined
  icon: typeof Gauge
  suffix?: string
  percent?: boolean
  tone: keyof typeof toneStyles
}) {
  const classes = toneStyles[tone]

  return (
    <div className={`rounded-xl border bg-gradient-to-br ${classes.panel} p-4 shadow-xs`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
          <p className="mt-1 text-[11px] text-slate-500">{detail}</p>
        </div>
        <div className={`rounded-lg p-2 ${classes.badge}`}>
          <Icon className={`h-4 w-4 ${classes.text}`} />
        </div>
      </div>
      <p className="mt-4 text-3xl font-black text-slate-900">
        {percent ? formatPercent(value) : formatNumber(value, suffix)}
      </p>
    </div>
  )
}

function ParameterField({
  label,
  hint,
  children,
}: {
  label: string
  hint: string
  children: ReactNode
}) {
  return (
    <label className="space-y-2 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100 text-sm font-semibold text-slate-700">
      <span className="block text-xs font-semibold text-slate-700">{label}</span>
      {children}
      <span className="block text-[11px] font-normal leading-snug text-slate-500">{hint}</span>
    </label>
  )
}

function FieldGroup({
  title,
  description,
  columns,
  children,
}: {
  title: string
  description: string
  columns: 2 | 3
  children: ReactNode
}) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-600">{title}</h3>
        <p className="text-[11px] text-slate-500">{description}</p>
      </div>
      <div className={`grid grid-cols-1 gap-4 ${columns === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>{children}</div>
    </section>
  )
}

function SummaryCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string
  value: ReactNode
  icon: typeof Gauge
  hint?: string
}) {
  const card = (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-4 shadow-xs ${hint ? 'cursor-help focus:outline-none focus:ring-2 focus:ring-sky-500' : ''}`}
      tabIndex={hint ? 0 : undefined}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
          {hint && <Info className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />}
        </p>
        <Icon className="h-4 w-4 text-sky-600" />
      </div>
      <div className="mt-2 text-xl font-black text-slate-900">{value}</div>
    </div>
  )
  if (!hint) return card
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>{card}</TooltipTrigger>
        <TooltipContent side="top">{hint}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function SiteMetricsTable({ sites }: { sites: SiteMetric[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600">ID de Sitio</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">MAE</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">RMSE</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Error crítico</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Precisión por hora</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Recall por hora</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Muestras</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sites.map((site) => (
              <tr key={site.site_id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold text-slate-800">{site.site_id}</td>
                <td className="px-4 py-3 text-right text-slate-700">{formatNumber(site.mae)}</td>
                <td className="px-4 py-3 text-right text-slate-700">{formatNumber(site.rmse)}</td>
                <td className="px-4 py-3 text-right text-slate-700">
                  {formatNumber(site.critical_time_error_hours, ' h')}
                </td>
                <td className="px-4 py-3 text-right text-slate-700">
                  {formatPercent(site.threshold_precision)}
                </td>
                <td className="px-4 py-3 text-right text-slate-700">
                  {formatPercent(site.threshold_recall)}
                </td>
                <td className="px-4 py-3 text-right text-slate-700">{site.sample_count ?? 'N/A'}</td>
              </tr>
            ))}
            {sites.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={7}>
                  No hay métricas por sitio para mostrar.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const escapeHtml = (value: unknown) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const buildReportHtml = (report: EvaluationReport) => {
  const rows = report.site_metrics
    .map(
      (site) => `
        <tr>
          <td>${site.site_id}</td>
          <td>${formatNumber(site.mae)}</td>
          <td>${formatNumber(site.rmse)}</td>
          <td>${formatNumber(site.critical_time_error_hours, ' h')}</td>
          <td>${formatPercent(site.threshold_precision)}</td>
          <td>${formatPercent(site.threshold_recall)}</td>
          <td>${site.sample_count ?? 'N/A'}</td>
        </tr>`
    )
    .join('')

  return `
    <!doctype html>
    <html>
      <head>
        <title>Informe evaluación ${report.id}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #0f172a; margin: 32px; }
          h1 { margin: 0 0 8px; }
          h2 { margin-top: 28px; }
          .meta, .cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
          .card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; }
          .label { color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: 700; }
          .value { font-size: 24px; font-weight: 800; margin-top: 6px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: right; }
          th:first-child, td:first-child { text-align: left; }
          th { background: #f1f5f9; }
          @media print { button { display: none; } body { margin: 18mm; } }
        </style>
      </head>
      <body>
        <button onclick="window.print()">Guardar como PDF</button>
        <h1>Informe de evaluación de proyección</h1>
        <p>Modelo: <strong>${escapeHtml(report.model_key)}</strong> · Evaluación #${report.id}</p>
        <div class="meta">
          <div class="card"><div class="label">Estado</div><div>${escapeHtml(report.status)}</div></div>
          <div class="card"><div class="label">Finalizada</div><div>${formatDateTime(report.completed_at)}</div></div>
          <div class="card"><div class="label">Sitios evaluados</div><div>${escapeHtml(report.summary?.site_count ?? report.site_metrics.length)}</div></div>
          <div class="card"><div class="label">Cortes y casos</div><div>${formatCount(report.summary?.cutoff_count)} cortes · ${formatCount(report.summary?.case_count)} casos</div></div>
        </div>
        <h2>Avisos por evento</h2>
        <p>Un caso por sitio y corte: acierta si avisa a tiempo antes de que el sitio cruce el umbral sin recolección. Los sitios que ya estaban críticos en el corte no cuentan.</p>
        <div class="cards">
          <div class="card"><div class="label">F1 por evento</div><div class="value">${formatPercent(report.global_metrics.event_f1)}</div></div>
          <div class="card"><div class="label">Precisión</div><div class="value">${formatPercent(report.global_metrics.event_precision)}</div></div>
          <div class="card"><div class="label">Recall</div><div class="value">${formatPercent(report.global_metrics.event_recall)}</div></div>
          <div class="card"><div class="label">F1 sin mirar la hora</div><div class="value">${formatPercent(report.global_metrics.event_horizon_f1)}</div></div>
          <div class="card"><div class="label">Cruces a anticipar</div><div>${formatCount(report.global_metrics.event_observed)} (ya críticos en el corte: ${formatCount(report.summary?.critical_at_cutoff)})</div></div>
          <div class="card"><div class="label">Avisos muy tempranos / tardíos</div><div>${formatCount(report.global_metrics.event_too_early)} / ${formatCount(report.global_metrics.event_too_late)}</div></div>
        </div>
        <h2>Error de nivel (contra el nivel sin recolección)</h2>
        <div class="cards">
          <div class="card"><div class="label">MAE</div><div class="value">${formatNumber(report.global_metrics.mae, ' pts')}</div></div>
          <div class="card"><div class="label">RMSE</div><div class="value">${formatNumber(report.global_metrics.rmse, ' pts')}</div></div>
        </div>
        <h2>Métricas por sitio</h2>
        <table>
          <thead>
            <tr><th>Site ID</th><th>MAE</th><th>RMSE</th><th>Error crítico</th><th>Precisión por hora</th><th>Recall por hora</th><th>Samples</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </body>
    </html>`
}

export default function ForecastEvaluation() {
  const { t } = useTranslation()
  const [selectedModel, setSelectedModel] = useState<string>('baseline_operational')
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([
    { key: 'baseline_operational', name: 'Baseline operativo' },
    { key: 'chronos_2_small', name: 'Chronos-2 Small' },
  ])
  const [siteSampleSize, setSiteSampleSize] = useState(500)
  const [horizonHours, setHorizonHours] = useState(24)
  const [criticalLevel, setCriticalLevel] = useState(80)
  const [lookbackDays, setLookbackDays] = useState(14)
  const [levelAggregation, setLevelAggregation] = useState<'avg' | 'max'>('avg')
  const [cutoffCount, setCutoffCount] = useState(14)
  const [cutoffSpacingHours, setCutoffSpacingHours] = useState(13)
  const [minHistoryDays, setMinHistoryDays] = useState(7)
  const [criticalEarlyHours, setCriticalEarlyHours] = useState(3)
  const [criticalLateHours, setCriticalLateHours] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [evaluation, setEvaluation] = useState<EvaluationResponse | null>(null)
  const [report, setReport] = useState<EvaluationReport | null>(null)
  const [activeEvaluationId, setActiveEvaluationId] = useState<number | null>(readActiveEvaluation)
  const [progress, setProgress] = useState<EvaluationResponse | null>(null)
  const running = activeEvaluationId !== null

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === ACTIVE_EVALUATION_KEY) setActiveEvaluationId(readActiveEvaluation())
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    if (activeEvaluationId === null) return
    let cancelled = false
    let timeoutId: number
    let failures = 0

    const finish = () => {
      saveActiveEvaluation(null)
      setActiveEvaluationId(null)
      setProgress(null)
    }

    const poll = async () => {
      try {
        const current = await api.get<EvaluationResponse>(
          `/map/site-projections/evaluations/${activeEvaluationId}/status`
        )
        if (cancelled) return
        failures = 0
        setProgress(current)
        if (current.status === 'completed') {
          const generatedReport = await api.get<EvaluationReport>(
            `/map/site-projections/evaluations/${activeEvaluationId}/report`
          )
          if (cancelled) return
          setEvaluation(current)
          setReport(generatedReport)
          finish()
          return
        }
        if (current.status === 'failed') {
          setError(String(current.summary?.error ?? t('forecast.evaluation_failed')))
          finish()
          return
        }
      } catch (err) {
        if (cancelled) return
        failures += 1
        if (failures >= MAX_STATUS_FAILURES) {
          setError(err instanceof Error ? err.message : t('forecast.evaluation_failed'))
          finish()
          return
        }
      }
      timeoutId = window.setTimeout(() => void poll(), STATUS_POLL_MS)
    }

    void poll()
    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [activeEvaluationId, t])

  useEffect(() => {
    api.get<{ default_model_key: string; models: ModelOption[] }>(
      '/map/site-projections/models'
    ).then((res) => {
      if (res?.models && res.models.length > 0) {
        setAvailableModels(res.models)
        if (res.default_model_key) {
          setSelectedModel(res.default_model_key)
        }
      }
    }).catch(() => { })
  }, [])

  const comparedPoints = useMemo(
    () => Number(report?.summary?.compared_points ?? evaluation?.summary?.compared_points ?? 0),
    [evaluation, report]
  )
  const evaluatedSites = Number(report?.summary?.site_count ?? report?.site_metrics.length ?? evaluation?.site_count ?? 0)

  const handleRunEvaluation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (running) return
    setLoading(true)
    setError(null)
    setEvaluation(null)
    setReport(null)

    try {
      const payload = {
        site_sample_size: siteSampleSize,
        model_key: selectedModel,
        horizon_hours: horizonHours,
        critical_level: criticalLevel,
        level_aggregation: levelAggregation,
        lookback_days: lookbackDays,
        stop_at_full: false,
        cutoff_count: cutoffCount,
        cutoff_spacing_hours: cutoffSpacingHours,
        min_history_days: minHistoryDays,
        critical_early_hours: criticalEarlyHours,
        critical_late_hours: criticalLateHours,
      }
      const created = await api.post<EvaluationResponse>('/map/site-projections/evaluations', payload)
      saveActiveEvaluation(created.id)
      setActiveEvaluationId(created.id)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'No se pudo ejecutar la evaluación.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadReport = () => {
    if (!report) return
    const popup = window.open('', '_blank', 'width=1024,height=768')
    if (!popup) {
      setError('El navegador bloqueó la ventana del informe.')
      return
    }
    popup.document.open()
    popup.document.write(buildReportHtml(report))
    popup.document.close()
    popup.focus()
  }

  const displayedSiteMetrics = report?.site_metrics.slice(0, 50) ?? []

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/40 to-emerald-50/30 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">
              {t('forecast.title')}
            </h1>
            <p className="text-slate-600 mt-1">
              {t('forecast.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <HelpButton sectionId="forecast" className="border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold px-4 py-2 rounded-xl shadow-xs cursor-pointer gap-2" />
            <Button
              type="button"
              variant="outline"
              onClick={handleDownloadReport}
              disabled={!report}
              className="border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold px-4 py-2 rounded-xl shadow-xs transition-all cursor-pointer gap-2"
            >
              <Download className="h-4 w-4" />
              {t('forecast.download_report')}
            </Button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 shadow-xs">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {running && (
          <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800 shadow-xs">
            <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
            <span>
              {t('forecast.evaluation_in_progress', {
                id: activeEvaluationId,
                processed: Number(progress?.summary?.processed_sites ?? 0),
                total: progress?.site_count ?? 0,
              })}
            </span>
          </div>
        )}

        {evaluation && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-xs">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
            <span>
              Evaluación #{evaluation.id} completada con {evaluation.site_count} sitios. Cutoff calculado:{' '}
              <strong>{formatDateTime(evaluation.cutoff)}</strong>.
            </span>
          </div>
        )}

        <form onSubmit={handleRunEvaluation}>
          <Panel
            title={t('forecast.evaluation_parameters')}
            description={t('forecast.backtesting_config', {
              model: availableModels.find((m) => m.key === selectedModel)?.name || selectedModel,
            })}
            actions={
              <Button
                type="submit"
                disabled={loading || running}
                className="text-xs font-bold px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-xs cursor-pointer transition-all"
              >
                {loading || running ? t('forecast.running_evaluation') : t('forecast.run_evaluation')}
              </Button>
            }
          >
            <div className="flex items-center gap-2 text-xs text-slate-600 bg-sky-50/60 p-2.5 rounded-xl border border-sky-100">
              <Info className="h-4 w-4 text-sky-600 shrink-0" />
              <span>{t('forecast.cutoff_info')}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
              <ParameterField label={t('forecast.model')} hint={t('forecast.model_hint')}>
                <select
                  value={selectedModel}
                  onChange={(event) => setSelectedModel(event.target.value)}
                  className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {availableModels.map((m) => (
                    <option key={m.key} value={m.key}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </ParameterField>
              <ParameterField
                label={t('forecast.site_count')}
                hint={t('forecast.site_count_hint')}
              >
                <Input
                  type="number"
                  min={1}
                  max={5000}
                  value={siteSampleSize}
                  onChange={(event) => setSiteSampleSize(Number(event.target.value))}
                  className="bg-white"
                />
              </ParameterField>
              <ParameterField
                label={t('forecast.horizon')}
                hint={t('forecast.horizon_hint')}
              >
                <Input
                  type="number"
                  min={1}
                  max={168}
                  value={horizonHours}
                  onChange={(event) => setHorizonHours(Number(event.target.value))}
                  className="bg-white"
                />
              </ParameterField>
              <ParameterField
                label={t('forecast.critical_threshold')}
                hint={t('forecast.critical_threshold_hint')}
              >
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={criticalLevel}
                  onChange={(event) => setCriticalLevel(Number(event.target.value))}
                  className="bg-white"
                />
              </ParameterField>
            </div>

            <details className="rounded-xl border border-slate-200 bg-white">
              <summary className="cursor-pointer select-none px-4 py-3 text-xs font-semibold text-slate-700">
                {t('forecast.advanced_options')}
                <span className="ml-2 font-normal text-slate-500">{t('forecast.advanced_options_hint')}</span>
              </summary>
              <div className="space-y-5 border-t border-slate-100 p-4">
                <FieldGroup title={t('forecast.group_history')} description={t('forecast.group_history_desc')} columns={2}>
                  <ParameterField
                    label={t('forecast.historical_lookback')}
                    hint={t('forecast.historical_lookback_hint')}
                  >
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={lookbackDays}
                      onChange={(event) => setLookbackDays(Number(event.target.value))}
                      className="bg-white"
                    />
                  </ParameterField>
                  <ParameterField
                    label={t('forecast.aggregation')}
                    hint={t('forecast.aggregation_hint')}
                  >
                    <select
                      value={levelAggregation}
                      onChange={(event) => setLevelAggregation(event.target.value as 'avg' | 'max')}
                      className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-sky-500"
                    >
                      <option value="avg">{t('forecast.aggregation_avg')}</option>
                      <option value="max">{t('forecast.aggregation_max')}</option>
                    </select>
                  </ParameterField>
                </FieldGroup>
                <FieldGroup title={t('forecast.group_cutoffs')} description={t('forecast.group_cutoffs_desc')} columns={3}>
                  <ParameterField label={t('forecast.cutoff_count')} hint={t('forecast.cutoff_count_hint')}>
                    <Input
                      type="number"
                      min={1}
                      max={56}
                      value={cutoffCount}
                      onChange={(event) => setCutoffCount(Number(event.target.value))}
                      className="bg-white"
                    />
                  </ParameterField>
                  <ParameterField label={t('forecast.cutoff_spacing')} hint={t('forecast.cutoff_spacing_hint')}>
                    <Input
                      type="number"
                      min={1}
                      max={168}
                      value={cutoffSpacingHours}
                      onChange={(event) => setCutoffSpacingHours(Number(event.target.value))}
                      className="bg-white"
                    />
                  </ParameterField>
                  <ParameterField label={t('forecast.min_history')} hint={t('forecast.min_history_hint')}>
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={minHistoryDays}
                      onChange={(event) => setMinHistoryDays(Number(event.target.value))}
                      className="bg-white"
                    />
                  </ParameterField>
                </FieldGroup>
                <FieldGroup title={t('forecast.group_window')} description={t('forecast.group_window_desc')} columns={2}>
                  <ParameterField label={t('forecast.early_hours')} hint={t('forecast.early_hours_hint')}>
                    <Input
                      type="number"
                      min={0}
                      max={24}
                      value={criticalEarlyHours}
                      onChange={(event) => setCriticalEarlyHours(Number(event.target.value))}
                      className="bg-white"
                    />
                  </ParameterField>
                  <ParameterField label={t('forecast.late_hours')} hint={t('forecast.late_hours_hint')}>
                    <Input
                      type="number"
                      min={0}
                      max={24}
                      value={criticalLateHours}
                      onChange={(event) => setCriticalLateHours(Number(event.target.value))}
                      className="bg-white"
                    />
                  </ParameterField>
                </FieldGroup>
              </div>
            </details>
          </Panel>
        </form>

        {report && (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {metricCards.map((card) => (
                <MetricCard
                  key={card.key}
                  label={t(`forecast.${card.key}_label`)}
                  detail={t(`forecast.${card.key}_detail`)}
                  value={report.global_metrics[card.key]}
                  icon={card.icon}
                  suffix={card.suffix}
                  percent={card.percent}
                  tone={card.tone as keyof typeof toneStyles}
                />
              ))}
            </div>

            <Panel title={t('forecast.events_title')} description={t('forecast.events_desc')} icon={Target}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard label={t('forecast.events_observed')} value={formatCount(report.global_metrics.event_observed)} icon={Layers} hint={t('forecast.events_observed_hint')} />
                <SummaryCard label={t('forecast.critical_at_cutoff')} value={formatCount(report.summary?.critical_at_cutoff)} icon={AlertCircle} hint={t('forecast.critical_at_cutoff_hint')} />
                <SummaryCard label={t('forecast.too_early')} value={formatCount(report.global_metrics.event_too_early)} icon={Clock3} hint={t('forecast.too_early_hint')} />
                <SummaryCard label={t('forecast.too_late')} value={formatCount(report.global_metrics.event_too_late)} icon={Clock3} hint={t('forecast.too_late_hint')} />
                <SummaryCard label={t('forecast.horizon_f1')} value={formatPercent(report.global_metrics.event_horizon_f1)} icon={Target} hint={t('forecast.horizon_f1_hint')} />
                <SummaryCard label={t('forecast.warning_error')} value={formatNumber(report.global_metrics.critical_time_mae_hours, ' h')} icon={Clock3} hint={t('forecast.warning_error_hint')} />
                <SummaryCard label={t('forecast.warning_bias')} value={formatNumber(report.global_metrics.critical_time_bias_hours, ' h')} icon={Clock3} hint={t('forecast.warning_bias_hint')} />
                <SummaryCard label="RMSE" value={formatNumber(report.global_metrics.rmse, ' pts')} icon={BarChart3} hint={t('forecast.rmse_hint')} />
              </div>
            </Panel>

            <Panel
              title={t('forecast.run_summary')}
              description={t('forecast.run_summary_desc')}
              icon={Database}
            >
              {report.summary?.short_history === true && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>{t('forecast.short_history')}</span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <SummaryCard label={t('forecast.evaluated_sites')} value={evaluatedSites} icon={Layers} />
                <SummaryCard label={t('forecast.cutoffs_evaluated')} value={formatCount(report.summary?.cutoff_count)} icon={Clock3} />
                <SummaryCard label={t('forecast.cases')} value={formatCount(report.summary?.case_count)} icon={Database} />
                <SummaryCard label={t('forecast.compared_points')} value={comparedPoints} icon={BarChart3} />
                <SummaryCard label={t('forecast.calculated_cutoff')} value={formatDateTime(evaluation?.cutoff)} icon={Clock3} />
                <SummaryCard label={t('forecast.model')} value={report.model_key} icon={Activity} />
              </div>
            </Panel>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Panel
                title={t('forecast.best_predicted')}
                description={t('forecast.best_predicted_desc')}
                icon={CheckCircle2}
              >
                <SiteMetricsTable sites={report.best_predicted_sites.slice(0, 5)} />
              </Panel>

              <Panel
                title={t('forecast.worst_predicted')}
                description={t('forecast.worst_predicted_desc')}
                icon={AlertCircle}
              >
                <SiteMetricsTable sites={report.worst_predicted_sites.slice(0, 5)} />
              </Panel>
            </div>

            <Panel
              title={t('forecast.site_metrics')}
              description={t('forecast.site_metrics_desc')}
              icon={FileText}
            >
              <SiteMetricsTable sites={displayedSiteMetrics} />
            </Panel>
          </>
        )}
      </div>
    </div>
  )
}
