import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import MapVisual from '@/common/MapVisual'

describe('MapVisual', () => {
    it('renders indicators and handles zoom and waste filter changes', () => {
        const onWasteFilterChange = vi.fn()
        const onZoomIn = vi.fn()
        const onZoomOut = vi.fn()

        render(
            <MapVisual
                currentZoom={14}
                wasteFilter="all"
                onWasteFilterChange={onWasteFilterChange}
                extraControls={<button type="button">Control extra</button>}
                onZoomIn={onZoomIn}
                onZoomOut={onZoomOut}
            />
        )

        expect(screen.queryByText(/Al 100%/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/Reloj de Simulación/i)).not.toBeInTheDocument()

        // Waste filter buttons
        fireEvent.click(screen.getByRole('button', { name: /Húmedos/i }))
        expect(onWasteFilterChange).toHaveBeenCalledWith('organico')

        fireEvent.click(screen.getByRole('button', { name: /Reciclables/i }))
        expect(onWasteFilterChange).toHaveBeenCalledWith('reciclaje')

        // Los botones que agrega la página van en la misma barra; sin ellos, no hay perfiles de zona.
        expect(screen.getByRole('button', { name: 'Control extra' })).toBeInTheDocument()
        expect(screen.queryByTitle(/perfiles de zona/i)).not.toBeInTheDocument()
    })

    it('disables unavailable waste filter buttons when not in availableWasteTypes', () => {
        const onWasteFilterChange = vi.fn()

        render(
            <MapVisual
                wasteFilter="all"
                onWasteFilterChange={onWasteFilterChange}
                availableWasteTypes={['organico']}
            />
        )

        const reciclablesBtn = screen.getByRole('button', { name: /Reciclables/i })
        expect(reciclablesBtn).toBeDisabled()

        const humedosBtn = screen.getByRole('button', { name: /Húmedos/i })
        expect(humedosBtn).not.toBeDisabled()
    })
})
