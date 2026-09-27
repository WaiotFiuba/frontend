import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import MapLegend from '@/common/MapLegend'

describe('MapLegend', () => {
    it('renders the dictionary and allows toggling category tabs', () => {
        render(<MapLegend />)

        expect(screen.getByText(/Diccionario de Iconos/i)).toBeInTheDocument()
        expect(screen.getByText(/< 50%/i)).toBeInTheDocument()
        expect(screen.getByText(/50% - 79%/i)).toBeInTheDocument()
        expect(screen.getByText(/≥ 80%/i)).toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: /^Pines$/i }))
        expect(screen.getByText(/Sitio humedo/i)).toBeInTheDocument()
        expect(screen.getByText(/Sitio reciclable/i)).toBeInTheDocument()
        expect(screen.getByText(/Cantidad de contenedores/i)).toBeInTheDocument()
        expect(screen.queryByRole('button', { name: /^Rutas$/i })).not.toBeInTheDocument()

        fireEvent.click(screen.getByRole('button', { name: /^Todos$/i }))
        expect(screen.getByText(/Niveles de Llenado/i)).toBeInTheDocument()
        expect(screen.getByText(/Tipo de Sitio/i)).toBeInTheDocument()
    })
})
