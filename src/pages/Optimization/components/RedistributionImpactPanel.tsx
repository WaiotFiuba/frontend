import { useTranslation } from 'react-i18next'
import { Sparkles } from 'lucide-react'
import type { RedistributionPlan, WhatIfComparisonResponse, WhatIfMeasure } from '../types'

interface RedistributionImpactPanelProps {
  plan: RedistributionPlan | null
  // Comparación medida desde la activación del plan (null mientras no llega).
  comparison?: WhatIfComparisonResponse | null
  // Error al cargar la comparación, y cómo volver a pedirla.
  comparisonError?: string | null
  onRetryComparison?: () => void
  loading?: boolean
  className?: string
}

interface ImpactCardProps {
  title: string
  tag: string
  // Estimado al generar (gris) o medido desde la activación (azul).
  measured: boolean
  measure: WhatIfMeasure | null
  format: (value: number) => string
  caption: string
}

const percentChange = ({ real, with_plan }: WhatIfMeasure): number =>
  real > 0 ? Math.round(((with_plan - real) / real) * 100) : 0

function ImpactCard({ title, tag, measured, measure, format, caption }: ImpactCardProps) {
  const { t } = useTranslation()
  const change = measure ? percentChange(measure) : 0
  return (
    <article className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 flex flex-col gap-2">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-xs font-bold text-slate-700">{title}</h4>
        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
            measured
              ? 'text-blue-900 bg-blue-50 border-blue-200'
              : 'text-slate-700 bg-slate-100 border-slate-200'
          }`}
        >
          {tag}
        </span>
      </div>
      {measure ? (
        <>
          <span className="text-xl font-bold font-mono tabular-nums text-slate-900">
            <span className="text-slate-600">{format(measure.real)}</span>
            <span className="text-base text-slate-500"> → </span>
            {format(measure.with_plan)}
          </span>
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-500">{caption}</span>
            {change !== 0 && (
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                  change < 0
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : 'text-rose-700 bg-rose-50 border-rose-200'
                }`}
              >
                {change > 0 ? `+${change}` : change} %
              </span>
            )}
          </div>
        </>
      ) : (
        <>
          <span className="text-xl font-bold text-slate-500">{t('optimization.impact_no_data')}</span>
          <span className="text-[11px] text-slate-500">{t('optimization.impact_no_data_caption')}</span>
        </>
      )}
    </article>
  )
}

export function RedistributionImpactPanel({
  plan,
  comparison = null,
  comparisonError = null,
  onRetryComparison,
  loading = false,
  className = '',
}: RedistributionImpactPanelProps) {
  const { t, i18n } = useTranslation()
  if (loading) {
    return (
      <div
        className={`bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4 animate-pulse ${className}`}
      >
        <div className="h-5 w-60 bg-slate-200 rounded-md" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-28 bg-slate-100 rounded-xl" />
          <div className="h-28 bg-slate-100 rounded-xl" />
          <div className="h-28 bg-slate-100 rounded-xl" />
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
        <h3 className="text-sm font-bold text-slate-800">{t('optimization.impact_empty_title')}</h3>
        <p className="text-xs text-slate-500 max-w-lg mx-auto">{t('optimization.impact_empty_desc')}</p>
      </div>
    )
  }

  // La dispersión viene en el plan: se ve apenas se genera.
  const dispersion: WhatIfMeasure | null =
    plan.original_std_fill != null
      ? { real: plan.original_std_fill, with_plan: plan.optimized_std_fill ?? plan.original_std_fill }
      : null
  const observedHours = comparison?.observed_hours ?? 0
  // Menos de una hora medida: la etiqueta no muestra el período ("0 horas").
  const sinceActivation =
    observedHours >= 1
      ? t('optimization.impact_since_activation_period', {
          period:
            observedHours >= 24
              ? t('optimization.period_days', { count: Math.floor(observedHours / 24) })
              : t('optimization.period_hours', { count: Math.floor(observedHours) }),
        })
      : t('optimization.impact_since_activation')
  const count = (value: number) =>
    value.toLocaleString(i18n.language, { maximumFractionDigits: value < 10 ? 1 : 0 })
  const sigma = (value: number) => `±${value.toFixed(1)}`

  return (
    <div className={`bg-white rounded-2xl border border-slate-200/90 shadow-xs p-5 space-y-4 ${className}`}>
      <div className="border-b border-slate-100 pb-3">
        <h3 className="font-bold text-slate-900 text-sm">{t('optimization.impact_title')}</h3>
        <p className="text-[11px] text-slate-500">{t('optimization.impact_subtitle')}</p>
      </div>
      {comparisonError && (
        <div
          role="alert"
          className="bg-rose-50/70 border border-rose-200 text-rose-800 rounded-xl p-3 text-xs flex items-center justify-between gap-3"
        >
          <span>{t('optimization.impact_comparison_error', { error: comparisonError })}</span>
          {onRetryComparison && (
            <button
              type="button"
              onClick={onRetryComparison}
              className="shrink-0 rounded-md border border-rose-300 bg-white px-2.5 py-1 font-semibold text-rose-700 hover:bg-rose-100 cursor-pointer"
            >
              {t('common.retry')}
            </button>
          )}
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ImpactCard
          title={t('optimization.impact_dispersion')}
          tag={t('optimization.impact_estimated')}
          measured={false}
          measure={dispersion}
          format={sigma}
          caption={t('optimization.impact_dispersion_caption')}
        />
        <ImpactCard
          title={t('optimization.impact_avg_critical')}
          tag={sinceActivation}
          measured
          measure={comparison?.avg_critical_sites ?? null}
          format={count}
          caption={t('optimization.impact_without_with')}
        />
        <ImpactCard
          title={t('optimization.impact_avg_full')}
          tag={sinceActivation}
          measured
          measure={comparison?.avg_full_containers ?? null}
          format={count}
          caption={t('optimization.impact_without_with')}
        />
      </div>
    </div>
  )
}
export default RedistributionImpactPanel
