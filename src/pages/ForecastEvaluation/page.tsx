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
import { api } from '@/lib/api'

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
  cutoff: string | null
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

const ACTIVE_EVALUATION_KEY = 'waiot_active_forecast_evaluation'

const metricCards = [
  {
    key: 'mae',
    label: 'MAE',
    detail: 'Error absoluto promedio',
    icon: Gauge,
    suffix: ' pts',
    tone: 'sky',
  },
  {
    key: 'rmse',
    label: 'RMSE',
    detail: 'Penaliza errores grandes',
    icon: BarChart3,
    suffix: ' pts',
    tone: 'slate',
  },
  {
    key: 'threshold_precision',
    label: 'Precisión crítico',
    detail: 'Alertas críticas acertadas',
    icon: Target,
    percent: true,
    tone: 'amber',
  },
  {
    key: 'threshold_recall',
    label: 'Recall crítico',
    detail: 'Críticos reales detectados',
    icon: LineChart,
    percent: true,
    tone: 'emerald',
  },
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

function SummaryCard({
  label,
  value,
  icon: Icon,
}: {
  label: string
  value: ReactNode
  icon: typeof Gauge
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <Icon className="h-4 w-4 text-sky-600" />
      </div>
      <div className="mt-2 text-xl font-black text-slate-900">{value}</div>
    </div>
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
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Precisión</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Recall</th>
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
          <div class="card"><div class="label">Puntos comparados</div><div>${escapeHtml(report.summary?.compared_points ?? 'N/A')}</div></div>
        </div>
        <h2>Métricas globales</h2>
        <div class="cards">
          <div class="card"><div class="label">MAE</div><div class="value">${formatNumber(report.global_metrics.mae, ' pts')}</div></div>
          <div class="card"><div class="label">RMSE</div><div class="value">${formatNumber(report.global_metrics.rmse, ' pts')}</div></div>
          <div class="card"><div class="label">Precisión crítico</div><div class="value">${formatPercent(report.global_metrics.threshold_precision)}</div></div>
          <div class="card"><div class="label">Recall crítico</div><div class="value">${formatPercent(report.global_metrics.threshold_recall)}</div></div>
        </div>
        <h2>Métricas por sitio</h2>
        <table>
          <thead>
            <tr><th>Site ID</th><th>MAE</th><th>RMSE</th><th>Error crítico</th><th>Precisión</th><th>Recall</th><th>Samples</th></tr>
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
  const [siteSampleSize, setSiteSampleSize] = useState(20)
  const [horizonHours, setHorizonHours] = useState(24)
  const [criticalLevel, setCriticalLevel] = useState(80)
  const [lookbackDays, setLookbackDays] = useState(14)
  const [levelAggregation, setLevelAggregation] = useState<'avg' | 'max'>('avg')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [evaluation, setEvaluation] = useState<EvaluationResponse | null>(null)
  const [report, setReport] = useState<EvaluationReport | null>(null)
  const [activeEvaluationId, setActiveEvaluationId] = useState<number | null>(null)

  useEffect(() => {
    const savedId = Number(sessionStorage.getItem(ACTIVE_EVALUATION_KEY))
    if (savedId > 0) setActiveEvaluationId(savedId)
  }, [])

  useEffect(() => {
    if (activeEvaluationId === null) return
    let cancelled = false
    let timer: number | undefined

    const poll = async () => {
      try {
        const current = await api.get<EvaluationResponse>(
          `/map/site-projections/evaluations/${activeEvaluationId}/status`
        )
        if (cancelled) return
        setEvaluation(current)
        setError(null)
        if (current.status === 'completed') {
          const generatedReport = await api.get<EvaluationReport>(
            `/map/site-projections/evaluations/${activeEvaluationId}/report`
          )
          if (cancelled) return
          setReport(generatedReport)
          sessionStorage.removeItem(ACTIVE_EVALUATION_KEY)
          setActiveEvaluationId(null)
          return
        }
        if (current.status === 'failed') {
          setError(String(current.summary?.error ?? 'No se pudo ejecutar la evaluación.'))
          sessionStorage.removeItem(ACTIVE_EVALUATION_KEY)
          setActiveEvaluationId(null)
          return
        }
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'No se pudo consultar la evaluación. Reintentando.')
      }
      timer = window.setTimeout(poll, 2500)
    }

    void poll()
    return () => {
      cancelled = true
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [activeEvaluationId])

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
      }
      const created = await api.post<EvaluationResponse>('/map/site-projections/evaluations', payload)
      setEvaluation(created)
      sessionStorage.setItem(ACTIVE_EVALUATION_KEY, String(created.id))
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

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 shadow-xs">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {activeEvaluationId !== null && (
          <div className="flex items-start gap-3 rounded border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
            <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-sky-600" />
            <span>
              Evaluación #{activeEvaluationId} en curso
              {evaluation?.site_count ? `: ${Number(evaluation.summary?.processed_sites ?? 0)} de ${evaluation.site_count} sitios procesados` : ''}.
            </span>
          </div>
        )}

        {evaluation?.status === 'completed' && report && (
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
                disabled={loading || activeEvaluationId !== null}
                className="text-xs font-bold px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-xs cursor-pointer transition-all"
              >
                {loading || activeEvaluationId !== null ? t('forecast.running_evaluation') : t('forecast.run_evaluation')}
              </Button>
            }
          >
            <div className="flex items-center gap-2 text-xs text-slate-600 bg-sky-50/60 p-2.5 rounded-xl border border-sky-100">
              <Info className="h-4 w-4 text-sky-600 shrink-0" />
              <span>{t('forecast.cutoff_info')}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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

              <div className="space-y-2 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                <span className="text-xs font-semibold text-slate-700 block">{t('forecast.model')}</span>
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
              </div>
            </div>
          </Panel>
        </form>

        {report && (
          <>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
              {metricCards.map((card) => (
                <MetricCard
                  key={card.key}
                  label={card.key === 'threshold_precision' ? t('forecast.precision_label') : card.key === 'threshold_recall' ? t('forecast.recall_label') : card.label}
                  detail={t(`forecast.${card.key === 'threshold_precision' ? 'precision_detail' : card.key === 'threshold_recall' ? 'recall_detail' : `${card.key}_detail`}`)}
                  value={report.global_metrics[card.key]}
                  icon={card.icon}
                  suffix={card.suffix}
                  percent={card.percent}
                  tone={card.tone as keyof typeof toneStyles}
                />
              ))}
            </div>

            <Panel
              title={t('forecast.run_summary')}
              description={t('forecast.run_summary_desc')}
              icon={Database}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard label={t('forecast.evaluated_sites')} value={evaluatedSites} icon={Layers} />
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
