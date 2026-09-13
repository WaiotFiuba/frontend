import { useState, useEffect, useCallback, useMemo } from 'react'
import type { RedistributionPlan, WhatIfComparisonResponse } from '../types'
import {
  activateWhatIfPlan,
  deactivateWhatIfPlan,
  fetchWhatIfComparison,
} from '../services/optimizationApi'
import { Button } from '@/common/ui/button'
import {
  Activity,
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  Play,
  RefreshCw,
  Search,
  Square,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'

interface WhatIfComparisonPanelProps {
  plan: RedistributionPlan | null
  onPlanUpdated: (plan: RedistributionPlan) => void
}

export default function WhatIfComparisonPanel({
  plan,
  onPlanUpdated,
}: WhatIfComparisonPanelProps) {
  const [comparison, setComparison] = useState<WhatIfComparisonResponse | null>(null)
  const [loadingComparison, setLoadingComparison] = useState<boolean>(false)
  const [actionLoading, setActionLoading] = useState<boolean>(false)
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const isWhatIfActive = plan?.status === 'active_whatif'

  const loadComparison = useCallback(async () => {
    if (!plan) return
    setLoadingComparison(true)
    setError(null)
    try {
      const data = await fetchWhatIfComparison(plan.id)
      setComparison(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al obtener métricas de What-If'
      setError(message)
    } finally {
      setLoadingComparison(false)
    }
  }, [plan])

  // Initial load
  useEffect(() => {
    if (plan) {
      loadComparison()
    }
  }, [plan, loadComparison])

  // Polling interval when What-If is active and autoRefresh is ON
  useEffect(() => {
    if (!isWhatIfActive || !autoRefresh) return

    const interval = setInterval(() => {
      loadComparison()
    }, 5000)

    return () => clearInterval(interval)
  }, [isWhatIfActive, autoRefresh, loadComparison])

  const handleToggleWhatIf = async () => {
    if (!plan) return
    setActionLoading(true)
    setError(null)
    try {
      let updated: RedistributionPlan
      if (isWhatIfActive) {
        updated = await deactivateWhatIfPlan(plan.id)
      } else {
        updated = await activateWhatIfPlan(plan.id)
      }
      onPlanUpdated(updated)
      await loadComparison()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error al cambiar estado What-If'
      setError(message)
    } finally {
      setActionLoading(false)
    }
  }

  // Filtered sites
  const filteredSites = useMemo(() => {
    if (!comparison?.sites) return []
    if (!searchTerm.trim()) return comparison.sites
    const term = searchTerm.toLowerCase()
    return comparison.sites.filter((s) => s.site_name.toLowerCase().includes(term))
  }, [comparison, searchTerm])

  if (!plan) {
    return (
      <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-3">
        <div className="mx-auto w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
          <Activity className="h-6 w-6" />
        </div>
        <h4 className="font-bold text-slate-800 text-base">Plan no disponible</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Primero debés generar un plan de redistribución en la pestaña de &ldquo;Diagnóstico & Planificación&rdquo;.
        </p>
      </div>
    )
  }

  const globalDelta = comparison
    ? (comparison.optimized_global_avg - comparison.real_global_avg).toFixed(1)
    : '0.0'

  return (
    <div className="space-y-6">
      {/* Active status hero card */}
      <div
        className={`p-6 rounded-2xl border shadow-sm transition-all ${
          isWhatIfActive
            ? 'bg-gradient-to-r from-emerald-900/90 via-slate-900 to-indigo-950 text-white border-emerald-500/40 ring-2 ring-emerald-500/30'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              {isWhatIfActive ? (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                  Modo What-If Activo en Simulación
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  Simulación What-If Inactiva
                </span>
              )}
              <span className="text-xs font-mono opacity-70">Plan #{plan.id}</span>
            </div>

            <h3
              className={`text-xl font-black ${
                isWhatIfActive ? 'text-white' : 'text-slate-900'
              }`}
            >
              Simulación Paralela &ldquo;What-If&rdquo; (Digital Twin)
            </h3>
            <p className={`text-xs max-w-2xl ${isWhatIfActive ? 'text-slate-300' : 'text-slate-500'}`}>
              Al estar activo, el gemelo digital ingesta la telemetría simultáneamente en la
              distribución física actual y en la <strong>distribución virtual optimizada</strong>,
              permitiendo contrastar en tiempo real la evolución de los niveles.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {isWhatIfActive && (
              <label className="flex items-center gap-2 text-xs cursor-pointer text-slate-300 bg-white/10 px-3 py-2 rounded-xl backdrop-blur-xs">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded accent-emerald-500 cursor-pointer"
                />
                Auto-refrescar (5s)
              </label>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={loadComparison}
              disabled={loadingComparison}
              className={`text-xs gap-1.5 cursor-pointer ${
                isWhatIfActive
                  ? 'border-white/20 bg-white/10 text-white hover:bg-white/20'
                  : 'border-slate-200'
              }`}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loadingComparison ? 'animate-spin' : ''}`} />
              Refrescar
            </Button>

            <Button
              onClick={handleToggleWhatIf}
              disabled={actionLoading}
              className={`text-xs font-bold gap-2 cursor-pointer shadow-md ${
                isWhatIfActive
                  ? 'bg-rose-600 hover:bg-rose-700 text-white'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white'
              }`}
            >
              {isWhatIfActive ? (
                <>
                  <Square className="h-3.5 w-3.5" />
                  {actionLoading ? 'Deteniendo...' : 'Desactivar Modo What-If'}
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  {actionLoading ? 'Iniciando...' : 'Activar Simulación What-If'}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3.5 rounded-xl text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Global Comparative KPIs */}
      {comparison && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 block">Llenado Promedio Real</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900">
                {comparison.real_global_avg.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-400">red actual</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 block">
              Llenado Promedio Optimizado
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-indigo-700">
                {comparison.optimized_global_avg.toFixed(1)}%
              </span>
              <span className="text-xs text-indigo-400">virtual</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 block">Delta Global</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span
                className={`text-2xl font-black ${
                  parseFloat(globalDelta) < 0 ? 'text-emerald-600' : 'text-slate-800'
                }`}
              >
                {parseFloat(globalDelta) > 0 ? `+${globalDelta}` : globalDelta}%
              </span>
              <span className="text-xs text-slate-400">
                {parseFloat(globalDelta) < 0 ? 'alivio de red' : 'ajuste'}
              </span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <span className="text-xs font-semibold text-slate-500 block">Balance de Sitios</span>
            <div className="mt-1 flex items-center gap-3">
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                <ArrowDownRight className="h-4 w-4" />
                {comparison.total_sites_improved} mejorados
              </span>
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <ArrowUpRight className="h-4 w-4 text-amber-500" />
                {comparison.total_sites_worsened} adaptados
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Comparative List / Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="font-bold text-slate-900 text-sm">
              Comparativa Sitio por Sitio (Real vs Virtual Optimizado)
            </h4>
            <p className="text-xs text-slate-500">
              Muestra el cambio de nivel de llenado y cantidad de contenedores asignados en cada sitio.
            </p>
          </div>

          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filtrar por sitio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-3">Sitio</th>
                <th className="p-3">Contenedores</th>
                <th className="p-3 w-64">Comparación de Nivel de Llenado</th>
                <th className="p-3 text-right">Real</th>
                <th className="p-3 text-right">Optimizado</th>
                <th className="p-3 text-center">Impacto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSites.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400">
                    {loadingComparison
                      ? 'Cargando datos comparativos...'
                      : 'No hay sitios para mostrar con el filtro actual.'}
                  </td>
                </tr>
              ) : (
                filteredSites.map((s) => {
                  const improved = s.improvement_pct < -1
                  const worsened = s.improvement_pct > 1

                  return (
                    <tr key={`whatif-site-${s.site_id}`} className="hover:bg-slate-50/70">
                      <td className="p-3 max-w-[220px]">
                        <div className="font-semibold text-slate-900 truncate" title={s.site_name}>
                          {s.site_name}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ID: {s.site_id}
                        </span>
                      </td>

                      <td className="p-3 font-mono">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded font-bold text-slate-700">
                            {s.real_container_count}
                          </span>
                          <span className="text-slate-400">&rarr;</span>
                          <span
                            className={`px-1.5 py-0.5 rounded font-bold ${
                              s.optimized_container_count === 0
                                ? 'bg-purple-100 text-purple-700'
                                : s.optimized_container_count > s.real_container_count
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {s.optimized_container_count === 0
                              ? '0 (Vacío)'
                              : `${s.optimized_container_count}`}
                          </span>
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="space-y-1.5">
                          {/* Real bar */}
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400 w-12 font-medium">Real:</span>
                            <div className="h-2 flex-1 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${Math.min(s.real_avg_level, 100)}%` }}
                                className={`h-full rounded-full ${
                                  s.real_avg_level >= 80 ? 'bg-rose-500' : 'bg-slate-400'
                                }`}
                              />
                            </div>
                          </div>

                          {/* Optimized bar */}
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-indigo-500 w-12 font-bold">Optim:</span>
                            <div className="h-2 flex-1 bg-indigo-50 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${Math.min(s.optimized_avg_level, 100)}%` }}
                                className={`h-full rounded-full ${
                                  s.optimized_avg_level >= 80 ? 'bg-rose-500' : 'bg-indigo-600'
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3 text-right font-mono font-semibold text-slate-700">
                        {s.real_avg_level.toFixed(0)}%
                      </td>

                      <td className="p-3 text-right font-mono font-bold text-indigo-700">
                        {s.optimized_avg_level.toFixed(0)}%
                      </td>

                      <td className="p-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            improved
                              ? 'bg-emerald-100 text-emerald-700'
                              : worsened
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {improved ? (
                            <TrendingDown className="h-3 w-3" />
                          ) : worsened ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : null}
                          {s.improvement_pct > 0 ? `+${s.improvement_pct}%` : `${s.improvement_pct}%`}
                        </span>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
