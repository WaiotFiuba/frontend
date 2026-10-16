import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import MetricsOverview from '../../pages/Optimization/components/MetricsOverview'
import type { OptimizationMetricsResponse } from '../../pages/Optimization/types'
import {
  fetchOptimizationMetrics,
  generateOptimizationPlan,
  activateWhatIfPlan,
  deactivateWhatIfPlan,
  fetchWhatIfComparison,
  fetchActiveWhatIfPlan,
} from '../../pages/Optimization/services/optimizationApi'

const mockMetrics: OptimizationMetricsResponse = {
  total_sites: 10,
  critical_count: 2,
  high_count: 3,
  normal_count: 3,
  low_count: 1,
  idle_count: 1,
  window_start: '2026-08-01T00:00:00Z',
  window_end: '2026-08-31T23:59:59Z',
  sites: [],
}

describe('Optimization Module Tests', () => {
  const jsonResponse = <T,>(data: T) =>
    ({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => data,
      text: async () => JSON.stringify(data),
    } as Response)

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('renders MetricsOverview component with correct counts', () => {
    const handleSelectCategory = vi.fn()
    render(
      <MetricsOverview
        metrics={mockMetrics}
        selectedCategory="all"
        onSelectCategory={handleSelectCategory}
      />
    )

    expect(screen.getByText('10')).toBeInTheDocument()
    expect(screen.getByText('Críticos')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('Alto Uso')).toBeInTheDocument()
    expect(screen.getAllByText('3')).toHaveLength(2)
    expect(screen.getByText('Equilibrados')).toBeInTheDocument()

    // Test clicking a category
    fireEvent.click(screen.getByText('Críticos'))
    expect(handleSelectCategory).toHaveBeenCalledWith('critical')
  })

  it('fetchOptimizationMetrics calls correct URL with query params', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(mockMetrics))

    const data = await fetchOptimizationMetrics(15)
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/map/optimization/metrics?window_days=15'),
      expect.anything()
    )
    expect(data.total_sites).toBe(10)
  })

  it('generateOptimizationPlan sends config in POST payload', async () => {
    const mockPlan = {
      id: 42,
      status: 'draft',
      config: {
        window_days: null,
        max_distance_km: 2.0,
        min_utilization_donor: 0.35,
        min_utilization_receiver: 0.65,
        target_utilization: 0.5,
        algorithm: 'greedy',
      },
      moves: [],
      total_containers_moved: 5,
      sites_emptied: 1,
      sites_receiving: 2,
      sites_donating: 2,
      avg_distance_km: 1.25,
      expected_improvement: 0.28,
      created_at: '2026-09-01T12:00:00Z',
      simulation_id: null,
    }

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(mockPlan))

    const plan = await generateOptimizationPlan({
      window_days: null,
      max_distance_km: 2.5,
      min_utilization_donor: 0.35,
      min_utilization_receiver: 0.65,
      target_utilization: 0.5,
      algorithm: 'greedy',
    })

    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/map/optimization/plan'),
      expect.objectContaining({ method: 'POST' })
    )
    expect(plan.id).toBe(42)
    expect(plan.total_containers_moved).toBe(5)
  })

  it('activateWhatIfPlan and deactivateWhatIfPlan send correct requests', async () => {
    const mockPlan = { id: 10, status: 'active_whatif' }
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(mockPlan))

    await activateWhatIfPlan(10)
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/map/optimization/plan/10/whatif'),
      expect.objectContaining({ method: 'POST' })
    )

    await deactivateWhatIfPlan(10)
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/map/optimization/plan/10/whatif'),
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  it('fetchWhatIfComparison retrieves comparative metrics', async () => {
    const mockComparison = {
      plan_id: 10,
      plan_status: 'active_whatif',
      dispersion: { real: 30, with_plan: 22.5 },
      observed_hours: 334,
      avg_critical_sites: { real: 1587, with_plan: 1275 },
      avg_full_containers: { real: 1384, with_plan: 1258 },
      full_container_hours: { real: 468723, with_plan: 426880 },
      critical_sites_now: { real: 1610, with_plan: 1290 },
      full_containers_now: { real: 1402, with_plan: 1270 },
    }
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(mockComparison))

    const res = await fetchWhatIfComparison(10)
    expect(res.plan_id).toBe(10)
    expect(res.avg_critical_sites).toEqual({ real: 1587, with_plan: 1275 })
    expect(res.observed_hours).toBe(334)
  })

  it('fetchActiveWhatIfPlan returns null when there is no active plan', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(null))

    expect(await fetchActiveWhatIfPlan()).toBeNull()
  })
})
