import { useTranslation } from 'react-i18next'
import { useLevelThresholds, type LevelThresholds } from '@/context/CityConfigContext'
import type { NetworkMetricsData, UtilizationCategory } from './types'

interface KpiDistributionBarProps {
  metrics: NetworkMetricsData
  selectedCategory?: UtilizationCategory | 'all'
  onSelectCategory?: (category: UtilizationCategory | 'all') => void
  className?: string
}

export const CATEGORY_DEFINITIONS: Record<
  UtilizationCategory,
  {
    label: string
    barColor: string
    badgeBg: string
    badgeText: string
    badgeBorder: string
  }
> = {
  critical: {
    label: 'Críticos',
    barColor: 'bg-rose-500',
    badgeBg: 'bg-rose-50 hover:bg-rose-100/70',
    badgeText: 'text-rose-700',
    badgeBorder: 'border-rose-200',
  },
  high: {
    label: 'Alto Uso',
    barColor: 'bg-amber-500',
    badgeBg: 'bg-amber-50 hover:bg-amber-100/70',
    badgeText: 'text-amber-700',
    badgeBorder: 'border-amber-200',
  },
  normal: {
    label: 'Equilibrados',
    barColor: 'bg-emerald-500',
    badgeBg: 'bg-emerald-50 hover:bg-emerald-100/70',
    badgeText: 'text-emerald-700',
    badgeBorder: 'border-emerald-200',
  },
  low: {
    label: 'Bajo Uso',
    barColor: 'bg-sky-500',
    badgeBg: 'bg-sky-50 hover:bg-sky-100/70',
    badgeText: 'text-sky-700',
    badgeBorder: 'border-sky-200',
  },
  idle: {
    label: 'Ociosos',
    barColor: 'bg-purple-500',
    badgeBg: 'bg-purple-50 hover:bg-purple-100/70',
    badgeText: 'text-purple-700',
    badgeBorder: 'border-purple-200',
  },
}

/** Rango de nivel (%) de cada categoría según los umbrales del backend. */
export function categoryRangeLabel(
  category: UtilizationCategory,
  { normal, high, critical }: LevelThresholds
): string {
  switch (category) {
    case 'critical':
      return `≥ ${critical}%`
    case 'high':
      return `${high}% - ${critical - 1}%`
    case 'normal':
      return `${normal}% - ${high - 1}%`
    case 'low':
      return `1% - ${normal - 1}%`
    case 'idle':
      return '0%'
  }
}

export function KpiDistributionBar({
  metrics,
  selectedCategory = 'all',
  onSelectCategory,
  className = '',
}: KpiDistributionBarProps) {
  const { t } = useTranslation()
  const total = metrics.total_sites || 1
  const thresholds = useLevelThresholds()

  const items: Array<{ id: UtilizationCategory; count: number }> = [
    { id: 'critical', count: metrics.critical_count },
    { id: 'high', count: metrics.high_count },
    { id: 'normal', count: metrics.normal_count },
    { id: 'low', count: metrics.low_count },
    { id: 'idle', count: metrics.idle_count },
  ]

  const isInteractive = Boolean(onSelectCategory)

  return (
    <div
      className={`bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-2xs space-y-2.5 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">
            {t('kpi.distribution_title')}
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            {t('kpi.sites_analyzed', { count: metrics.total_sites })}
          </span>
        </div>
        {metrics.window_start && (
          <span className="text-slate-400 text-[11px]">
            {t('kpi.window_from', { date: new Date(metrics.window_start).toLocaleDateString() })}
          </span>
        )}
      </div>

      {/* Segmented Progress Bar */}
      <div className="h-2.5 w-full rounded-full bg-slate-100 flex overflow-hidden">
        {items.map(({ id, count }) => {
          const cfg = CATEGORY_DEFINITIONS[id]
          const label = t(`kpi.category_${id}`, { defaultValue: cfg.label })
          const pct = (count / total) * 100
          if (pct === 0) return null

          const isDimmed =
            selectedCategory !== 'all' && selectedCategory !== id

          return (
            <div
              key={id}
              style={{ width: `${pct}%` }}
              className={`${cfg.barColor} transition-all duration-300 ${
                isDimmed ? 'opacity-30' : 'opacity-100'
              }`}
              title={`${label}: ${count} (${pct.toFixed(1)}%)`}
            />
          )
        })}
      </div>

      {/* Interactive Legend Pills */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        {isInteractive && (
          <button
            type="button"
            onClick={() => onSelectCategory?.('all')}
            className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-all cursor-pointer border ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white border-blue-600 shadow-2xs font-semibold'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {t('kpi.all_sites_count', { count: metrics.total_sites, defaultValue: `Todos (${metrics.total_sites})` })}
          </button>
        )}

        {items.map(({ id, count }) => {
          const cfg = CATEGORY_DEFINITIONS[id]
          const label = t(`kpi.category_${id}`, { defaultValue: cfg.label })
          const pct = ((count / total) * 100).toFixed(0)
          const isSelected = selectedCategory === id

          return (
            <button
              key={id}
              type="button"
              disabled={!isInteractive}
              onClick={() => onSelectCategory?.(isSelected ? 'all' : id)}
              title={`${label}: ${categoryRangeLabel(id, thresholds)}`}
              className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] border transition-all ${
                isInteractive ? 'cursor-pointer' : 'cursor-default'
              } ${
                isSelected
                  ? `ring-2 ring-blue-500 font-bold ${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder}`
                  : `bg-slate-50/70 border-slate-200/80 text-slate-600 hover:bg-slate-100/80`
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${cfg.barColor} shrink-0`}
              />
              <span>{label}</span>
              <span className="font-mono font-semibold tabular-nums text-slate-800">
                {count}
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                ({pct}%)
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
export default KpiDistributionBar
