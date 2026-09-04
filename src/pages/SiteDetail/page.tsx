import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, MapPin, RefreshCw } from 'lucide-react'
import { Button } from '@/common/ui/button'
import { api } from '@/lib/api'
import type { BackendSite, BackendSiteHistory, BackendSiteHistoryPoint } from '@/common/utils/types'

const formatDateTime = (value?: string | null) => {
  if (!value) return 'Sin datos'
  return new Intl.DateTimeFormat('es-AR', {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

const formatChartTime = (value: string) => (
  new Intl.DateTimeFormat('es-AR', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
)

const formatChartDate = (value: string) => (
  new Intl.DateTimeFormat('es-AR', {
    timeZone: 'UTC',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(value))
)

const levelColorClass = (level: number) => {
  if (level >= 80) return 'bg-red-500'
  if (level >= 50) return 'bg-amber-500'
  return 'bg-emerald-500'
}

function LevelHistoryChart({ points }: { points: BackendSiteHistoryPoint[] }) {
  const chart = useMemo(() => {
    const height = 260
    const padding = 42
    const msPerHour = 60 * 60 * 1000
    const firstTime = new Date(points[0]?.timestamp ?? Date.now()).getTime()
    const lastTime = new Date(points[points.length - 1]?.timestamp ?? Date.now()).getTime()
    const startHour = Math.floor(firstTime / msPerHour) * msPerHour
    const endHour = Math.ceil(lastTime / msPerHour) * msPerHour
    const hourCount = Math.max(1, Math.round((endHour - startHour) / msPerHour))
    const hourWidth = 64
    const width = Math.max(720, padding * 2 + hourCount * hourWidth)
    const innerWidth = width - padding * 2
    const innerHeight = height - padding * 2

    if (points.length === 0) {
      return {
        width,
        height,
        line: '',
        area: '',
        coords: [] as Array<{ x: number; y: number; point: BackendSiteHistoryPoint }>,
        xTicks: [] as Array<{ x: number; date: Date }>,
      }
    }

    const timeRange = Math.max(msPerHour, endHour - startHour)
    const coords = points.map((point) => {
      const pointTime = new Date(point.timestamp).getTime()
      const x = points.length === 1
        ? padding + innerWidth / 2
        : padding + ((pointTime - startHour) / timeRange) * innerWidth
      const y = padding + innerHeight - (Math.max(0, Math.min(100, point.avg_level)) / 100) * innerHeight
      return { x, y, point }
    })

    const line = coords.map((coord, index) => `${index === 0 ? 'M' : 'L'} ${coord.x} ${coord.y}`).join(' ')
    const area = `${line} L ${coords[coords.length - 1].x} ${height - padding} L ${coords[0].x} ${height - padding} Z`

    const xTicks = Array.from({ length: hourCount + 1 }, (_, index) => {
      const tickTime = startHour + index * msPerHour
      return {
        x: padding + ((tickTime - startHour) / timeRange) * innerWidth,
        date: new Date(tickTime),
      }
    })

    return {
      width,
      height,
      line,
      area,
      coords,
      xTicks,
    }
  }, [points])

  if (points.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
        Todavía no hay mediciones históricas para este sitio.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Histórico de nivel</h2>
          <p className="text-sm text-slate-500">Promedio del sitio por tick simulado.</p>
        </div>
        <span className="text-sm font-semibold text-slate-600">{points.length} puntos</span>
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
        {chart.xTicks.map((tick) => (
          <g key={tick.date.toISOString()}>
            <line x1={tick.x} x2={tick.x} y1="42" y2="218" stroke="#cbd5e1" strokeDasharray="4 4" strokeWidth="1" />
            <text
              x={tick.x}
              y="240"
              textAnchor="middle"
              className="fill-slate-600 text-[11px] font-semibold"
            >
              {formatChartTime(tick.date.toISOString())}
            </text>
            <text
              x={tick.x}
              y="255"
              textAnchor="middle"
              className="fill-slate-400 text-[10px]"
            >
              {formatChartDate(tick.date.toISOString())}
            </text>
          </g>
        ))}
        <path d={chart.area} fill="#10b981" opacity="0.12" />
        <path d={chart.line} fill="none" stroke="#059669" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {chart.coords.map(({ x, y, point }) => (
          <circle key={point.timestamp} cx={x} cy={y} r="3.5" fill="#059669" stroke="white" strokeWidth="2">
            <title>{`${formatDateTime(point.timestamp)} - Promedio ${Math.round(point.avg_level)}%`}</title>
          </circle>
        ))}
      </svg>
      </div>
    </div>
  )
}

export default function SiteDetail() {
  const { siteId } = useParams()
  const navigate = useNavigate()
  const [site, setSite] = useState<BackendSite | null>(null)
  const [history, setHistory] = useState<BackendSiteHistory | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const fetchSite = async (isBackground = false) => {
      if (!siteId) return
      if (!isBackground) {
        setLoading(true)
        setError(null)
      }
      try {
        const [siteData, historyData] = await Promise.all([
          api.get<BackendSite>(`/map/sites/${siteId}`),
          api.get<BackendSiteHistory>(`/map/sites/${siteId}/history?limit=168`),
        ])
        if (!cancelled) {
          if (siteData && (String(siteId).includes('332') || siteData.address?.includes('DEGLIOUMINI'))) {
            const frontClock = new Date().toLocaleTimeString()
            console.log(
              `%c[FRONTEND SITE DETAIL - SITIO 332]\n` +
              `  • Nivel promedio: ${siteData.current_level}%\n` +
              `  • Última lectura backend: ${siteData.last_reading ?? 'N/A'}\n` +
              `  • Último vaciado backend: ${siteData.last_pickup ?? 'N/A'}\n` +
              `  • Hora reloj local navegador: ${frontClock}\n` +
              `  • Contenedores:`,
              'color: #0284c7; font-weight: bold;',
              siteData.containers
            )
          }
          setSite(siteData)
          setHistory(historyData)
        }
      } catch (err: unknown) {
        if (!cancelled && !isBackground) {
          const msg = err instanceof Error ? err.message : 'No se pudo cargar el sitio.'
          setError(msg)
        }
      } finally {
        if (!cancelled && !isBackground) {
          setLoading(false)
        }
      }
    }

    void fetchSite(false)
    const intervalId = window.setInterval(() => {
      void fetchSite(true)
    }, 2000)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [siteId])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-6xl text-slate-600">Cargando sitio...</div>
      </div>
    )
  }

  if (error || !site) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-6xl space-y-4">
          <Button variant="outline" onClick={() => navigate('/map')}>
            <ArrowLeft className="mr-2 size-4" />
            Volver al mapa
          </Button>
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error || 'Sitio no encontrado.'}
          </div>
        </div>
      </div>
    )
  }

  const historyPoints = history?.points ?? []

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Button variant="outline" onClick={() => navigate('/map')} className="mb-4">
              <ArrowLeft className="mr-2 size-4" />
              Volver al mapa
            </Button>
            <h1 className="text-3xl font-extrabold text-slate-900">Sitio #{site.id}</h1>
            <p className="mt-1 flex items-center gap-2 text-slate-600">
              <MapPin className="size-4" />
              {site.address || 'Dirección no disponible'}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Nivel actual</p>
            <p className="text-4xl font-extrabold text-slate-900">{site.current_level}%</p>
            <div className="mt-2 h-2 w-48 overflow-hidden rounded-full bg-slate-200">
              <div
                className={`h-full ${levelColorClass(site.current_level)}`}
                style={{ width: `${Math.min(100, Math.max(0, site.current_level))}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <InfoCard label="Contenedores" value={String(site.container_count)} />
          <InfoCard label="Residuo" value={site.waste_type_name || 'Sin tipo'} />
          <InfoCard label="Lado de carga" value={site.load_side_category || 'No especificado'} />
          <InfoCard label="Disponible" value={site.available ? 'Sí' : 'No'} />
        </div>

        <LevelHistoryChart points={historyPoints} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <section className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-1">
            <h2 className="mb-3 text-lg font-bold text-slate-900">Datos del sitio</h2>
            <DetailRow label="ID" value={String(site.id)} />
            <DetailRow label="Nombre" value={site.name} />
            <DetailRow label="Dirección" value={site.address || 'Sin datos'} />
            <DetailRow label="Latitud" value={String(site.latitude)} />
            <DetailRow label="Longitud" value={String(site.longitude)} />
            <DetailRow label="Última actualización" value={formatDateTime(site.last_reading)} />
            <DetailRow label="Última recolección" value={formatDateTime(site.last_pickup)} />
            <DetailRow label="Registro actualizado" value={formatDateTime(site.updated_at)} />
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Contenedores asociados</h2>
              <RefreshCw className="size-4 text-slate-400" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2 pr-3">ID</th>
                    <th className="py-2 pr-3">Serie</th>
                    <th className="py-2 pr-3">Tipo</th>
                    <th className="py-2 pr-3">Nivel</th>
                    <th className="py-2 pr-3">Última lectura</th>
                  </tr>
                </thead>
                <tbody>
                  {site.containers.map((container) => (
                    <tr key={container.id} className="border-b border-slate-100">
                      <td className="py-2 pr-3 font-semibold text-slate-900">{container.id}</td>
                      <td className="py-2 pr-3 text-slate-600">{container.serie_id || '-'}</td>
                      <td className="py-2 pr-3 text-slate-600">{container.container_type || '-'}</td>
                      <td className="py-2 pr-3 font-semibold text-slate-900">{container.current_level}%</td>
                      <td className="py-2 pr-3 text-slate-600">{formatDateTime(container.last_reading)}</td>
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
