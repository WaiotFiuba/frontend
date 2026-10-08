import { useState, useEffect, useRef } from 'react'
import 'leaflet/dist/leaflet.css'
import { Button } from '@/common/ui/button'
import { useNavigate } from 'react-router-dom'
import InteractiveMap from '@/common/InteractiveMap'
import { generateOptimizationPlan, fetchNetworkKpis, fetchActiveWhatIfPlan } from './services/optimizationApi'
import type { OptimizationConfig, RedistributionPlan, OptimizationMetricsResponse } from './types'
import { NetworkKpiPanel, type UtilizationCategory } from '@/common/KpiPanel'
import RedistributionImpactPanel from './components/RedistributionImpactPanel'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Cpu,
  Download,
  RotateCcw,
  Sliders,
  Sparkles,
  Zap,
} from 'lucide-react'

export default function Optimization() {
  const navigate = useNavigate()

  // Filtro de categoría de utilización
  const [selectedCategory, setSelectedCategory] = useState<UtilizationCategory | 'all'>('all')

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
          fetchNetworkKpis(),
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-900 bg-gradient-to-r from-blue-700 to-indigo-600 bg-clip-text text-transparent">
              Redistribución de Contenedores
            </h1>
            <p className="text-slate-600 mt-1">
              Optimización y balanceo de carga entre sitios según demanda y uso histórico.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/map')}
              className="border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold px-4 py-2 rounded-lg shadow-xs transition-all cursor-pointer"
            >
              Ver Mapa General
            </Button>
          </div>
        </div>

        {/* Parameters Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sliders className="h-5 w-5 text-blue-600" />
            <h2 className="font-bold text-slate-900 text-base">Parámetros de Redistribución</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
            {/* 1. Radio Máximo */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <label htmlFor="max-dist-input" className="font-semibold text-slate-700">
                  Radio Máximo de Traslado
                </label>
                <span className="font-mono font-bold text-blue-700 px-2 py-0.5 rounded bg-blue-100">
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
                className="w-full accent-blue-600 cursor-pointer"
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
                className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
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
                    className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                      config.algorithm === 'greedy'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Zap className="h-3 w-3" />
                    Greedy
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig({ ...config, algorithm: 'lp' })}
                    className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer transition-all ${
                      config.algorithm === 'lp'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Cpu className="h-3 w-3" />
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
                    className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
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
                className="w-full text-xs font-bold gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs cursor-pointer h-9"
              >
                <Sparkles className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
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
                  <span className="font-mono font-bold text-emerald-700 px-2 py-0.5 rounded bg-emerald-100">
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
                  <span className="font-mono font-bold text-blue-700 px-2 py-0.5 rounded bg-blue-100">
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
                  className="w-full accent-blue-600 cursor-pointer"
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
                  <span className="font-mono font-bold text-red-700 px-2 py-0.5 rounded bg-red-100">
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
                  className="w-full accent-red-600 cursor-pointer"
                />
                <span className="text-[11px] text-slate-500 block">
                  Sitios con score mayor a este valor requieren recibir contenedores.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 1. Panel de Métricas Operativas de la Red (Idéntico al del mapa) */}
        <NetworkKpiPanel
          metrics={networkMetrics}
          loading={loadingMetrics}
          selectedCategory={selectedCategory}
          onSelectCategory={setSelectedCategory}
        />

        {/* 2. Panel Complementario de Impacto What-If (Específico de redistribución) */}
        <RedistributionImpactPanel
          plan={plan}
          baselineMetrics={networkMetrics}
          loading={generating}
        />

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
        <div
          ref={mapContainerRef}
          className="bg-white rounded-2xl border border-slate-200 shadow-lg h-[70vh] w-full overflow-hidden flex items-center justify-center relative"
        >
          <InteractiveMap
            refreshTrigger={refreshTrigger}
            redistributionMoves={plan?.moves}
            highlightedMoveId={highlightedMoveId}
            isPlayground
          />
        </div>

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
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
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
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-500 font-semibold block">Contenedores</span>
                <span className="text-xl font-extrabold text-blue-700">
                  {plan.total_containers_moved}
                </span>
                <span className="text-[10px] text-slate-400 block">a reubicar</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-500 font-semibold block">Distancia Promedio</span>
                <span className="text-xl font-extrabold text-indigo-700">
                  {plan.avg_distance_km.toFixed(2)} km
                </span>
                <span className="text-[10px] text-slate-400 block">por traslado</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-500 font-semibold block">Sitios Donantes</span>
                <span className="text-xl font-extrabold text-sky-700">{plan.sites_donating}</span>
                <span className="text-[10px] text-slate-400 block">ceden exceso</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[11px] text-slate-500 font-semibold block">Sitios Receptores</span>
                <span className="text-xl font-extrabold text-rose-700">{plan.sites_receiving}</span>
                <span className="text-[10px] text-slate-400 block">descongestionados</span>
              </div>
            </div>

            {/* Moves List */}
            <div className="overflow-x-auto border border-slate-100 rounded-xl max-h-96 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 sticky top-0 z-10">
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
                          isSelected ? 'bg-blue-50/70 font-semibold' : ''
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
                          <ArrowRight className="h-4 w-4 inline text-indigo-500" />
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
                            className={`text-[11px] font-semibold px-2 py-1 rounded transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-xs'
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
