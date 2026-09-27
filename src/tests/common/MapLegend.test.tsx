import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import MapLegend from '@/common/MapLegend'

describe('MapLegend', () => {
    it('renders the dictionary and allows toggling category tabs', () => {
        render(<MapLegend hasRedistributionMoves={true} />)

        expect(screen.getByText(/Diccionario de Iconos/i)).toBeInTheDocument()
        expect(screen.getByText(/< 50%/i)).toBeInTheDocument()
        expect(screen.getByText(/50% – 79%/i)).toBeInTheDocument()
        expect(screen.getByText(/≥ 80%/i)).toBeInTheDocument()

        // Switch to Markers tab
        fireEvent.click(screen.getByRole('button', { name: /^Pines$/i }))
        expect(screen.getByText(/Sitio con 1 contenedor/i)).toBeInTheDocument()
        expect(screen.getByText(/Sitio con múltiples contenedores/i)).toBeInTheDocument()

        // Switch to Routes tab
        fireEvent.click(screen.getByRole('button', { name: /^Rutas$/i }))
        expect(screen.getByText(/Vector de Traslado/i)).toBeInTheDocument()
        expect(screen.getByText(/Origen/i)).toBeInTheDocument()
        expect(screen.getByText(/Destino/i)).toBeInTheDocument()

        // Switch to All tab
        fireEvent.click(screen.getByRole('button', { name: /^Todos$/i }))
        expect(screen.getByText(/Niveles de Llenado/i)).toBeInTheDocument()
        expect(screen.getByText(/Pines en Mapa/i)).toBeInTheDocument()
    })
})
