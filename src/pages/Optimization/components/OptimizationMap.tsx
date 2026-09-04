import { useMemo, useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { RedistributionPlan, SiteUtilizationMetric, UtilizationCategory } from '../types'
import { ArrowRight, Box, Compass, Eye } from 'lucide-react'

interface OptimizationMapProps {
  sites: SiteUtilizationMetric[]
  plan: RedistributionPlan | null
  selectedCategory?: UtilizationCategory | 'all'
  highlightedMoveId?: number | null
}

const CATEGORY_COLORS: Record<UtilizationCategory, { fill: string; stroke: string }> = {
  critical: { fill: '#f43f5e', stroke: '#be123c' },
  high: { fill: '#f59e0b', stroke: '#b45309' },
  normal: { fill: '#10b981', stroke: '#047857' },
  low: { fill: '#0ea5e9', stroke: '#0369a1' },
  idle: { fill: '#a855f7', stroke: '#7e22ce' },
}

function MapCenterController({ center }: { center: [number, number] }) {
  const map = useMap()
  return (
    <button
      type="button"
      onClick={() => map.setView(center, 12, { animate: true })}
      className="absolute bottom-4 right-4 z-[1000] bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-md p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
      title="Centrar mapa en CABA"
    >
      <Compass className="h-4 w-4 text-blue-600" />
      Centrar CABA
    </button>
  )
}

export default function OptimizationMap({
  sites,
  plan,
  selectedCategory = 'all',
  highlightedMoveId,
}: OptimizationMapProps) {
  const [showOnlyPlanMoves, setShowOnlyPlanMoves] = useState<boolean>(false)

  // Map site_id to coordinate
  const siteCoordinates = useMemo(() => {
    const map = new Map<number, { lat: number; lng: number; name: string }>()
    sites.forEach((s) => {
      map.set(s.site_id, { lat: s.latitude, lng: s.longitude, name: s.site_name })
    })
    return map
  }, [sites])

  // Donating and Receiving site IDs in the active plan
  const planDonorSiteIds = useMemo(() => {
    return new Set(plan?.moves.map((m) => m.from_site_id) ?? [])
  }, [plan])

  const planReceiverSiteIds = useMemo(() => {
    return new Set(plan?.moves.map((m) => m.to_site_id) ?? [])
  }, [plan])

  // Filter sites according to category & plan toggle
  const visibleSites = useMemo(() => {
    return sites.filter((s) => {
      if (showOnlyPlanMoves && plan) {
        if (!planDonorSiteIds.has(s.site_id) && !planReceiverSiteIds.has(s.site_id)) {
          return false
        }
      }
      if (selectedCategory !== 'all' && s.category !== selectedCategory) {
        return false
      }
      return true
    })
  }, [sites, showOnlyPlanMoves, plan, planDonorSiteIds, planReceiverSiteIds, selectedCategory])

  // Move lines
  const moveLines = useMemo(() => {
    if (!plan?.moves) return []
    return plan.moves
      .map((m) => {
        const from = siteCoordinates.get(m.from_site_id)
        const to = siteCoordinates.get(m.to_site_id)
        if (!from || !to) return null
        return {
          move: m,
          from: [from.lat, from.lng] as [number, number],
          to: [to.lat, to.lng] as [number, number],
        }
      })
      .filter(Boolean) as Array<{
      move: RedistributionPlan['moves'][0]
      from: [number, number]
      to: [number, number]
    }>
  }, [plan, siteCoordinates])

  const cabaCenter: [number, number] = [-34.6037, -58.42]

  return (
    <div className="relative bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-[620px] w-full flex flex-col">
      {/* Top Map Bar */}
      <div className="bg-white/90 backdrop-blur-md px-4 py-2.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 z-10 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800">Visualización Espacial</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-500">
            {visibleSites.length} sitios visibles
            {plan?.moves.length ? ` · ${plan.moves.length} traslados calculados` : ''}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {plan && plan.moves.length > 0 && (
            <button
              type="button"
              onClick={() => setShowOnlyPlanMoves(!showOnlyPlanMoves)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                showOnlyPlanMoves
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              {showOnlyPlanMoves ? 'Ver todos los sitios' : 'Aislar solo movimientos'}
            </button>
          )}

          {/* Legend */}
          <div className="hidden lg:flex items-center gap-3 bg-slate-50 px-3 py-1 rounded-lg border border-slate-200 text-[11px]">
            <div className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 inline-block" />
              <span>Crítico</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 inline-block" />
              <span>Alto</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>Normal</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-500 inline-block" />
              <span>Bajo</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full bg-purple-500 inline-block" />
              <span>Ocioso</span>
            </div>
            {plan && plan.moves.length > 0 && (
              <div className="flex items-center gap-1 font-semibold text-indigo-600 border-l border-slate-200 pl-2">
                <span className="w-4 h-0.5 border-t-2 border-dashed border-indigo-600 inline-block" />
                <span>Traslado</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Leaflet Map */}
      <div className="flex-1 relative w-full h-full">
        <MapContainer
          center={cabaCenter}
          zoom={12}
          scrollWheelZoom={true}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MapCenterController center={cabaCenter} />

          {/* Transfer vectors (Polylines) */}
          {moveLines.map(({ move, from, to }) => {
            const isHighlighted = highlightedMoveId === move.container_id
            return (
              <Polyline
                key={`line-${move.container_id}`}
                positions={[from, to]}
                pathOptions={{
                  color: isHighlighted ? '#3b82f6' : '#6366f1',
                  weight: isHighlighted ? 5 : 3,
                  dashArray: '6, 8',
                  opacity: isHighlighted ? 1 : 0.85,
                }}
              >
                <Popup>
                  <div className="text-xs p-1 space-y-1.5 min-w-[200px]">
                    <div className="font-bold text-indigo-700 flex items-center gap-1.5 border-b pb-1">
                      <Box className="h-4 w-4" />
                      Traslado Contenedor #{move.container_id}
                    </div>
                    <div className="space-y-1 text-slate-700">
                      <div>
                        <strong className="text-blue-700">Origen (Donante):</strong>
                        <p className="text-[11px] text-slate-600">{move.from_site_name}</p>
                      </div>
                      <div className="flex items-center justify-center py-0.5">
                        <ArrowRight className="h-3.5 w-3.5 text-indigo-500" />
                      </div>
                      <div>
                        <strong className="text-rose-700">Destino (Receptor):</strong>
                        <p className="text-[11px] text-slate-600">{move.to_site_name}</p>
                      </div>
                      <div className="pt-1 border-t text-[11px] font-mono text-slate-500">
                        Distancia: <strong>{move.distance_km.toFixed(2)} km</strong> (
                        {Math.round(move.distance_km * 1000)} m)
                      </div>
                    </div>
                  </div>
                </Popup>
              </Polyline>
            )
          })}

          {/* Site Circles */}
          {visibleSites.map((s) => {
            const col = CATEGORY_COLORS[s.category] || CATEGORY_COLORS.normal
            const isDonor = planDonorSiteIds.has(s.site_id)
            const isReceiver = planReceiverSiteIds.has(s.site_id)
            const radius = Math.min(Math.max(5 + s.container_count * 1.5, 6), 14)

            return (
              <CircleMarker
                key={`site-${s.site_id}`}
                center={[s.latitude, s.longitude]}
                radius={radius}
                pathOptions={{
                  fillColor: col.fill,
                  fillOpacity: 0.85,
                  color: isDonor ? '#1d4ed8' : isReceiver ? '#b91c1c' : col.stroke,
                  weight: isDonor || isReceiver ? 3 : 1.5,
                }}
              >
                <Popup>
                  <div className="text-xs p-1 space-y-1.5 min-w-[220px]">
                    <div className="font-bold text-slate-900 border-b border-slate-100 pb-1">
                      {s.site_name}
                    </div>

                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px] text-slate-600">
                      <div>
                        Score Uso: <strong>{(s.utilization_score * 100).toFixed(0)}%</strong>
                      </div>
                      <div>
                        Llenado Prom: <strong>{s.avg_fill_level.toFixed(0)}%</strong>
                      </div>
                      <div>
                        Contenedores: <strong>{s.container_count}</strong>
                      </div>
                      <div>
                        Pico &gt;80%: <strong>{(s.peak_fill_rate * 100).toFixed(0)}%</strong>
                      </div>
                    </div>

                    {s.waste_type_name && (
                      <div className="text-[11px] text-slate-500">
                        Residuo: <strong>{s.waste_type_name}</strong>
                      </div>
                    )}

                    {/* Plan participation badge */}
                    {isDonor && (
                      <div className="mt-1 bg-sky-50 text-sky-800 p-1.5 rounded text-[11px] font-semibold border border-sky-200">
                        Donante en el plan de optimización
                      </div>
                    )}
                    {isReceiver && (
                      <div className="mt-1 bg-rose-50 text-rose-800 p-1.5 rounded text-[11px] font-semibold border border-rose-200">
                        Receptor prioritario de contenedores
                      </div>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}
        </MapContainer>
      </div>
    </div>
  )
}
