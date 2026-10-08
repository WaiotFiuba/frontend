import { useState } from 'react'
import {
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Layers,
  Scale,
} from 'lucide-react'
import KpiCard from './KpiCard'
import KpiDistributionBar from './KpiDistributionBar'
import { useNetworkKpis } from './useNetworkKpis'
import type { NetworkKpiPanelProps } from './types'

export function NetworkKpiPanel({
  metrics: externalMetrics,
  loading: externalLoading,
  refreshTrigger = 0,
  selectedCategory = 'all',
  onSelectCategory,
  className = '',
  collapsible = true,
  defaultCollapsed = false,
  whatif = false,
  planId,
}: NetworkKpiPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

  const {
    metrics: fetchedMetrics,
    loading: internalLoading,
    error,
  } = useNetworkKpis({
    externalMetrics,
    refreshTrigger,
    whatif,
    planId,
  })

  const isLoading = externalLoading ?? internalLoading
  const metrics = externalMetrics ?? fetchedMetrics

  // Skeleton loading state
  if (isLoading && !metrics) {
    return (
      <div
        className={`bg-white rounded-2xl border border-slate-200 shadow-xs p-4 space-y-3 animate-pulse ${className}`}
      >
        <div className="flex justify-between items-center">
          <div className="h-4 w-44 bg-slate-200 rounded-md" />
          <div className="h-4 w-20 bg-slate-200 rounded-md" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 bg-slate-100 rounded-xl" />
          ))}
        </div>
        <div className="h-16 bg-slate-100 rounded-xl" />
      </div>
    )
  }

  if (error && !metrics) {
    return (
      <div
        className={`bg-rose-50/70 border border-rose-200 text-rose-800 rounded-xl p-3 text-xs flex items-center justify-between ${className}`}
      >
        <span>No se pudieron cargar las métricas de red: {error}</span>
      </div>
    )
  }

  if (!metrics) return null

  const meanFill = metrics.mean_fill_level ?? 0
  const stdFill = metrics.std_fill_level ?? 0
  const totalContainers = metrics.total_containers ?? metrics.total_sites

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 space-y-3.5 transition-all ${className}`}
    >
      {/* Top Header & Collapse Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Activity className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Métricas Operativas de la Red
            </h2>
            <p className="text-[11px] text-slate-500">
              Diagnóstico de capacidad y balance de contenedores en tiempo real
            </p>
          </div>
        </div>

        {collapsible && (
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer select-none"
            aria-expanded={!isCollapsed}
          >
            {isCollapsed ? (
              <>
                <span>Expandir</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                <span>Minimizar</span>
                <ChevronUp className="h-3.5 w-3.5" />
              </>
            )}
          </button>
        )}
      </div>

      {/* Collapsed Summary Pill Ribbon */}
      {isCollapsed ? (
        <div
          onClick={() => setIsCollapsed(false)}
          className="flex flex-wrap items-center justify-between gap-3 p-2.5 bg-slate-50/80 border border-slate-200/80 rounded-xl cursor-pointer hover:bg-slate-100/70 transition-all text-xs"
        >
          <div className="flex flex-wrap items-center gap-4 text-slate-700">
            <div className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5 text-blue-600" />
              <span className="font-bold font-mono tabular-nums text-slate-900">
                {totalContainers}
              </span>
              <span className="text-slate-500">contenedores</span>
            </div>
            <div className="h-3 w-px bg-slate-300" />
            <div className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-emerald-600" />
              <span className="font-bold font-mono tabular-nums text-slate-900">
                {meanFill.toFixed(1)}%
              </span>
              <span className="text-slate-500">llenado medio</span>
            </div>
            <div className="h-3 w-px bg-slate-300" />
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
              <span className="font-bold font-mono tabular-nums text-rose-700">
                {metrics.critical_count}
              </span>
              <span className="text-slate-500">críticos (&gt;85%)</span>
            </div>
            <div className="h-3 w-px bg-slate-300" />
            <div className="flex items-center gap-1.5">
              <Scale className="h-3.5 w-3.5 text-indigo-600" />
              <span className="font-bold font-mono tabular-nums text-slate-900">
                &plusmn;{stdFill.toFixed(1)}%
              </span>
              <span className="text-slate-500">dispersión</span>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-blue-600 hover:underline">
            Ver detalle
          </span>
        </div>
      ) : (
        <>
          {/* 4 Essential KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Contenedores Monitoreados */}
            <KpiCard
              title="Contenedores Monitoreados"
              value={totalContainers}
              subvalue={`en ${metrics.total_sites} sitios`}
              icon={Layers}
              iconColor="text-blue-600"
              badgeText="Red CABA"
              badgeVariant="info"
              tooltip="Total de contenedores físicos y sitios georreferenciados bajo monitoreo activo en la ciudad."
            />

            {/* 2. Llenado Promedio */}
            <KpiCard
              title="Llenado Promedio"
              value={`${meanFill.toFixed(1)}%`}
              subvalue="ocupación media"
              icon={Activity}
              iconColor="text-blue-600"
              progressPct={meanFill}
              progressColor="bg-blue-600"
              tooltip="Promedio ponderado del nivel de llenado de todos los contenedores de la red."
            />

            {/* 3. Sitios Críticos (>85%) */}
            <KpiCard
              title="Sitios Críticos"
              value={metrics.critical_count}
              subvalue="saturación > 85%"
              icon={AlertTriangle}
              iconColor="text-rose-600"
              badgeText="Desborde"
              badgeVariant="danger"
              onClick={
                onSelectCategory
                  ? () =>
                      onSelectCategory(
                        selectedCategory === 'critical' ? 'all' : 'critical'
                      )
                  : undefined
              }
              isSelected={selectedCategory === 'critical'}
              tooltip="Sitios con saturación superior al 85%, receptores prioritarios en redistribución o requiriendo recolección urgente."
            />

            {/* 4. Dispersión de Red */}
            <KpiCard
              title="Dispersión de Red (σ)"
              value={`±${stdFill.toFixed(1)}%`}
              subvalue="desvío estándar"
              icon={Scale}
              iconColor="text-indigo-600"
              badgeText="Heterogeneidad"
              badgeVariant="neutral"
              tooltip="Desvío estándar del llenado entre contenedores. Una cifra elevada refleja desbalance operativo entre zonas colapsadas y ociosas."
            />
          </div>

          {/* Segmented Capacity Distribution Bar */}
          <KpiDistributionBar
            metrics={metrics}
            selectedCategory={selectedCategory}
            onSelectCategory={onSelectCategory}
          />
        </>
      )}
    </div>
  )
}
export default NetworkKpiPanel
