import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, MapPin, RefreshCw } from 'lucide-react'
import { Button } from '@/utils/ui/button'
import { api } from '@/lib/api'
import { useLevelThresholds, type LevelThresholds } from '@/context/CityConfigContext'
import type {
  BackendSite,
  BackendSiteHistory,
  BackendSiteHistoryPoint,
  BackendSiteProjection,
  BackendSiteProjectionPoint,
} from '@/utils/types'

const formatDateTime = (value?: string | null, locale = 'es-AR') => {
  if (!value) return null
  return new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

const formatChartTime = (value: string, locale = 'es-AR') => (
  new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
)

const formatChartDate = (value: string, locale = 'es-AR') => (
  new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(value))
)

const levelColorClass = (level: number, thresholds: LevelThresholds) => {
  if (level >= thresholds.critical) return 'bg-red-500'
  if (level >= thresholds.high) return 'bg-amber-500'
  return 'bg-emerald-500'
}

interface ModelOption {
  key: string
  name: string
  description?: string
}

function LevelHistoryChart({
  points,
  projection,
  selectedModel,
  availableModels,
  onSelectModel,
}: {
  points: BackendSiteHistoryPoint[]
  projection: BackendSiteProjection | null
  selectedModel?: string
  availableModels?: ModelOption[]
  onSelectModel?: (key: string) => void
}) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'es-AR'

  const chart = useMemo(() => {
    const height = 260
    const padding = 42
    const msPerHour = 60 * 60 * 1000
    const projectionPoints = projection?.points ?? []
    const timestamps = [
      ...points.map((point) => new Date(point.timestamp).getTime()),
      ...projectionPoints.map((point) => new Date(point.timestamp).getTime()),
      ...(projection?.generated_at ? [new Date(projection.generated_at).getTime()] : []),
    ].filter((value) => !Number.isNaN(value))
    const firstTime = timestamps.length > 0 ? Math.min(...timestamps) : Date.now()
    const lastTime = timestamps.length > 0 ? Math.max(...timestamps) : Date.now()
    const startHour = Math.floor(firstTime / msPerHour) * msPerHour
    const endHour = Math.ceil(lastTime / msPerHour) * msPerHour
    const hourCount = Math.max(1, Math.round((endHour - startHour) / msPerHour))
    const hourWidth = 64
    const width = Math.max(720, padding * 2 + hourCount * hourWidth)
    const innerWidth = width - padding * 2
    const innerHeight = height - padding * 2

    if (points.length === 0 && projectionPoints.length === 0) {
      return {
        width,
        height,
        line: '',
        area: '',
        coords: [] as Array<{ x: number; y: number; point: BackendSiteHistoryPoint }>,
        projectionLine: '',
        confidenceArea: '',
        projectionCoords: [] as Array<{ x: number; y: number; point: BackendSiteProjectionPoint }>,
        xTicks: [] as Array<{ x: number; date: Date }>,
        nowX: null as number | null,
        criticalY: null as number | null,
      }
    }

    const timeRange = Math.max(msPerHour, endHour - startHour)
    const xForTime = (value: string) => {
      const pointTime = new Date(value).getTime()
      return padding + ((pointTime - startHour) / timeRange) * innerWidth
    }
    const yForLevel = (level: number) => (
      padding + innerHeight - (Math.max(0, Math.min(100, level)) / 100) * innerHeight
    )
    const coords = points.map((point) => {
      const x = points.length === 1
        ? padding + innerWidth / 2
        : xForTime(point.timestamp)
      const y = yForLevel(point.avg_level)
      return { x, y, point }
    })
    const projectionCoords = projectionPoints.map((point) => ({
      x: xForTime(point.timestamp),
      y: yForLevel(point.predicted_level),
      point,
    }))

    const line = coords.map((coord, index) => `${index === 0 ? 'M' : 'L'} ${coord.x} ${coord.y}`).join(' ')
    const area = coords.length > 0
      ? `${line} L ${coords[coords.length - 1].x} ${height - padding} L ${coords[0].x} ${height - padding} Z`
      : ''
    const projectionLine = projectionCoords.map((coord, index) => `${index === 0 ? 'M' : 'L'} ${coord.x} ${coord.y}`).join(' ')

    // Banda probabilística de cuantiles (ej. Chronos 10% - 90%)
    const hasBounds = projectionPoints.some((p) => p.lower_bound != null && p.upper_bound != null)
    let confidenceArea = ''
    if (hasBounds && projectionPoints.length > 0) {
      const upperCoords = projectionPoints.map((p) => ({
        x: xForTime(p.timestamp),
        y: yForLevel(p.upper_bound ?? p.predicted_level),
      }))
      const lowerCoords = [...projectionPoints].reverse().map((p) => ({
        x: xForTime(p.timestamp),
        y: yForLevel(p.lower_bound ?? p.predicted_level),
      }))
      const allCoords = [...upperCoords, ...lowerCoords]
      confidenceArea = allCoords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ') + ' Z'
    }

    const xTicks = Array.from({ length: hourCount + 1 }, (_, index) => {
      const tickTime = startHour + index * msPerHour
      return {
        x: padding + ((tickTime - startHour) / timeRange) * innerWidth,
        date: new Date(tickTime),
      }
    })
    const nowX = projection?.generated_at ? xForTime(projection.generated_at) : null
    const criticalY = projection ? yForLevel(projection.critical_level) : null

    return {
      width,
      height,
      line,
      area,
      coords,
      projectionLine,
      confidenceArea,
      projectionCoords,
      xTicks,
      nowX,
      criticalY,
    }
  }, [points, projection])

  if (points.length === 0 && (!projection || projection.points.length === 0)) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
        {t('site_detail.no_history')}
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{t('site_detail.history_and_projection')}</h2>
          <p className="text-sm text-slate-500">{t('site_detail.observed_and_projection')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {availableModels && availableModels.length > 1 && onSelectModel && (
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold">
              {availableModels.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => onSelectModel(m.key)}
                  className={`rounded-md px-2.5 py-1 transition-all ${
                    selectedModel === m.key
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title={m.description || m.name}
                >
                  {m.name.split(' (')[0]}
                </button>
              ))}
            </div>
          )}
          <div className="text-right text-sm">
            <p className="font-semibold text-slate-600">{t('site_detail.historical_count', { count: points.length })}</p>
            {projection?.critical_at ? (
              <p className="text-xs font-semibold text-red-600">
                {t('site_detail.critical_threshold_at', { time: formatDateTime(projection.critical_at, locale) })}
              </p>
            ) : (
              <p className="text-xs text-slate-500">{t('site_detail.no_critical_crossing')}</p>
            )}
          </div>
        </div>
      </div>
      <div className="mb-2 flex flex-wrap gap-3 text-xs font-semibold">
        <span className="inline-flex items-center gap-1 text-emerald-700">
          <span className="h-0.5 w-6 rounded bg-emerald-600" /> {t('site_detail.legend_historical')}
        </span>
        <span className="inline-flex items-center gap-1 text-sky-700">
          <span className="h-0.5 w-6 rounded border-t-2 border-dashed border-sky-600" /> {t('site_detail.legend_projection')}
        </span>
        {chart.confidenceArea && (
          <span className="inline-flex items-center gap-1 text-sky-600">
            <span className="h-2.5 w-4 rounded bg-sky-200" /> {t('site_detail.legend_confidence_band')}
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-red-700">
          <span className="h-0.5 w-6 rounded bg-red-500" /> {t('site_detail.legend_critical_threshold')}
        </span>
        {projection && (
          <span className="rounded bg-slate-100 px-2 py-0.5 text-slate-600">
            {t('site_detail.confidence', { value: Math.round(projection.confidence * 100) })}
          </span>
        )}
      </div>
      <div className="overflow-x-auto pb-2">
      <svg
        viewBox={`0 0 ${chart.width} ${chart.height}`}
        className="h-80"
        style={{ width: `${chart.width}px`, minWidth: '100%' }}
      >
        {[0, 25, 50, 75, 100].map((level) => {
          const y = 42 + (1 - level / 100) * (260 - 84)
          return (
            <g key={level}>
              <line x1="42" x2={chart.width - 42} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />
              <text x="2" y={y + 4} className="fill-slate-500 text-[11px]">{level}%</text>
            </g>
          )
        })}
        {chart.criticalY != null && (
          <g>
            <line x1="42" x2={chart.width - 42} y1={chart.criticalY} y2={chart.criticalY} stroke="#ef4444" strokeWidth="2" />
            <text x={chart.width - 38} y={chart.criticalY - 6} textAnchor="end" className="fill-red-600 text-[11px] font-bold">
              {projection?.critical_level ?? 80}%
            </text>
          </g>
        )}
        {chart.xTicks.map((tick) => (
          <g key={tick.date.toISOString()}>
            <line x1={tick.x} x2={tick.x} y1="42" y2="218" stroke="#cbd5e1" strokeDasharray="4 4" strokeWidth="1" />
            <text
              x={tick.x}
              y="240"
              textAnchor="middle"
              className="fill-slate-600 text-[11px] font-semibold"
            >
              {formatChartTime(tick.date.toISOString(), locale)}
            </text>
            <text
              x={tick.x}
              y="255"
              textAnchor="middle"
              className="fill-slate-400 text-[10px]"
            >
              {formatChartDate(tick.date.toISOString(), locale)}
            </text>
          </g>
        ))}
        {chart.nowX != null && (
          <g>
            <line x1={chart.nowX} x2={chart.nowX} y1="36" y2="224" stroke="#0f172a" strokeDasharray="3 5" strokeWidth="1.5" />
            <text x={chart.nowX + 6} y="38" className="fill-slate-700 text-[11px] font-bold">{t('site_detail.now')}</text>
          </g>
        )}
        {chart.area && <path d={chart.area} fill="#10b981" opacity="0.12" />}
        {chart.confidenceArea && <path d={chart.confidenceArea} fill="#38bdf8" opacity="0.2" />}
        {chart.line && <path d={chart.line} fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
        {chart.projectionLine && (
          <path d={chart.projectionLine} fill="none" stroke="#0284c7" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="8 6" />
        )}
        {chart.coords.map(({ x, y, point }) => {
          const pointTime = formatDateTime(point.timestamp, locale) || t('site_detail.no_data')
          return (
            <circle key={point.timestamp} cx={x} cy={y} r="3.5" fill="#059669" stroke="white" strokeWidth="2">
              <title>{`${pointTime} - ${t('site_detail.average')}: ${Math.round(point.avg_level)}%`}</title>
            </circle>
          )
        })}
        {chart.projectionCoords.map(({ x, y, point }) => {
          const pointTime = formatDateTime(point.timestamp, locale) || t('site_detail.no_data')
          const boundText = point.lower_bound != null
            ? ` (${t('site_detail.range_label')}: ${Math.round(point.lower_bound)}% - ${Math.round(point.upper_bound!)}%)`
            : ''
          return (
            <circle key={point.timestamp} cx={x} cy={y} r="3.5" fill="#0284c7" stroke="white" strokeWidth="2">
              <title>{`${pointTime} - ${t('site_detail.projection_label')}: ${Math.round(point.predicted_level)}%${boundText}`}</title>
            </circle>
          )
        })}
      </svg>
      </div>
    </div>
  )
}

export default function SiteDetail() {
  const { t, i18n } = useTranslation()
  const locale = i18n.language?.startsWith('en') ? 'en-US' : 'es-AR'
  const thresholds = useLevelThresholds()
  const { siteId } = useParams()
  const navigate = useNavigate()
  const [site, setSite] = useState<BackendSite | null>(null)
  const [history, setHistory] = useState<BackendSiteHistory | null>(null)
  const [projection, setProjection] = useState<BackendSiteProjection | null>(null)
  const [selectedModel, setSelectedModel] = useState<string>('baseline_operational')
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([
    { key: 'baseline_operational', name: 'Baseline Operativo', description: 'Modelo interpretable basado en incrementos históricos.' },
    { key: 'chronos_2_small', name: 'Chronos-2 Small', description: 'Modelo fundacional zero-shot de Amazon con cuantiles probabilísticos.' },
  ])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get<{ default_model_key: string; models: ModelOption[] }>(
      '/map/site-projections/models'
    ).then((res) => {
      if (res?.models && res.models.length > 0) {
        setAvailableModels(res.models)
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    let cancelled = false
    let timeoutId: number
    setHistory(null)
    setProjection(null)

    const fetchSite = async (isBackground = false) => {
      if (!siteId) return
      if (!isBackground) {
        setLoading(true)
        setError(null)
      }
      try {
        const siteData = await api.get<BackendSite>(`/map/sites/${siteId}`)
        if (!cancelled) {
          setSite(siteData)
        }
      } catch (err: unknown) {
        if (!cancelled && !isBackground) {
          const msg = err instanceof Error ? err.message : t('site_detail.error_loading')
          setError(msg)
        }
      } finally {
        if (!cancelled && !isBackground) {
          setLoading(false)
        }
        if (!cancelled) {
          timeoutId = window.setTimeout(() => void fetchSite(true), 5000)
        }
      }
    }

    void fetchSite(false)

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [siteId, t])

  const siteReady = site !== null
  const lastReading = site?.last_reading ?? null

  useEffect(() => {
    setProjection(null)
  }, [selectedModel])

  useEffect(() => {
    if (!siteReady) return
    let cancelled = false
    api.get<BackendSiteHistory>(`/map/sites/${siteId}/history?limit=168`)
      .then((historyData) => {
        if (!cancelled) setHistory(historyData)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [siteId, siteReady, lastReading])

  useEffect(() => {
    if (!siteReady) return
    let cancelled = false
    api.get<BackendSiteProjection>(
      `/map/sites/${siteId}/projection?model_key=${selectedModel}&horizon_hours=24&interval_minutes=60`
    )
      .then((projectionData) => {
        if (!cancelled) setProjection(projectionData)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [siteId, siteReady, selectedModel, lastReading])

  // Agrupar por hora para que quede un único punto con el nivel promedio del sitio por cada hora
  const historyPoints = useMemo(() => {
    const raw = (history?.points ?? []).filter((point) => (
      !projection || new Date(point.timestamp).getTime() <= new Date(projection.generated_at).getTime()
    ))
    if (raw.length === 0) return []

    const hourMap = new Map<string, { sum: number; count: number; max: number; min: number; date: Date }>()
    for (const pt of raw) {
      const d = new Date(pt.timestamp)
      if (Number.isNaN(d.getTime())) continue
      const bucketDate = new Date(Date.UTC(
        d.getUTCFullYear(),
        d.getUTCMonth(),
        d.getUTCDate(),
        d.getUTCHours(),
        0, 0, 0
      ))
      const key = bucketDate.toISOString()
      const weight = Math.max(1, pt.measurement_count || 1)
      const existing = hourMap.get(key)
      if (existing) {
        existing.sum += pt.avg_level * weight
        existing.count += weight
        existing.max = Math.max(existing.max, pt.max_level ?? pt.avg_level)
        existing.min = Math.min(existing.min, pt.min_level ?? pt.avg_level)
      } else {
        hourMap.set(key, {
          sum: pt.avg_level * weight,
          count: weight,
          max: pt.max_level ?? pt.avg_level,
          min: pt.min_level ?? pt.avg_level,
          date: bucketDate,
        })
      }
    }

    return Array.from(hourMap.entries())
      .map(([key, item]) => ({
        timestamp: key,
        avg_level: Math.round((item.sum / item.count) * 100) / 100,
        max_level: item.max,
        min_level: item.min,
        measurement_count: item.count,
      }))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  }, [history, projection])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-6xl text-slate-600">{t('site_detail.loading')}</div>
      </div>
    )
  }

  if (error || !site) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-6xl space-y-4">
          <Button variant="outline" onClick={() => navigate('/map')}>
            <ArrowLeft className="mr-2 size-4" />
            {t('site_detail.back_to_map')}
          </Button>
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error || t('site_detail.not_found')}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Button variant="outline" onClick={() => navigate('/map')} className="mb-4">
              <ArrowLeft className="mr-2 size-4" />
              {t('site_detail.back_to_map')}
            </Button>
            <h1 className="text-3xl font-extrabold text-slate-900">{t('site_detail.site_number', { id: site.id })}</h1>
            <p className="mt-1 flex items-center gap-2 text-slate-600">
              <MapPin className="size-4" />
              {site.address || t('site_detail.no_address')}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{t('site_detail.current_level')}</p>
            <p className="text-4xl font-extrabold text-slate-900">{site.current_level}%</p>
            <div className="mt-2 h-2 w-48 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full ${levelColorClass(site.current_level, thresholds)}`}
                style={{ width: `${Math.min(100, Math.max(0, site.current_level))}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <InfoCard label={t('site_detail.containers')} value={String(site.container_count)} />
          <InfoCard label={t('site_detail.waste_type')} value={site.waste_type_name || t('site_detail.no_waste_type')} />
          <InfoCard label={t('site_detail.load_side')} value={site.load_side_category || t('site_detail.unspecified')} />
          <InfoCard label={t('site_detail.available')} value={site.available ? t('common.yes') : t('common.no')} />
        </div>

        <LevelHistoryChart
          points={historyPoints}
          projection={projection}
          selectedModel={selectedModel}
          availableModels={availableModels}
          onSelectModel={setSelectedModel}
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <section className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-1">
            <h2 className="mb-3 text-lg font-bold text-slate-900">{t('site_detail.site_data')}</h2>
            <DetailRow label={t('site_detail.id')} value={String(site.id)} />
            <DetailRow label={t('site_detail.name')} value={site.name} />
            <DetailRow label={t('site_detail.address')} value={site.address || t('site_detail.no_data')} />
            <DetailRow label={t('site_detail.latitude')} value={String(site.latitude)} />
            <DetailRow label={t('site_detail.longitude')} value={String(site.longitude)} />
            <DetailRow label={t('site_detail.last_reading')} value={formatDateTime(site.last_reading, locale) || t('site_detail.no_data')} />
            <DetailRow label={t('site_detail.last_pickup')} value={formatDateTime(site.last_pickup, locale) || t('site_detail.no_data')} />
            <DetailRow label={t('site_detail.record_updated')} value={formatDateTime(site.updated_at, locale) || t('site_detail.no_data')} />
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">{t('site_detail.associated_containers')}</h2>
              <RefreshCw className="size-4 text-slate-400" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2 pr-3">{t('site_detail.table_id')}</th>
                    <th className="py-2 pr-3">{t('site_detail.table_serie')}</th>
                    <th className="py-2 pr-3">{t('site_detail.table_type')}</th>
                    <th className="py-2 pr-3">{t('site_detail.table_level')}</th>
                    <th className="py-2 pr-3">{t('site_detail.table_last_reading')}</th>
                  </tr>
                </thead>
                <tbody>
                  {site.containers.map((container) => (
                    <tr key={container.id} className="border-b border-slate-100">
                      <td className="py-2 pr-3 font-semibold text-slate-900">{container.id}</td>
                      <td className="py-2 pr-3 text-slate-600">{container.serie_id || '-'}</td>
                      <td className="py-2 pr-3 text-slate-600">{container.container_type || '-'}</td>
                      <td className="py-2 pr-3 font-semibold text-slate-900">{container.current_level}%</td>
                      <td className="py-2 pr-3 text-slate-600">{formatDateTime(container.last_reading, locale) || t('site_detail.no_data')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 truncate text-lg font-bold text-slate-900" title={value}>{value}</p>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-slate-100 py-2 last:border-b-0">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 break-words text-sm text-slate-900">{value}</p>
    </div>
  )
}
