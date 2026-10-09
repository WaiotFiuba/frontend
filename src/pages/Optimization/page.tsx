import { useState, useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'
import { Button } from '@/common/ui/button'
import { Card, CardContent } from '@/common/ui/card'
import { useNavigate } from 'react-router-dom'
import InteractiveMap from '@/common/InteractiveMap'
import { generateOptimizationPlan, fetchOptimizationMetrics, fetchActiveWhatIfPlan } from './services/optimizationApi'
import type { OptimizationConfig, RedistributionPlan, OptimizationMetricsResponse } from './types'
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Download,
  MapPin,
  RotateCcw,
  Scale,
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

        {/* Parameters Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sliders className="h-5 w-5 text-sky-600" />
            <h2 className="font-bold text-slate-900 text-base">Parámetros de Redistribución</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
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
                className="w-full accent-sky-600 cursor-pointer"
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

            {/* 3. Algoritmo y Botón de Acción */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">Algoritmo</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, algorithm: 'greedy' })}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                      config.algorithm === 'greedy'
                        ? 'bg-sky-600 text-white shadow-xs font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Greedy
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, algorithm: 'lp' })}
                    className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-all ${
                      config.algorithm === 'lp'
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

              <Button
                onClick={handleGeneratePlan}
                disabled={generating}
                className="w-full text-xs font-bold !bg-sky-600 hover:!bg-sky-700 !text-white shadow-sm cursor-pointer h-9"
              >
                {generating ? 'Calculando Redistribución...' : 'Generar Redistribución'}
              </Button>
            </div>
          </div>

          {/* Segunda fila: Umbrales de Score de Utilización */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-xs font-bold text-slate-700">
                Umbrales de Score de Utilización del Sitio
              </span>
              <span className="text-[11px] text-slate-400">
                Score basado en demanda y saturación histórica del sitio (no es el % de llenado puntual)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* 4. Score Donante (Subutilización) */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label htmlFor="donor-threshold-input" className="font-semibold text-slate-700">
                    Score Donante (Subutilizado)
                  </label>
                  <span className="font-mono font-bold text-emerald-950 px-2.5 py-0.5 rounded-md bg-emerald-200 border border-emerald-300">
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
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <span className="text-[11px] text-slate-500 block">
                  Sitios con score menor a este valor pueden ceder contenedores.
                </span>
              </div>

              {/* 5. Score Objetivo (Ideal) */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label htmlFor="target-utilization-input" className="font-semibold text-slate-700">
                    Score Objetivo (Ideal)
                  </label>
                  <span className="font-mono font-bold text-sky-950 px-2.5 py-0.5 rounded-md bg-sky-100 border border-sky-200">
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
                  className="w-full accent-sky-600 cursor-pointer"
                />
                <span className="text-[11px] text-slate-500 block">
                  Score óptimo hacia el cual se busca balancear la red.
                </span>
              </div>

              {/* 6. Score Receptor (Sobreutilización) */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label htmlFor="receiver-threshold-input" className="font-semibold text-slate-700">
                    Score Receptor (Sobredemandado)
                  </label>
                  <span className="font-mono font-bold text-rose-950 px-2.5 py-0.5 rounded-md bg-rose-100 border border-rose-200">
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
                  className="w-full accent-rose-500 cursor-pointer"
                />
                <span className="text-[11px] text-slate-500 block">
                  Sitios con score mayor a este valor requieren recibir contenedores.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Network Fill & Dispersion Metrics (Current vs Redistribution) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Scale className="h-5 w-5 text-sky-600" />
              <h2 className="font-bold text-slate-900 text-base">
                {plan ? 'Comparativa de Balanceo de Red (Original vs Redistribución)' : 'Diagnóstico de Llenado y Dispersión de la Red'}
              </h2>
            </div>
            {loadingMetrics && (
              <span className="text-xs text-slate-400 animate-pulse font-medium">Actualizando métricas...</span>
            )}
          </div>

          {!plan ? (
            // Estado Actual previo a optimizar
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-sky-50/70 to-slate-50 p-4 rounded-xl border border-sky-100/80 space-y-1">
                <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-sky-600" />
                  Promedio de Llenado Total
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900">
                    {(networkMetrics?.mean_fill_level ?? 0).toFixed(1)}%
                  </span>
                  <span className="text-[11px] text-slate-500">ocupación media</span>
                </div>
                <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
                  <div
                    className="bg-sky-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, networkMetrics?.mean_fill_level ?? 0))}%` }}
                  />
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50/70 to-slate-50 p-4 rounded-xl border border-emerald-100/80 space-y-1">
                <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5 text-emerald-600" />
                  Desvío Estándar (&sigma;)
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-emerald-950">
                    &plusmn;{(networkMetrics?.std_fill_level ?? 0).toFixed(1)}%
                  </span>
                  <span className="text-[11px] text-slate-500">dispersión</span>
                </div>
                <span className="text-[11px] text-slate-500 block">
                  Mide qué tan dispar es el llenado entre contenedores.
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-1 flex flex-col justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-600 block">Contenedores Monitoreados</span>
                  <span className="text-2xl font-black text-slate-800">
                    {networkMetrics?.total_containers ?? 0}
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    distribuidos en {networkMetrics?.total_sites ?? 0} sitios de la ciudad
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">
                  Generá un plan de redistribución para comparar el balanceo proyectado.
                </span>
              </div>
            </div>
          ) : (
            // Comparativa tras generar el plan
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 1. Promedio de Llenado */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <Activity className="h-4 w-4 text-sky-600" />
                      Promedio de Llenado de la Red
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                      Masa conservada
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="bg-white p-3 rounded-lg border border-slate-100">
                      <span className="text-[11px] text-slate-500 font-medium block">Original</span>
                      <span className="text-xl font-black text-slate-800">
                        {(plan.original_mean_fill ?? networkMetrics?.mean_fill_level ?? 0).toFixed(1)}%
                      </span>
                    </div>
                    <div className="bg-white p-3 rounded-lg border border-sky-300 bg-sky-50/40 shadow-2xs">
                      <span className="text-[11px] text-sky-700 font-semibold block">Redistribuido</span>
                      <span className="text-xl font-black text-sky-900">
                        {(plan.optimized_mean_fill ?? 0).toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500">
                    El volumen global de residuos se conserva, repartiéndose de forma equitativa entre sitios.
                  </p>
                </div>

                {/* 2. Desvío Estándar (Balanceo) */}
                {(() => {
                  const origStd = plan.original_std_fill ?? networkMetrics?.std_fill_level ?? 0
                  const optStd = plan.optimized_std_fill ?? 0
                  const diff = optStd - origStd
                  const reductionPct = origStd > 0 ? Math.round((Math.abs(diff) / origStd) * 100) : 0
                  const improved = diff < -0.1

                  return (
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                          <Scale className="h-4 w-4 text-emerald-600" />
                          Desvío Estándar (&sigma;) — Dispersión
                        </span>
                        {improved ? (
                          <span className="text-[11px] font-bold text-emerald-950 bg-emerald-200 border border-emerald-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <TrendingDown className="h-3 w-3" />
                            -{reductionPct}% dispersión
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                            Sin variación
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="bg-white p-3 rounded-lg border border-slate-100">
                          <span className="text-[11px] text-slate-500 font-medium block">Original</span>
                          <span className="text-xl font-black text-slate-800">
                            &plusmn;{origStd.toFixed(1)}%
                          </span>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-emerald-300 bg-emerald-50/40 shadow-2xs">
                          <span className="text-[11px] text-emerald-700 font-semibold block">Redistribuido</span>
                          <span className="text-xl font-black text-emerald-900">
                            &plusmn;{optStd.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500">
                        {improved
                          ? `Al reducir el desvío estándar de ±${origStd.toFixed(1)}% a ±${optStd.toFixed(1)}%, los contenedores se homogenizan, previniendo desbordes en sitios críticos.`
                          : 'La dispersión de la red se mantiene estable con los parámetros definidos.'}
                      </p>
                    </div>
                  )
                })()}
              </div>

              {/* Visual Distribution Range Meter */}
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
                  <div className="bg-gradient-to-r from-slate-50 via-sky-50/40 to-emerald-50/30 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
                    <div className="flex justify-between items-center text-[11px] text-slate-600 font-semibold">
                      <span>Rango típico de ocupación (Banda de 1 desvío &mu; &plusmn; &sigma;)</span>
                      <span className="font-mono text-[10px] text-slate-400">0% a 100%</span>
                    </div>

                    {/* Original bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>Original: {origMin.toFixed(0)}% a {origMax.toFixed(0)}%</span>
                        <span>Dispersión amplia</span>
                      </div>
                      <div className="h-2 w-full bg-slate-200 rounded-full relative overflow-hidden">
                        <div
                          className="absolute h-full bg-slate-400/80 rounded-full"
                          style={{
                            left: `${origMin}%`,
                            width: `${Math.max(2, origMax - origMin)}%`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Optimized bar */}
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[10px] text-emerald-800 font-bold">
                        <span>Redistribuido: {optMin.toFixed(0)}% a {optMax.toFixed(0)}%</span>
                        <span>Banda concentrada y balanceada</span>
                      </div>
                      <div className="h-2 w-full bg-slate-200 rounded-full relative overflow-hidden">
                        <div
                          className="absolute h-full bg-emerald-500 rounded-full shadow-xs transition-all duration-700"
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

        {/* The Map (with smooth focus and transfer vectors) */}
        <Card
          ref={mapContainerRef}
          className="rounded-2xl border-slate-200 shadow-lg h-[75vh] w-full overflow-hidden p-0 relative"
        >
          <CardContent className="h-full w-full p-0 overflow-hidden relative">
            <InteractiveMap
              refreshTrigger={refreshTrigger}
              redistributionMoves={plan?.moves}
              highlightedMoveId={highlightedMoveId}
              isPlayground
            />
          </CardContent>
        </Card>

        {/* Baseline distribution info notice */}
        {plan && plan.moves.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 text-center space-y-1">
            <p className="text-xs font-semibold text-slate-700">
              🌱 Distribución What-If base activa (réplica 1:1 de la red física).
            </p>
            <p className="text-[11px] text-slate-500">
              Ajustá los parámetros deseados arriba y presioná <strong>&ldquo;Generar Redistribución&rdquo;</strong> para reubicar contenedores en el playground.
            </p>
          </div>
        )}

        {/* Results Summary & Moves Table (only shown when plan has moves) */}
        {plan && plan.moves.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-5 space-y-4">
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
                        className={`transition-colors hover:bg-slate-50/80 ${
                          isSelected ? 'bg-sky-50/70 font-semibold' : ''
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
                            className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                              isSelected
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
  )
}
