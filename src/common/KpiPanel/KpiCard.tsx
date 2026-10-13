import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/utils/ui/tooltip'
import type { KpiCardProps } from './types'

const BADGE_STYLES: Record<NonNullable<KpiCardProps['badgeVariant']>, string> = {
  danger: 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20',
  warning: 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20',
  success: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
  info: 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20',
  neutral: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200',
}

export function KpiCard({
  title,
  value,
  subvalue,
  icon: Icon,
  iconColor = 'text-slate-600',
  tooltip,
  progressPct,
  progressColor = 'bg-blue-600',
  badgeText,
  badgeVariant = 'neutral',
  onClick,
  isSelected = false,
  className = '',
}: KpiCardProps) {
  const isClickable = Boolean(onClick)

  const cardContent = (
    <div
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onClick?.()
            }
          }
          : undefined
      }
      className={`relative p-3.5 rounded-xl border transition-all duration-200 select-none text-left flex flex-col justify-between ${isSelected
          ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-500/30 shadow-xs'
          : 'bg-white border-slate-200/90 shadow-2xs hover:border-slate-300'
        } ${isClickable ? 'cursor-pointer hover:shadow-xs hover:bg-slate-50/50' : ''} ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-1">
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
          {title}
        </span>
        {Icon && (
          <div className="p-1 rounded-md bg-slate-50 border border-slate-100 shrink-0">
            <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
          </div>
        )}
      </div>

      {/* Main Value */}
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
          {value}
        </span>
        {subvalue && (
          <span className="text-xs text-slate-500 font-medium truncate">
            {subvalue}
          </span>
        )}
        {badgeText && (
          <span
            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ml-auto shrink-0 ${BADGE_STYLES[badgeVariant]}`}
          >
            {badgeText}
          </span>
        )}
      </div>

      {/* Optional micro progress bar */}
      {progressPct !== undefined && (
        <div className="mt-2.5 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
            style={{ width: `${Math.min(100, Math.max(0, progressPct))}%` }}
          />
        </div>
      )}
    </div>
  )

  if (!tooltip) {
    return cardContent
  }

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
        <TooltipContent side="top">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
export default KpiCard
