export type UtilizationCategory = 'critical' | 'high' | 'normal' | 'low' | 'idle'

export interface OptimizationConfig {
  window_days: number | null
  max_distance_km: number
  min_utilization_donor: number
  min_utilization_receiver: number
  target_utilization: number
  algorithm: 'greedy' | 'lp'
  apply_capacity_constraints?: boolean
}

export interface SiteUtilizationMetric {
  site_id: number
  site_name: string
  latitude: number
  longitude: number
  container_count: number
  max_containers?: number
  puede_ingresar?: boolean
  waste_type_id: number | null
  waste_type_name: string | null
  container_type_id: number | null
  container_type_name: string | null
  avg_fill_level: number
  peak_fill_rate: number
  overflow_frequency: number
  time_to_full_hours: number | null
  utilization_score: number
  category: UtilizationCategory
}

export interface OptimizationMetricsResponse {
  total_sites: number
  total_containers?: number
  mean_fill_level?: number
  std_fill_level?: number
  critical_count: number
  high_count: number
  normal_count: number
  low_count: number
  idle_count: number
  window_start: string | null
  window_end: string | null
  sites: SiteUtilizationMetric[]
}

export interface RedistributionMove {
  container_id: number
  from_site_id: number
  from_site_name: string
  to_site_id: number
  to_site_name: string
  distance_km: number
  from_lat?: number
  from_lng?: number
  to_lat?: number
  to_lng?: number
  donor_fill_before?: number | null
  donor_fill_after?: number | null
  receiver_fill_before?: number | null
  receiver_fill_after?: number | null
  net_decongestion_pct?: number | null
}

export interface RedistributionPlan {
  id: number
  status: 'draft' | 'active_whatif' | 'completed'
  config: OptimizationConfig
  moves: RedistributionMove[]
  total_containers_moved: number
  sites_emptied: number
  sites_receiving: number
  sites_donating: number
  avg_distance_km: number
  expected_improvement: number
  created_at: string
  simulation_id: number | null
  original_mean_fill?: number
  original_std_fill?: number
  optimized_mean_fill?: number
  optimized_std_fill?: number
}

export interface WhatIfSiteComparison {
  site_id: number
  site_name: string
  latitude: number
  longitude: number
  real_avg_level: number
  optimized_avg_level: number
  real_container_count: number
  optimized_container_count: number
  improvement_pct: number
}

export interface WhatIfComparisonResponse {
  plan_id: number
  plan_status: string
  real_global_avg: number
  optimized_global_avg: number
  total_sites_improved: number
  total_sites_worsened: number
  sites: WhatIfSiteComparison[]
}
