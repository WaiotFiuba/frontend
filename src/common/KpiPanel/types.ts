import type { ComponentType } from 'react'

export type UtilizationCategory = 'critical' | 'high' | 'normal' | 'low' | 'idle'

export interface NetworkMetricsData {
  total_sites: number
  total_containers?: number
  mean_fill_level?: number
  std_fill_level?: number
  critical_count: number
  high_count: number
  normal_count: number
  low_count: number
  idle_count: number
  window_start?: string | null
  window_end?: string | null
  is_whatif?: boolean
  plan_id?: number | null
}

export interface NetworkKpiPanelProps {
  metrics?: NetworkMetricsData | null
  loading?: boolean
  refreshTrigger?: number
  selectedCategory?: UtilizationCategory | 'all'
  onSelectCategory?: (category: UtilizationCategory | 'all') => void
  className?: string
  collapsible?: boolean
  defaultCollapsed?: boolean
  whatif?: boolean
}

export interface KpiCardProps {
  title: string
  value: string | number
  subvalue?: string
  icon: ComponentType<{ className?: string }>
  iconColor?: string
  tooltip?: string
  progressPct?: number
  progressColor?: string
  badgeText?: string
  badgeVariant?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'
  onClick?: () => void
  isSelected?: boolean
  className?: string
}
