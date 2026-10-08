import {
  Activity,
  Scale,
  Sparkles,
  TrendingDown,
} from 'lucide-react'
import type { RedistributionPlan } from '../types'
import type { NetworkMetricsData } from '@/common/KpiPanel/types'

interface RedistributionImpactPanelProps {
  plan: RedistributionPlan | null
  baselineMetrics?: NetworkMetricsData | null
  loading?: boolean
  className?: string
}

export function RedistributionImpactPanel({
  plan,
  baselineMetrics,
  loading = false,
  className = '',
}: RedistributionImpactPanelProps) {
  if (loading) {
    return (
      <div
        className={`bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4 animate-pulse ${className}`}
      >
        <div className="h-5 w-60 bg-slate-200 rounded-md" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-32 bg-slate-100 rounded-xl" />
          <div className="h-32 bg-slate-100 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!plan) {
    return (
      <div
        className={`bg-slate-50/70 rounded-2xl border border-dashed border-slate-300 p-6 text-center space-y-2 ${className}`}
      >
        <div className="h-10 w-10 mx-auto rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
          <Sparkles className="h-5 w-5" />
        </div>
        <h3 className="text-sm font-bold text-slate-800">
          Impacto Proyectado de Redistribución (What-If)
        </h3>
        <p className="text-xs text-slate-500 max-w-lg mx-auto">
          Ajustá los parámetros deseados y presioná{' '}
          <strong>&ldquo;Generar Redistribución&rdquo;</strong> para calcular la
          comparativa de homogenización de carga y los traslados óptimos.
        </p>
      </div>
    )
  }

  const origMean =
    plan.original_mean_fill ?? baselineMetrics?.mean_fill_level ?? 0
  const origStd =
    plan.original_std_fill ?? baselineMetrics?.std_fill_level ?? 0
  const optMean = plan.optimized_mean_fill ?? 0
  const optStd = plan.optimized_std_fill ?? 0

  const diff = optStd - origStd
  const reductionPct =
    origStd > 0 ? Math.round((Math.abs(diff) / origStd) * 100) : 0
  const improved = diff < -0.1

  const origMin = Math.max(0, origMean - origStd)
  const origMax = Math.min(100, origMean + origStd)
  const optMin = Math.max(0, optMean - optStd)
  const optMax = Math.min(100, optMean + optStd)

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4 ${className}`}
    >
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Scale className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Comparativa de Balanceo What-If (Demanda Histórica vs Redistribución)
            </h3>
            <p className="text-[11px] text-slate-500">
              Evaluación del impacto del plan sobre la dispersión y capacidad histórica de la red
            </p>
          </div>
        </div>
        <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200">
          Simulación What-If Activa
        </span>
      </div>

      {/* Mean & Std deviation comparison cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 1. Promedio de Llenado Histórico */}
        <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-blue-600" />
              Llenado Promedio Histórico
            </span>
            <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
              Ventana histórica
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-2xs">
              <span className="text-[11px] text-slate-500 font-medium block">
                Histórico Base
              </span>
              <span className="text-xl font-bold font-mono tabular-nums text-slate-800">
                {origMean.toFixed(1)}%
              </span>
            </div>
            <div className="bg-white p-3 rounded-lg border border-blue-200 shadow-2xs">
              <span className="text-[11px] text-blue-600 font-semibold block">
                Proyectado
              </span>
              <span className="text-xl font-bold font-mono tabular-nums text-blue-700">
                {optMean.toFixed(1)}%
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            El volumen total de residuos se conserva, repartiéndose de forma
            equitativa entre sitios.
          </p>
        </div>

        {/* 2. Desvío Estándar Histórico (Balanceo) */}
        <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Scale className="h-4 w-4 text-indigo-600" />
              Dispersión Histórica (σ)
            </span>
            {improved ? (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full ring-1 ring-emerald-600/20 flex items-center gap-1">
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
            <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-2xs">
              <span className="text-[11px] text-slate-500 font-medium block">
                Histórica Base
              </span>
              <span className="text-xl font-bold font-mono tabular-nums text-slate-800">
                &plusmn;{origStd.toFixed(1)}%
              </span>
            </div>
            <div className="bg-white p-3 rounded-lg border border-emerald-200 shadow-2xs">
              <span className="text-[11px] text-emerald-600 font-semibold block">
                Proyectada
              </span>
              <span className="text-xl font-bold font-mono tabular-nums text-emerald-700">
                &plusmn;{optStd.toFixed(1)}%
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            {improved
              ? `La reducción del desvío estándar de ±${origStd.toFixed(1)}% a ±${optStd.toFixed(1)}% homogeniza la demanda histórica de la red, previniendo desbordes en sitios críticos.`
              : 'La dispersión de la red se mantiene estable con los parámetros definidos.'}
          </p>
        </div>
      </div>

      {/* Visual Distribution Range Meter */}
      <div className="bg-gradient-to-r from-slate-50 via-indigo-50/30 to-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
        <div className="flex justify-between items-center text-[11px] text-slate-600 font-semibold">
          <span>
            Rango típico de ocupación (Banda de 1 desvío estándar &mu; &plusmn;
            &sigma;)
          </span>
          <span className="font-mono text-[10px] text-slate-400">
            0% a 100%
          </span>
        </div>

        {/* Original bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>
              Histórico Base: {origMin.toFixed(0)}% a {origMax.toFixed(0)}%
            </span>
            <span>Dispersión amplia</span>
          </div>
          <div className="h-2 w-full bg-slate-200/80 rounded-full relative overflow-hidden">
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
          <div className="flex justify-between text-[10px] text-emerald-700 font-semibold">
            <span>
              Proyectado: {optMin.toFixed(0)}% a {optMax.toFixed(0)}%
            </span>
            <span>Banda concentrada y balanceada</span>
          </div>
          <div className="h-2 w-full bg-slate-200/80 rounded-full relative overflow-hidden">
            <div
              className="absolute h-full bg-emerald-500 rounded-full shadow-2xs transition-all duration-700"
              style={{
                left: `${optMin}%`,
                width: `${Math.max(2, optMax - optMin)}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Plan execution quick metrics (only if moves exist) */}
      {plan.moves.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
            <span className="text-[11px] text-slate-500 font-semibold block">
              Contenedores
            </span>
            <span className="text-xl font-bold font-mono tabular-nums text-blue-700">
              {plan.total_containers_moved}
            </span>
            <span className="text-[10px] text-slate-400 block">a reubicar</span>
          </div>
          <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
            <span className="text-[11px] text-slate-500 font-semibold block">
              Distancia Media
            </span>
            <span className="text-xl font-bold font-mono tabular-nums text-indigo-700">
              {plan.avg_distance_km.toFixed(2)} km
            </span>
            <span className="text-[10px] text-slate-400 block">
              por traslado
            </span>
          </div>
          <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
            <span className="text-[11px] text-slate-500 font-semibold block">
              Sitios Donantes
            </span>
            <span className="text-xl font-bold font-mono tabular-nums text-sky-700">
              {plan.sites_donating}
            </span>
            <span className="text-[10px] text-slate-400 block">
              ceden exceso
            </span>
          </div>
          <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200/80">
            <span className="text-[11px] text-slate-500 font-semibold block">
              Sitios Receptores
            </span>
            <span className="text-xl font-bold font-mono tabular-nums text-rose-700">
              {plan.sites_receiving}
            </span>
            <span className="text-[10px] text-slate-400 block">
              descongestionados
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
export default RedistributionImpactPanel
