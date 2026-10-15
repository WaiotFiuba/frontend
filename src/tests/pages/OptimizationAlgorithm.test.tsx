import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import Optimization from '@/pages/Optimization/page'

vi.mock('@/common/InteractiveMap', () => ({
  default: () => <div data-testid="interactive-map-mock" />,
}))

describe('Optimization algorithm selector', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    // Sin backend: las cargas iniciales fallan y la página queda en su estado base.
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'))
  })

  it('hides the score thresholds when the overload model is selected', () => {
    render(
      <MemoryRouter>
        <Optimization />
      </MemoryRouter>
    )

    expect(screen.getByText('Donante (Subutilizado)')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Sobrecarga' }))

    expect(screen.queryByText('Donante (Subutilizado)')).not.toBeInTheDocument()
    expect(screen.getByText(/Minimiza las horas en zona crítica/)).toBeInTheDocument()
  })
})
