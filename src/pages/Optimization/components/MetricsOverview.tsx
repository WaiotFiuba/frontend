import React from 'react'
import type { OptimizationMetricsResponse, UtilizationCategory } from '../types'
import { AlertCircle, AlertTriangle, CheckCircle2, TrendingDown, Clock, Layers } from 'lucide-react'

interface MetricsOverviewProps {
  metrics: OptimizationMetricsResponse | null
  loading?: boolean
  selectedCategory?: UtilizationCategory | 'all'
  onSelectCategory?: (category: UtilizationCategory | 'all') => void
}

export const CATEGORY_CONFIG: Record<
  UtilizationCategory,
  { label: string; sub: string; color: string; bg: string; border: string; badge: string; text: string }
> = {
  critical: {
    label: 'Críticos',
    sub: 'Saturación > 85% · Receptores prioritarios',
    color: 'bg-rose-500',
    bg: 'bg-rose-50/80',
    border: 'border-rose-200 hover:border-rose-400',
    badge: 'bg-rose-100 text-rose-700',
    text: 'text-rose-700',
  },
  high: {
    label: 'Alto Uso',
    sub: '65% - 85% · Receptores secundarios',
    color: 'bg-amber-500',
    bg: 'bg-amber-50/80',
    border: 'border-amber-200 hover:border-amber-400',
    badge: 'bg-amber-100 text-amber-700',
    text: 'text-amber-700',
  },
  normal: {
    label: 'Equilibrados',
    sub: '35% - 65% · Operación óptima',
    color: 'bg-emerald-500',
    bg: 'bg-emerald-50/80',
    border: 'border-emerald-200 hover:border-emerald-400',
    badge: 'bg-emerald-100 text-emerald-700',
    text: 'text-emerald-700',
  },
  low: {
    label: 'Bajo Uso',
    sub: '15% - 35% · Donantes secundarios',
    color: 'bg-sky-500',
    bg: 'bg-sky-50/80',
    border: 'border-sky-200 hover:border-sky-400',
    badge: 'bg-sky-100 text-sky-700',
    text: 'text-sky-700',
  },
  idle: {
    label: 'Ociosos',
    sub: '< 15% · Donantes prioritarios / Vaciar',
    color: 'bg-purple-500',
    bg: 'bg-purple-50/80',
    border: 'border-purple-200 hover:border-purple-400',
    badge: 'bg-purple-100 text-purple-700',
    text: 'text-purple-700',
  },
}

export default function MetricsOverview({
  metrics,
  loading = false,
  selectedCategory = 'all',
  onSelectCategory,
}: MetricsOverviewProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 animate-pulse">
        {[...Array(6)].map((_, idx) => (
          <div key={idx} className="h-28 bg-slate-200 rounded-xl" />
        ))}
      </div>
    )
  }

  if (!metrics) return null

  const total = metrics.total_sites || 1
  const categories: Array<{
    id: UtilizationCategory
    count: number
    icon: React.ComponentType<{ className?: string }>
  }> = [
    { id: 'critical', count: metrics.critical_count, icon: AlertCircle },
    { id: 'high', count: metrics.high_count, icon: AlertTriangle },
    { id: 'normal', count: metrics.normal_count, icon: CheckCircle2 },
    { id: 'low', count: metrics.low_count, icon: TrendingDown },
    { id: 'idle', count: metrics.idle_count, icon: Clock },
  ]

  return (
    <div className="space-y-4">
      {/* Category cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total card */}
        <button
          type="button"
          onClick={() => onSelectCategory?.('all')}
          className={`p-3.5 rounded-xl border text-left transition-all backdrop-blur-sm cursor-pointer ${
            selectedCategory === 'all'
              ? 'ring-2 ring-blue-600 border-blue-500 bg-blue-50/90 shadow-sm'
              : 'border-slate-200 bg-white hover:bg-slate-50 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Sitios
            </span>
            <Layers className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{metrics.total_sites}</span>
            <span className="text-xs text-slate-500 font-medium">analizados</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 line-clamp-1">Red completa de CABA</p>
        </button>

        {/* Categories cards */}
        {categories.map(({ id, count, icon: Icon }) => {
          const cfg = CATEGORY_CONFIG[id]
          const pct = ((count / total) * 100).toFixed(1)
          const isSelected = selectedCategory === id

          return (
            <button
              key={id}
              type="button"
              onClick={() => onSelectCategory?.(isSelected ? 'all' : id)}
              className={`p-3.5 rounded-xl border text-left transition-all backdrop-blur-sm cursor-pointer ${
                isSelected
                  ? `ring-2 ring-blue-600 ${cfg.border} ${cfg.bg} shadow-sm`
                  : `border-slate-200 bg-white ${cfg.border} shadow-xs`
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 tracking-wider">
                  {cfg.label}
                </span>
                <Icon className={`h-4 w-4 ${cfg.text}`} />
              </div>
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-slate-900">{count}</span>
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${cfg.badge}`}>
                  {pct}%
                </span>
              </div>
              <p className="mt-1 text-[10px] text-slate-500 line-clamp-1">{cfg.sub}</p>
            </button>
          )
        })}
      </div>

      {/* Distribution visual progress bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
        <div className="flex justify-between items-center text-xs text-slate-600">
          <span className="font-semibold">Distribución de Capacidad de la Red</span>
          <span className="text-slate-400 text-[11px]">
            {metrics.window_start
              ? `Historial desde ${new Date(metrics.window_start).toLocaleDateString()}`
              : 'Historial completo'}
          </span>
        </div>
        <div className="h-3 w-full rounded-full bg-slate-100 flex overflow-hidden">
          {categories.map(({ id, count }) => {
            const cfg = CATEGORY_CONFIG[id]
            const widthPct = (count / total) * 100
            if (widthPct === 0) return null
            return (
              <div
                key={id}
                style={{ width: `${widthPct}%` }}
                className={`${cfg.color} transition-all duration-500 hover:opacity-85`}
                title={`${cfg.label}: ${count} (${widthPct.toFixed(1)}%)`}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}
