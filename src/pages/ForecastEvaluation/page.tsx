import { type FormEvent, type ReactNode, useMemo, useState } from 'react'
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
  Loader2,
  Sparkles,
  Target,
} from 'lucide-react'

import { Button } from '@/common/ui/button'
import { Input } from '@/common/ui/input'
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

const metricCards = [
  {
    key: 'mae',
    label: 'MAE',
    detail: 'Error absoluto promedio',
    icon: Gauge,
    suffix: ' pts',
    tone: 'blue',
  },
  {
    key: 'rmse',
    label: 'RMSE',
    detail: 'Penaliza errores grandes',
    icon: BarChart3,
    suffix: ' pts',
    tone: 'indigo',
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
  blue: {
    panel: 'from-blue-50/80 to-slate-50 border-blue-100',
    text: 'text-blue-700',
    badge: 'bg-blue-100',
  },
  indigo: {
    panel: 'from-indigo-50/80 to-slate-50 border-indigo-100',
    text: 'text-indigo-700',
    badge: 'bg-indigo-100',
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
  icon: typeof Gauge
  children: ReactNode
  actions?: ReactNode
}) {
  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
            <Icon className="h-5 w-5" />
          </div>
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
        <Icon className="h-4 w-4 text-blue-600" />
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
              <th className="px-4 py-3 text-left font-semibold text-slate-600">Site ID</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">MAE</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">RMSE</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Error crítico</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Precisión</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Recall</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600">Samples</th>
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
  const [siteSampleSize, setSiteSampleSize] = useState(20)
  const [horizonHours, setHorizonHours] = useState(24)
  const [criticalLevel, setCriticalLevel] = useState(80)
  const [lookbackDays, setLookbackDays] = useState(14)
  const [levelAggregation, setLevelAggregation] = useState<'avg' | 'max'>('avg')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [evaluation, setEvaluation] = useState<EvaluationResponse | null>(null)
  const [report, setReport] = useState<EvaluationReport | null>(null)

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
        model_key: 'baseline_operational',
        horizon_hours: horizonHours,
        critical_level: criticalLevel,
        level_aggregation: levelAggregation,
        lookback_days: lookbackDays,
        stop_at_full: false,
      }
      const created = await api.post<EvaluationResponse>('/map/site-projections/evaluations', payload)
      const generatedReport = await api.get<EvaluationReport>(`/map/site-projections/evaluations/${created.id}/report`)
      setEvaluation(created)
      setReport(generatedReport)
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent">
              Evaluación del Forecaster
            </h1>
            <p className="text-slate-600 mt-1">
              Backtesting de proyecciones de llenado para medir error y detección de sitios críticos.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadReport}
            disabled={!report}
            className="border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold px-4 py-2 rounded-lg shadow-xs transition-all cursor-pointer gap-2"
          >
            <Download className="h-4 w-4" />
            Descargar informe
          </Button>
        </div>

        {error && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 shadow-xs">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
            <span>{error}</span>
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
            title="Parámetros de Evaluación"
            description="Configuración del backtesting temporal del modelo baseline_operational"
            icon={FileText}
            actions={
              <Button
                type="submit"
                disabled={loading}
                className="text-xs font-semibold gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs cursor-pointer"
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {loading ? 'Evaluando Modelo...' : 'Ejecutar Evaluación'}
              </Button>
            }
          >
            <div className="flex items-center gap-2 text-xs text-slate-500 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
              <Info className="h-4 w-4 text-blue-600 shrink-0" />
              <span>
                El backend calcula automáticamente el cutoff como <strong>última medición disponible menos horizonte</strong>. El intervalo de comparación es fijo: <strong>60 minutos</strong>.
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <ParameterField
                label="Cantidad de sitios"
                hint="Muestra aleatoria entre sitios con mediciones antes y después del cutoff calculado."
              >
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  value={siteSampleSize}
                  onChange={(event) => setSiteSampleSize(Number(event.target.value))}
                  className="bg-white"
                />
              </ParameterField>

              <ParameterField
                label="Horizonte de predicción"
                hint="Horas futuras a predecir desde el cutoff automático. Requiere datos reales posteriores."
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
                label="Umbral crítico"
                hint="Nivel usado para medir precisión y recall de alertas de desborde."
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
                label="Lookback histórico"
                hint="Días previos al cutoff usados para aprender patrones horarios y semanales."
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
                label="Agregación del sitio"
                hint="Promedio resume el sitio completo; máximo prioriza el contenedor más lleno."
              >
                <select
                  value={levelAggregation}
                  onChange={(event) => setLevelAggregation(event.target.value as 'avg' | 'max')}
                  className="h-8 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="avg">Promedio del sitio</option>
                  <option value="max">Máximo del sitio</option>
                </select>
              </ParameterField>

              <div className="space-y-2 bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
                <span className="text-xs font-semibold text-slate-700 block">Modelo</span>
                <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-white p-2">
                  <Activity className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-xs font-bold text-slate-800">baseline_operational</p>
                    <p className="text-[10px] text-slate-500">Incrementos históricos por bucket temporal</p>
                  </div>
                </div>
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
                  label={card.label}
                  detail={card.detail}
                  value={report.global_metrics[card.key]}
                  icon={card.icon}
                  suffix={card.suffix}
                  percent={card.percent}
                  tone={card.tone as keyof typeof toneStyles}
                />
              ))}
            </div>

            <Panel
              title="Resumen de Corrida"
              description="Contexto usado para interpretar las métricas obtenidas"
              icon={Database}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <SummaryCard label="Sitios evaluados" value={evaluatedSites} icon={Layers} />
                <SummaryCard label="Puntos comparados" value={comparedPoints} icon={BarChart3} />
                <SummaryCard label="Cutoff calculado" value={formatDateTime(evaluation?.cutoff)} icon={Clock3} />
                <SummaryCard label="Modelo" value={report.model_key} icon={Activity} />
              </div>
            </Panel>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Panel
                title="Mejor Predichos"
                description="Sitios con menor MAE dentro de la evaluación"
                icon={CheckCircle2}
              >
                <SiteMetricsTable sites={report.best_predicted_sites.slice(0, 5)} />
              </Panel>

              <Panel
                title="Peor Predichos"
                description="Sitios prioritarios para revisar datos, recolecciones o patrón de demanda"
                icon={AlertCircle}
              >
                <SiteMetricsTable sites={report.worst_predicted_sites.slice(0, 5)} />
              </Panel>
            </div>

            <Panel
              title="Métricas por Sitio"
              description="Se muestran hasta 50 sitios para mantener la vista liviana"
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
