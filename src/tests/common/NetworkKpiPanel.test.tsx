import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { NetworkKpiPanel } from '@/common/KpiPanel'
import type { NetworkMetricsData } from '@/common/KpiPanel/types'
import { RedistributionImpactPanel } from '@/pages/Optimization/components/RedistributionImpactPanel'
import type { RedistributionPlan } from '@/pages/Optimization/types'

const mockMetrics: NetworkMetricsData = {
  total_sites: 120,
  total_containers: 284,
  mean_fill_level: 62.4,
  std_fill_level: 19.1,
  critical_count: 14,
  high_count: 26,
  normal_count: 50,
  low_count: 20,
  idle_count: 10,
  window_start: '2026-09-01T00:00:00Z',
  window_end: '2026-09-30T23:59:59Z',
}

const mockPlan: RedistributionPlan = {
  id: 1,
  status: 'active_whatif',
  config: {
    max_distance_km: 2.0,
    window_days: null,
    algorithm: 'greedy',
    min_utilization_donor: 0.35,
    min_utilization_receiver: 0.65,
    target_utilization: 0.5,
    apply_capacity_constraints: true,
  },
  moves: [
    {
      container_id: 101,
      from_site_id: 1,
      from_site_name: 'Sitio A',
      to_site_id: 2,
      to_site_name: 'Sitio B',
      distance_km: 0.85,
    },
  ],
  total_containers_moved: 1,
  sites_emptied: 0,
  sites_receiving: 1,
  sites_donating: 1,
  avg_distance_km: 0.85,
  expected_improvement: 15.0,
  created_at: '2026-10-01T12:00:00Z',
  simulation_id: null,
  original_mean_fill: 62.4,
  original_std_fill: 19.1,
  optimized_mean_fill: 62.4,
  optimized_std_fill: 12.8,
}

describe('NetworkKpiPanel Component Tests', () => {
  it('renders all 4 essential KPI cards with correct metric values', () => {
    render(<NetworkKpiPanel metrics={mockMetrics} />)

    // Contenedores monitoreados
    expect(screen.getByText('284')).toBeInTheDocument()
    expect(screen.getByText('en 120 sitios')).toBeInTheDocument()

    // Llenado medio
    expect(screen.getByText('62.4%')).toBeInTheDocument()

    // Foco crítico (aparece en tarjeta y en leyenda)
    expect(screen.getAllByText('14').length).toBeGreaterThanOrEqual(1)

    // Dispersión
    expect(screen.getByText('±19.1%')).toBeInTheDocument()
  })

  it('renders the capacity distribution bar and category pills', () => {
    render(<NetworkKpiPanel metrics={mockMetrics} />)

    expect(screen.getByText('Distribución de Capacidad de Sitios')).toBeInTheDocument()
    expect(screen.getAllByText('Críticos').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Alto Uso').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Equilibrados').length).toBeGreaterThanOrEqual(1)
  })

  it('collapses and expands cleanly when clicking the collapse button', () => {
    render(<NetworkKpiPanel metrics={mockMetrics} />)

    const toggleBtn = screen.getByRole('button', { name: /minimizar/i })
    fireEvent.click(toggleBtn)

    // En modo colapsado, debe mostrarse la píldora resumida con el texto 'Ver detalle'
    expect(screen.getByText('Ver detalle')).toBeInTheDocument()

    // Al hacer click en expandir o en la barra colapsada, vuelve al modo completo
    fireEvent.click(screen.getByText('Ver detalle'))
    expect(screen.getByText('Contenedores Monitoreados')).toBeInTheDocument()
  })

  it('invokes onSelectCategory when clicking a category card', () => {
    const handleSelectCategory = vi.fn()
    render(
      <NetworkKpiPanel
        metrics={mockMetrics}
        selectedCategory="all"
        onSelectCategory={handleSelectCategory}
      />
    )

    // Click on critical card
    const criticalCard = screen.getByText('Sitios Críticos').closest('div')
    if (criticalCard) {
      fireEvent.click(criticalCard)
      expect(handleSelectCategory).toHaveBeenCalledWith('critical')
    }
  })
})

describe('RedistributionImpactPanel Component Tests', () => {
  it('renders baseline placeholder when plan is null', () => {
    render(<RedistributionImpactPanel plan={null} baselineMetrics={mockMetrics} />)

    expect(
      screen.getByText('Impacto Proyectado de Redistribución (What-If)')
    ).toBeInTheDocument()
  })

  it('renders comparison metrics and moves summary when plan is provided', () => {
    render(<RedistributionImpactPanel plan={mockPlan} baselineMetrics={mockMetrics} />)

    expect(
      screen.getByText(/Comparativa de Balanceo What-If/i)
    ).toBeInTheDocument()

    // std fill reduction
    expect(screen.getByText('-33% dispersión')).toBeInTheDocument()
    expect(screen.getByText('±12.8%')).toBeInTheDocument()

    // Moves summary
    expect(screen.getByText('0.85 km')).toBeInTheDocument()
  })
})
