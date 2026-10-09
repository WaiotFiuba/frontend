import { useState, useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'
import { Button } from '@/common/ui/button'
import { Card, CardContent } from '@/common/ui/card'
import { useNavigate } from 'react-router-dom'
import InteractiveMap from '@/common/InteractiveMap'
import { generateOptimizationPlan, fetchOptimizationMetrics, fetchActiveWhatIfPlan } from './services/optimizationApi'
import type { OptimizationConfig, RedistributionPlan, OptimizationMetricsResponse } from './types'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronUp,
  Download,
  MapPin,
  RotateCcw,
  Sliders,
  TrendingDown,
} from 'lucide-react'

export default function Optimization() {
  const navigate = useNavigate()

  // Configuración de parámetros unificada
  const [config, setConfig] = useState<OptimizationConfig>({
    max_distance_km: 2.0,
    window_days: null,
    algorithm: 'greedy',
    min_utilization_donor: 0.35,
    min_utilization_receiver: 0.65,
    target_utilization: 0.5,
    apply_capacity_constraints: true,
  })

  // Execution states
  const [generating, setGenerating] = useState<boolean>(false)
  const [plan, setPlan] = useState<RedistributionPlan | null>(null)
  const [networkMetrics, setNetworkMetrics] = useState<OptimizationMetricsResponse | null>(null)
  const [loadingMetrics, setLoadingMetrics] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [highlightedMoveId, setHighlightedMoveId] = useState<number | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0)
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(true)
  const mapContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let isMounted = true
    const loadInitialData = async () => {
      setLoadingMetrics(true)
      try {
        const [metricsData, activePlan] = await Promise.allSettled([
          fetchOptimizationMetrics(config.window_days),
          fetchActiveWhatIfPlan(),
        ])
        if (isMounted) {
          if (metricsData.status === 'fulfilled') {
            setNetworkMetrics(metricsData.value)
          }
          if (activePlan.status === 'fulfilled' && activePlan.value) {
            setPlan(activePlan.value)
            if (activePlan.value.config) {
              setConfig((prev) => ({ ...prev, ...activePlan.value.config }))
            }
          }
        }
      } catch (err) {
        console.warn('Error al cargar datos iniciales de optimización:', err)
      } finally {
        if (isMounted) setLoadingMetrics(false)
      }
    }
    loadInitialData()
    return () => {
      isMounted = false
    }
  }, [config.window_days])

  const handleGeneratePlan = async () => {
    setGenerating(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    setHighlightedMoveId(null)

    try {
      const generated = await generateOptimizationPlan(config)
      setPlan(generated)
      setRefreshTrigger((prev) => prev + 1)
      if (generated.total_containers_moved > 0) {
        setSuccessMsg(
          `Redistribución What-If activa: ${generated.total_containers_moved} traslados calculados (distancia prom. ${generated.avg_distance_km.toFixed(2)} km).`
        )
      } else {
        setSuccessMsg('La red se encuentra balanceada con los parámetros seleccionados (0 movimientos necesarios).')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al generar el plan de redistribución'
      setErrorMsg(message)
    } finally {
      setGenerating(false)
    }
  }

  const handleExportCsv = () => {
    if (!plan?.moves.length) return
    const headers = ['Contenedor ID', 'Sitio Origen', 'Sitio Destino', 'Distancia KM']
    const rows = plan.moves.map((m) => [
      m.container_id,
      `"${m.from_site_name.replace(/"/g, '""')}"`,
      `"${m.to_site_name.replace(/"/g, '""')}"`,
      m.distance_km,
    ])
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `plan_redistribucion_${plan.id}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const donorPct = Math.round(config.min_utilization_donor * 100)
  const targetPct = Math.round(config.target_utilization * 100)
  const receiverPct = Math.round(config.min_utilization_receiver * 100)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-sky-50/40 to-emerald-50/30 p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Sliders className="w-8 h-8 text-sky-600 shrink-0" />
              <div>
                <h1 className="text-3xl font-extrabold text-slate-900">
                  Redistribución de Contenedores
                </h1>
                <p className="text-slate-600 text-sm mt-0.5">
                  Optimización y balanceo de carga entre sitios según demanda y uso histórico.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              onClick={() => navigate('/map')}
              className="border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold gap-2 shadow-xs cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-sky-600" />
              Ver Mapa General
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold gap-2 shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al inicio
            </Button>
          </div>
        </div>

        {/* Feedback messages */}
        {successMsg && (
          <div className="bg-emerald-50 border-l-4 border-emerald-500 text-emerald-900 p-3.5 rounded-r-xl shadow-xs text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessMsg(null)}
              className="text-emerald-700 hover:text-emerald-900 font-bold text-sm cursor-pointer"
            >
              &times;
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-900 p-3.5 rounded-r-xl shadow-xs text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMsg(null)}
              className="text-rose-700 hover:text-rose-900 font-bold text-sm cursor-pointer"
            >
              &times;
            </button>
          </div>
        )}

        {/* Diagnóstico de Red / Balanceo de Red (Siempre visible arriba por fuera del Dialog) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-900 text-sm">
                {plan ? 'Balanceo de Red (Comparativa)' : 'Diagnóstico de Red'}
              </h2>
              <span className="text-[11px] text-slate-500">
                {plan ? '• Proyección tras redistribución' : '• Estado actual de llenado y dispersión'}
              </span>
            </div>
            {loadingMetrics && (
              <span className="text-[11px] text-slate-400 animate-pulse font-medium">Actualizando métricas...</span>
            )}
          </div>

          {!plan ? (
            // Estado Actual previo a optimizar
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* Promedio de Llenado */}
              <div className="bg-sky-50/70 p-3 rounded-xl border border-sky-100/80 space-y-1">
                <span className="text-[11px] font-semibold text-slate-600 block">
                  Promedio de Llenado Total
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black text-slate-900">
                    {(networkMetrics?.mean_fill_level ?? 0).toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-slate-500">ocupación media</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-1.5">
                  <div
                    className="bg-sky-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, networkMetrics?.mean_fill_level ?? 0))}%` }}
                  />
                </div>
              </div>

              {/* 2. Desvío Estándar */}
              <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-100/80 space-y-1">
                <span className="text-[11px] font-semibold text-slate-600 block">
                  Desvío Estándar (&sigma;) — Dispersión
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-black text-emerald-950">
                    &plusmn;{(networkMetrics?.std_fill_level ?? 0).toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-slate-500">dispersión</span>
                </div>
                <span className="text-[10px] text-slate-500 block">
                  Mide qué tan dispar es el llenado entre contenedores.
                </span>
              </div>

              {/* 3. Sitios y Contenedores Monitoreados */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2 flex flex-col justify-center">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">Contenedores monitoreados:</span>
                  <span className="font-bold text-slate-900 font-mono">{networkMetrics?.total_containers ?? 0}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-600 font-medium">Sitios activos:</span>
                  <span className="font-bold text-slate-900 font-mono">{networkMetrics?.total_sites ?? 0}</span>
                </div>
              </div>
            </div>
          ) : (
            // Comparativa tras generar el plan
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* 1. Llenado Promedio */}
              <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Llenado Promedio</span>
                  <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                    Masa conservada
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-medium">Original</span>
                    <span className="text-base font-black text-slate-800">
                      {(plan.original_mean_fill ?? networkMetrics?.mean_fill_level ?? 0).toFixed(1)}%
                    </span>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-sky-300 bg-sky-50/40">
                    <span className="text-[10px] text-sky-700 block font-semibold">Redistribuido</span>
                    <span className="text-base font-black text-sky-900">
                      {(plan.optimized_mean_fill ?? 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Desvío Estándar */}
              {(() => {
                const origStd = plan.original_std_fill ?? networkMetrics?.std_fill_level ?? 0
                const optStd = plan.optimized_std_fill ?? 0
                const diff = optStd - origStd
                const reductionPct = origStd > 0 ? Math.round((Math.abs(diff) / origStd) * 100) : 0
                const improved = diff < -0.1

                return (
                  <div className="bg-slate-50/80 p-3 rounded-xl border border-slate-200/80 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Desvío (&sigma;)</span>
                      {improved ? (
                        <span className="text-[10px] font-bold text-emerald-950 bg-emerald-200 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <TrendingDown className="h-2.5 w-2.5" />
                          -{reductionPct}%
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded">
                          Sin variación
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                        <span className="text-[10px] text-slate-400 block font-medium">Original</span>
                        <span className="text-base font-black text-slate-800">
                          &plusmn;{origStd.toFixed(1)}%
                        </span>
                      </div>
                      <div className="bg-white p-2.5 rounded-lg border border-emerald-300 bg-emerald-50/40">
                        <span className="text-[10px] text-emerald-700 block font-semibold">Redistribuido</span>
                        <span className="text-base font-black text-emerald-900">
                          &plusmn;{optStd.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* 3. Visual Range Meter */}
              {(() => {
                const origMean = plan.original_mean_fill ?? networkMetrics?.mean_fill_level ?? 0
                const origStd = plan.original_std_fill ?? networkMetrics?.std_fill_level ?? 0
                const optMean = plan.optimized_mean_fill ?? 0
                const optStd = plan.optimized_std_fill ?? 0

                const origMin = Math.max(0, origMean - origStd)
                const origMax = Math.min(100, origMean + origStd)
                const optMin = Math.max(0, optMean - optStd)
                const optMax = Math.min(100, optMean + optStd)

                return (
                  <div className="bg-gradient-to-r from-slate-50 via-sky-50/40 to-emerald-50/30 p-3 rounded-xl border border-slate-200/80 space-y-2 text-[10px] flex flex-col justify-center">
                    <div className="flex justify-between items-center text-slate-600 font-semibold">
                      <span>Banda de ocupación (&mu; &plusmn; &sigma;)</span>
                      <span className="font-mono text-slate-400">0% a 100%</span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-slate-500">
                        <span>Orig: {origMin.toFixed(0)}% a {origMax.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 rounded-full relative overflow-hidden">
                        <div
                          className="absolute h-full bg-slate-400/80 rounded-full"
                          style={{
                            left: `${origMin}%`,
                            width: `${Math.max(2, origMax - origMin)}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1 pt-0.5">
                      <div className="flex justify-between text-emerald-800 font-bold">
                        <span>Redist: {optMin.toFixed(0)}% a {optMax.toFixed(0)}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-200 rounded-full relative overflow-hidden">
                        <div
                          className="absolute h-full bg-emerald-500 rounded-full shadow-xs"
                          style={{
                            left: `${optMin}%`,
                            width: `${Math.max(2, optMax - optMin)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
        </div>

        {/* Disposición Opción 2: Hero Map Full-Width con Panel de Control Flotante Superpuesto */}
        <div className="space-y-6">
          <Card
            ref={mapContainerRef}
            className="rounded-2xl border-slate-200 shadow-xl h-[78vh] min-h-[600px] w-full overflow-hidden p-0 relative"
          >
            <CardContent className="h-full w-full p-0 overflow-hidden relative">
              <InteractiveMap
                refreshTrigger={refreshTrigger}
                redistributionMoves={plan?.moves}
                highlightedMoveId={highlightedMoveId}
                isPlayground
              />

              {/* Panel Flotante Retráctil (Superpuesto en esquina superior derecha) */}
              {isPanelOpen ? (
                <div
                  onMouseDown={(e) => e.stopPropagation()}
                  onWheel={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => e.stopPropagation()}
                  className="absolute top-3 right-3 z-[1000] w-[390px] max-w-[calc(100vw-2.5rem)] max-h-[calc(100%-1.5rem)] flex flex-col bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 shadow-2xl overflow-hidden transition-all duration-200"
                >
                  {/* Encabezado del Panel Flotante */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/80">
                    <div className="flex items-center gap-2">
                      <Sliders className="h-4 w-4 text-sky-600" />
                      <h2 className="font-bold text-slate-900 text-sm">Parámetros de control</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsPanelOpen(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
                      title="Minimizar panel flotante"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Contenido scrolleable dentro del panel flotante */}
                  <div className="p-4 overflow-y-auto space-y-4 text-xs">
                    {/* 1. Radio Máximo */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <label htmlFor="max-dist-input" className="font-semibold text-slate-700">
                          Radio Máximo de Traslado
                        </label>
                        <span className="font-mono font-bold text-sky-950 px-2.5 py-0.5 rounded-md bg-sky-100 border border-sky-200/80">
                          {config.max_distance_km.toFixed(1)} km
                        </span>
                      </div>
                      <input
                        id="max-dist-input"
                        type="range"
                        min="0.5"
                        max="5.0"
                        step="0.1"
                        value={config.max_distance_km}
                        onChange={(e) => setConfig({ ...config, max_distance_km: parseFloat(e.target.value) })}
                        className="w-full accent-slate-400 cursor-pointer"
                      />
                      <span className="text-[11px] text-slate-500 block">
                        Distancia máxima entre sitios donantes y receptores.
                      </span>
                    </div>

                    {/* 2. Ventana Histórica */}
                    <div className="space-y-1.5">
                      <label htmlFor="window-days-select" className="text-xs font-semibold text-slate-700 block">
                        Ventana de Historial
                      </label>
                      <select
                        id="window-days-select"
                        value={config.window_days ?? 'all'}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            window_days: e.target.value === 'all' ? null : parseInt(e.target.value, 10),
                          })
                        }
                        className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-sky-500 focus:outline-hidden"
                      >
                        <option value="all">Todo el historial disponible</option>
                        <option value="7">Últimos 7 días</option>
                        <option value="15">Últimos 15 días</option>
                        <option value="30">Últimos 30 días</option>
                      </select>
                      <span className="text-[11px] text-slate-500 block">
                        Período para evaluar la saturación de cada sitio.
                      </span>
                    </div>

                    {/* 3. Algoritmo y Capacidad Vial */}
                    <div className="space-y-2 pt-1 border-t border-slate-100">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-700">Algoritmo</span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setConfig({ ...config, algorithm: 'greedy' })}
                            className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all ${config.algorithm === 'greedy'
                                ? 'bg-sky-600 text-white shadow-xs font-bold'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                          >
                            Greedy
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfig({ ...config, algorithm: 'lp' })}
                            className={`px-3 py-1 rounded-md text-xs font-semibold cursor-pointer transition-all ${config.algorithm === 'lp'
                                ? 'bg-emerald-600 text-white shadow-xs font-bold'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                          >
                            Prog. Lineal
                          </button>
                        </div>
                      </div>

                      {/* Control de Capacidad Máxima Vial */}
                      <div className="flex items-center justify-between text-xs pt-1 pb-1">
                        <label
                          htmlFor="capacity-constraints-checkbox"
                          className="font-semibold text-slate-700 flex items-center gap-1.5 cursor-pointer select-none"
                        >
                          <input
                            id="capacity-constraints-checkbox"
                            type="checkbox"
                            checked={config.apply_capacity_constraints ?? true}
                            onChange={(e) =>
                              setConfig({ ...config, apply_capacity_constraints: e.target.checked })
                            }
                            className="h-3.5 w-3.5 rounded border-slate-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
                          />
                          <span>Respetar capacidad máxima</span>
                        </label>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {config.apply_capacity_constraints ?? true ? 'Vial activa' : 'Solo estadística'}
                        </span>
                      </div>
                    </div>

                    {/* Umbrales de Score de Utilización */}
                    <div className="pt-2 border-t border-slate-100 space-y-3">
                      <span className="text-xs font-bold text-slate-700 block">
                        Umbrales de Score de Utilización
                      </span>

                      {/* Score Donante */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <label htmlFor="donor-threshold-input" className="font-semibold text-slate-700 text-[11px]">
                            Donante (Subutilizado)
                          </label>
                          <span className="font-mono font-bold text-emerald-950 px-2 py-0.5 rounded-md bg-emerald-200 border border-emerald-300 text-[11px]">
                            {donorPct}%
                          </span>
                        </div>
                        <input
                          id="donor-threshold-input"
                          type="range"
                          min="10"
                          max={targetPct - 5}
                          step="5"
                          value={donorPct}
                          onChange={(e) =>
                            setConfig({ ...config, min_utilization_donor: Number(e.target.value) / 100 })
                          }
                          className="w-full accent-slate-400 cursor-pointer"
                        />
                      </div>

                      {/* Score Objetivo */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <label htmlFor="target-utilization-input" className="font-semibold text-slate-700 text-[11px]">
                            Objetivo (Ideal)
                          </label>
                          <span className="font-mono font-bold text-sky-950 px-2 py-0.5 rounded-md bg-sky-100 border border-sky-200 text-[11px]">
                            {targetPct}%
                          </span>
                        </div>
                        <input
                          id="target-utilization-input"
                          type="range"
                          min={donorPct + 5}
                          max={receiverPct - 5}
                          step="5"
                          value={targetPct}
                          onChange={(e) =>
                            setConfig({ ...config, target_utilization: Number(e.target.value) / 100 })
                          }
                          className="w-full accent-slate-400 cursor-pointer"
                        />
                      </div>

                      {/* Score Receptor */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <label htmlFor="receiver-threshold-input" className="font-semibold text-slate-700 text-[11px]">
                            Receptor (Sobredemandado)
                          </label>
                          <span className="font-mono font-bold text-rose-950 px-2 py-0.5 rounded-md bg-rose-100 border border-rose-200 text-[11px]">
                            {receiverPct}%
                          </span>
                        </div>
                        <input
                          id="receiver-threshold-input"
                          type="range"
                          min={targetPct + 5}
                          max="90"
                          step="5"
                          value={receiverPct}
                          onChange={(e) =>
                            setConfig({ ...config, min_utilization_receiver: Number(e.target.value) / 100 })
                          }
                          className="w-full accent-slate-400 cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Botón Principal Generar Redistribución */}
                    <div className="pt-2">
                      <Button
                        onClick={handleGeneratePlan}
                        disabled={generating}
                        className="w-full text-xs font-bold !bg-sky-600 hover:!bg-sky-700 !text-white shadow-sm cursor-pointer h-10 rounded-xl"
                      >
                        {generating ? 'Calculando Redistribución...' : 'Generar Redistribución'}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onMouseDown={(e) => e.stopPropagation()}
                  className="absolute top-3 right-3 z-[1000] flex items-center gap-2"
                >
                  <button
                    type="button"
                    onClick={() => setIsPanelOpen(true)}
                    className="bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl hover:shadow-2xl hover:border-sky-300 text-slate-800 px-4 py-2.5 rounded-xl flex items-center gap-2.5 font-bold text-xs transition-all cursor-pointer hover:bg-sky-50/70"
                  >
                    <Sliders className="w-4 h-4 text-sky-600" />
                    <span>Parámetros de control</span>
                    {plan && plan.moves.length > 0 && (
                      <span className="bg-sky-100 text-sky-800 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                        {plan.moves.length} mov.
                      </span>
                    )}
                  </button>
                </div>
              )}

              {/* Píldora inferior informativa si el panel está minimizado y hay plan */}
              {!isPanelOpen && plan && plan.moves.length > 0 && (
                <div
                  onMouseDown={(e) => e.stopPropagation()}
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-xl px-4 py-2 rounded-full flex items-center gap-4 text-xs select-none"
                >
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <span className="text-sky-600 font-extrabold">{plan.total_containers_moved}</span> traslados
                  </div>
                  <span className="text-slate-300">•</span>
                  <div className="text-slate-600">
                    Distancia prom: <span className="font-bold text-slate-800">{plan.avg_distance_km.toFixed(2)} km</span>
                  </div>
                  <span className="text-slate-300">•</span>
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('moves-table-section')
                      el?.scrollIntoView({ behavior: 'smooth' })
                    }}
                    className="font-bold text-sky-600 hover:text-sky-700 cursor-pointer underline underline-offset-2"
                  >
                    Ver tabla
                  </button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Baseline distribution info notice */}
          {plan && plan.moves.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 text-center space-y-1">
              <p className="text-xs font-semibold text-slate-700">
                🌱 Distribución What-If base activa (réplica 1:1 de la red física).
              </p>
              <p className="text-[11px] text-slate-500">
                Ajustá los parámetros en el panel lateral y presioná <strong>&ldquo;Generar Redistribución&rdquo;</strong> para reubicar contenedores en el playground.
              </p>
            </div>
          )}

          {/* Results Summary & Moves Table (visible when plan has moves) */}
          {plan && plan.moves.length > 0 && (
            <div id="moves-table-section" className="bg-white rounded-2xl border border-slate-200 shadow-lg p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Movimientos Recomendados ({plan.moves.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    {plan.sites_donating} sitios donantes ceden contenedores a {plan.sites_receiving} sitios saturados.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportCsv}
                    className="text-xs gap-1.5 border-slate-200 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Exportar CSV
                  </Button>
                  {highlightedMoveId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setHighlightedMoveId(null)}
                      className="text-xs gap-1 text-slate-500 cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Limpiar selección
                    </Button>
                  )}
                </div>
              </div>

              {/* Quick summary badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-sky-50/80 p-3 rounded-xl border border-sky-200/80">
                  <span className="text-[11px] text-sky-700 font-semibold block">Contenedores</span>
                  <span className="text-xl font-extrabold text-sky-950">
                    {plan.total_containers_moved}
                  </span>
                  <span className="text-[10px] text-sky-600 block">a reubicar</span>
                </div>
                <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200/80">
                  <span className="text-[11px] text-emerald-700 font-semibold block">Distancia Promedio</span>
                  <span className="text-xl font-extrabold text-emerald-950">
                    {plan.avg_distance_km.toFixed(2)} km
                  </span>
                  <span className="text-[10px] text-emerald-600 block">por traslado</span>
                </div>
                <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200/80">
                  <span className="text-[11px] text-emerald-700 font-semibold block">Sitios Donantes</span>
                  <span className="text-xl font-extrabold text-emerald-950">{plan.sites_donating}</span>
                  <span className="text-[10px] text-emerald-600 block">ceden exceso</span>
                </div>
                <div className="bg-rose-50/80 p-3 rounded-xl border border-rose-200/80">
                  <span className="text-[11px] text-rose-700 font-semibold block">Sitios Receptores</span>
                  <span className="text-xl font-extrabold text-rose-950">{plan.sites_receiving}</span>
                  <span className="text-[10px] text-rose-600 block">descongestionados</span>
                </div>
              </div>

              {/* Moves List */}
              <div className="overflow-x-auto border border-slate-100 rounded-xl max-h-96 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/90 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">Contenedor</th>
                      <th className="p-3">Sitio Donante (Origen)</th>
                      <th className="p-3 text-center"></th>
                      <th className="p-3">Sitio Receptor (Destino)</th>
                      <th className="p-3 text-right">Distancia</th>
                      <th className="p-3 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {plan.moves.map((m, idx) => {
                      const isSelected = highlightedMoveId === m.container_id
                      return (
                        <tr
                          key={`move-${m.container_id}-${idx}`}
                          className={`transition-colors hover:bg-slate-50/80 ${isSelected ? 'bg-sky-50/70 font-semibold' : ''
                            }`}
                        >
                          <td className="p-3 text-slate-400 font-mono text-[11px]">{idx + 1}</td>
                          <td className="p-3">
                            <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                              #{m.container_id}
                            </span>
                          </td>
                          <td className="p-3 max-w-[260px]">
                            <div className="font-medium text-slate-900 truncate" title={m.from_site_name}>
                              {m.from_site_name}
                            </div>
                            <span className="text-[10px] text-sky-600 font-semibold">
                              ID Sitio {m.from_site_id}
                            </span>
                          </td>
                          <td className="p-3 text-center text-slate-400">
                            <ArrowRight className="h-4 w-4 inline text-sky-600" />
                          </td>
                          <td className="p-3 max-w-[260px]">
                            <div className="font-medium text-slate-900 truncate" title={m.to_site_name}>
                              {m.to_site_name}
                            </div>
                            <span className="text-[10px] text-rose-600 font-semibold">
                              ID Sitio {m.to_site_id}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono">
                            <span className="text-slate-800 font-bold">{m.distance_km.toFixed(2)}</span>
                            <span className="text-slate-400 text-[10px] ml-1">km</span>
                            <div className="text-[10px] text-slate-400">
                              {Math.round(m.distance_km * 1000)} m
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <button
                              type="button"
                              onClick={() => {
                                const nextId = isSelected ? null : m.container_id
                                setHighlightedMoveId(nextId)
                                if (nextId != null) {
                                  mapContainerRef.current?.scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'center',
                                  })
                                }
                              }}
                              className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-all cursor-pointer ${isSelected
                                  ? 'bg-sky-600 text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                            >
                              {isSelected ? 'Seleccionado' : 'Ver en mapa'}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
