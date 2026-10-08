import { api } from '@/lib/api'
import type {
  OptimizationConfig,
  OptimizationMetricsResponse,
  RedistributionPlan,
  WhatIfComparisonResponse,
} from '../types'

export async function fetchOptimizationMetrics(
  windowDays?: number | null
): Promise<OptimizationMetricsResponse> {
  const query = windowDays != null ? `?window_days=${encodeURIComponent(windowDays)}` : ''
  return await api.get<OptimizationMetricsResponse>(`/map/optimization/metrics${query}`)
}

export async function fetchNetworkKpis(
  whatif = false,
  planId?: number
): Promise<OptimizationMetricsResponse> {
  const params = new URLSearchParams()
  if (whatif) params.append('whatif', 'true')
  if (planId != null) params.append('plan_id', String(planId))
  const query = params.toString() ? `?${params.toString()}` : ''
  return await api.get<OptimizationMetricsResponse>(`/map/kpis${query}`)
}

export async function generateOptimizationPlan(
  config: OptimizationConfig
): Promise<RedistributionPlan> {
  return await api.post<RedistributionPlan>('/map/optimization/plan', config as unknown as Record<string, unknown>)
}

export async function fetchOptimizationPlan(
  planId: number
): Promise<RedistributionPlan> {
  return await api.get<RedistributionPlan>(`/map/optimization/plan/${planId}`)
}

export async function activateWhatIfPlan(
  planId: number
): Promise<RedistributionPlan> {
  return await api.post<RedistributionPlan>(`/map/optimization/plan/${planId}/whatif`)
}

export async function deactivateWhatIfPlan(
  planId: number
): Promise<RedistributionPlan> {
  return await api.delete<RedistributionPlan>(`/map/optimization/plan/${planId}/whatif`)
}

export async function fetchWhatIfComparison(
  planId: number
): Promise<WhatIfComparisonResponse> {
  return await api.get<WhatIfComparisonResponse>(`/map/optimization/plan/${planId}/comparison`)
}

export async function fetchActiveWhatIfPlan(): Promise<RedistributionPlan> {
  return await api.get<RedistributionPlan>('/map/optimization/plan/active')
}

