export type UtilizationCategory = 'critical' | 'high' | 'normal' | 'low' | 'idle'

export interface OptimizationConfig {
  window_days: number | null
  max_distance_km: number
  min_utilization_donor: number
  min_utilization_receiver: number
  target_utilization: number
  // 'greedy' y 'lp': modelo por score. 'overload' (greedy) y 'overload_mip': modelo de sobrecarga.
  algorithm: 'greedy' | 'lp' | 'overload' | 'overload_mip'
  apply_capacity_constraints?: boolean
  // Solo modelo de sobrecarga: horas por semana que tiene que ahorrar un movimiento.
  move_cost_hours_per_week?: number
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
  // Solo modelo 'overload': cuánto baja la sobrecarga total con este movimiento
  // (horas en crítico + 3 x horas desbordado, en la ventana de historia).
  overload_reduction?: number | null
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
  // Usuario que generó el plan (null en planes anteriores a registrarlo).
  created_by?: number | null
  original_mean_fill?: number
  original_std_fill?: number
  optimized_mean_fill?: number
  optimized_std_fill?: number
  // Solo modelo 'overload': horas en la ventana de historia, sumadas sobre los
  // sitios candidatos, con la distribución actual y con la del plan.
  critical_hours_before?: number | null
  critical_hours_after?: number | null
  overflow_hours_before?: number | null
  overflow_hours_after?: number | null
}

// Un valor de la red real (sin el plan) y de la red what-if (con el plan).
export interface WhatIfMeasure {
  real: number
  with_plan: number
}

// Cómo le va a la red con el plan, comparada con la red real.
export interface WhatIfComparisonResponse {
  plan_id: number
  plan_status: string
  // Desvío del nivel entre sitios, antes y después, estimado al generar el plan.
  dispersion: WhatIfMeasure | null
  // Horas medidas desde que se activó el plan (0: todavía sin datos).
  observed_hours: number
  // Promedio del período desde la activación (null mientras no haya horas medidas).
  avg_critical_sites: WhatIfMeasure | null
  avg_full_containers: WhatIfMeasure | null
  // Solo con el plan activo.
  full_container_hours: WhatIfMeasure | null
  critical_sites_now: WhatIfMeasure | null
  full_containers_now: WhatIfMeasure | null
}
