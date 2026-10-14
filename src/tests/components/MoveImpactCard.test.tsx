import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import MoveImpactCard from '@/pages/Optimization/components/MoveImpactCard'
import type { RedistributionMove } from '@/pages/Optimization/types'

const mockMove: RedistributionMove = {
  container_id: 42,
  from_site_id: 1,
  from_site_name: 'Sitio Cabildo 450',
  to_site_id: 2,
  to_site_name: 'Sitio Belgrano 1200',
  distance_km: 1.25,
  from_lat: -34.6,
  from_lng: -58.4,
  to_lat: -34.61,
  to_lng: -58.41,
  donor_fill_before: 20.0,
  donor_fill_after: 40.0,
  receiver_fill_before: 90.0,
  receiver_fill_after: 45.0,
  net_decongestion_pct: -25.0,
}

describe('MoveImpactCard Component Tests', () => {
  it('renders container ID, sites and net decongestion metric badge', () => {
    const handleClose = vi.fn()
    render(<MoveImpactCard move={mockMove} onClose={handleClose} />)

    expect(screen.getByText('#42')).toBeInTheDocument()
    expect(screen.getByText('Sitio Belgrano 1200')).toBeInTheDocument()
    expect(screen.getByText('Sitio Cabildo 450')).toBeInTheDocument()
    expect(screen.getByText('-25%')).toBeInTheDocument()
    expect(screen.getByText('Descongestión Neta del Par')).toBeInTheDocument()
    expect(screen.getByText('1.25 km')).toBeInTheDocument()
  })

  it('renders before and after fill levels for both donor and receiver', () => {
    render(<MoveImpactCard move={mockMove} onClose={vi.fn()} />)

    // Receiver: 90% -> 45% (-45%)
    expect(screen.getByText('90%')).toBeInTheDocument()
    expect(screen.getByText('45%')).toBeInTheDocument()
    expect(screen.getByText('-45% saturación')).toBeInTheDocument()

    // Donor: 20% -> 40% (+20%)
    expect(screen.getByText('20%')).toBeInTheDocument()
    expect(screen.getByText('40%')).toBeInTheDocument()
    expect(screen.getByText('+20% carga segura')).toBeInTheDocument()
  })

  it('triggers onClose when clicking close or hide buttons', () => {
    const handleClose = vi.fn()
    render(<MoveImpactCard move={mockMove} onClose={handleClose} />)

    const closeBtn = screen.getByRole('button', { name: /cerrar detalle/i })
    fireEvent.click(closeBtn)
    expect(handleClose).toHaveBeenCalledTimes(1)

    const hideBtn = screen.getByRole('button', { name: /ocultar/i })
    fireEvent.click(hideBtn)
    expect(handleClose).toHaveBeenCalledTimes(2)
  })
})
