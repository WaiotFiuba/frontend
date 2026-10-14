import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import MapLegend from '@/pages/Map/components/MapLegend'

describe('MapLegend', () => {
    it('renders two dropdown selectors and allows toggling them', () => {
        render(<MapLegend />)

        expect(screen.getByText(/Nivel de llenado/i)).toBeInTheDocument()
        expect(screen.getByText(/Tipo de sitio/i)).toBeInTheDocument()

        // Toggle Niveles de Llenado (rangos con los umbrales por defecto: 70 y 80)
        fireEvent.click(screen.getByRole('button', { name: /Nivel de llenado/i }))
        expect(screen.getByText(/< 70%/i)).toBeInTheDocument()
        expect(screen.getByText(/70% - 79%/i)).toBeInTheDocument()
        expect(screen.getByText(/≥ 80%/i)).toBeInTheDocument()

        // Toggle Tipo de Sitio
        fireEvent.click(screen.getByRole('button', { name: /Tipo de sitio/i }))
        expect(screen.getByText(/Sitio humedo/i)).toBeInTheDocument()
        expect(screen.getByText(/Sitio reciclable/i)).toBeInTheDocument()
        expect(screen.getByText(/Cantidad de contenedores/i)).toBeInTheDocument()
    })
})
