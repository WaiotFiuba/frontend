import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import KpiCard from './KpiCard'
import KpiDistributionBar from './KpiDistributionBar'
import { useNetworkKpis } from './useNetworkKpis'
import { useLevelThresholds } from '@/context/CityConfigContext'
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
  baseline = null,
}: NetworkKpiPanelProps) {
  const { t } = useTranslation()
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)
  const { critical } = useLevelThresholds()

  const {
    metrics: fetchedMetrics,
    loading: internalLoading,
    error,
  } = useNetworkKpis({
    externalMetrics,
    refreshTrigger,
    whatif,
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
        <span>{t('kpi.error_loading', { error })}</span>
      </div>
    )
  }

  if (!metrics) return null

  const meanFill = metrics.mean_fill_level ?? 0
  const stdFill = metrics.std_fill_level ?? 0
  const totalContainers = metrics.total_containers ?? metrics.total_sites
  const isWhatIf = Boolean(whatif || metrics.is_whatif)

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/90 shadow-xs p-4 space-y-3.5 transition-all ${className}`}
    >
      {/* Top Header & Collapse Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              {isWhatIf ? t('kpi.title_whatif') : t('kpi.title_real')}
            </h2>
            {isWhatIf && (
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                {t('kpi.badge_whatif')}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            {isWhatIf
              ? t('kpi.desc_whatif')
              : t('kpi.desc_real')}
          </p>
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
                <span>{t('kpi.expand')}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            ) : (
              <>
                <span>{t('kpi.minimize')}</span>
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
              <span className="font-bold font-mono tabular-nums text-slate-900">
                {totalContainers}
              </span>
              <span className="text-slate-500">{t('kpi.containers_label')}</span>
            </div>
            <div className="h-3 w-px bg-slate-300" />
            <div className="flex items-center gap-1.5">
              <span className="font-bold font-mono tabular-nums text-slate-900">
                {meanFill.toFixed(1)}%
              </span>
              <span className="text-slate-500">{t('kpi.mean_fill_label')}</span>
            </div>
            <div className="h-3 w-px bg-slate-300" />
            <div className="flex items-center gap-1.5">
              <span className="font-bold font-mono tabular-nums text-rose-700">
                {metrics.critical_count}
              </span>
              <span className="text-slate-500">{t('kpi.critical_label', { critical })}</span>
            </div>
            <div className="h-3 w-px bg-slate-300" />
            <div className="flex items-center gap-1.5">
              <span className="font-bold font-mono tabular-nums text-slate-900">
                &plusmn;{stdFill.toFixed(1)}%
              </span>
              <span className="text-slate-500">{t('kpi.std_label')}</span>
            </div>
          </div>
          <span className="text-[11px] font-semibold text-blue-600 hover:underline">
            {t('kpi.view_detail')}
          </span>
        </div>
      ) : (
        <>
          {/* 4 Essential KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Contenedores Monitoreados */}
            <KpiCard
              title={t('kpi.monitored_containers')}
              value={totalContainers}
              subvalue={t('kpi.in_sites', { count: metrics.total_sites })}
              badgeText={t('kpi.badge_caba')}
              badgeVariant="info"
              tooltip={t('kpi.monitored_containers_tooltip')}
            />

            {/* 2. Llenado Actual */}
            <KpiCard
              title={t('kpi.current_fill')}
              value={`${meanFill.toFixed(1)}%`}
              subvalue={t('kpi.realtime_telemetry')}
              progressPct={meanFill}
              progressColor="bg-blue-600"
              badgeText={t('kpi.badge_realtime')}
              badgeVariant="info"
              tooltip={t('kpi.current_fill_tooltip')}
            />

            {/* 3. Sitios Críticos (>= umbral crítico) */}
            <KpiCard
              title={t('kpi.critical_sites')}
              value={metrics.critical_count}
              subvalue={t('kpi.saturation_critical', { critical })}
              comparison={
                baseline
                  ? t('kpi.without_plan', { value: baseline.critical_count })
                  : undefined
              }
              badgeText={t('kpi.badge_overflow')}
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
              tooltip={t('kpi.critical_sites_tooltip', { critical })}
            />

            {/* 4. Dispersión Actual */}
            <KpiCard
              title={t('kpi.current_dispersion')}
              value={`±${stdFill.toFixed(1)}%`}
              subvalue={t('kpi.std_dev_subvalue')}
              badgeText={t('kpi.badge_live')}
              badgeVariant="neutral"
              tooltip={t('kpi.current_dispersion_tooltip')}
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
