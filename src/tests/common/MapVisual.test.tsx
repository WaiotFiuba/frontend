import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import MapVisual from '@/common/MapVisual'

describe('MapVisual', () => {
    it('renders indicators and handles zoom and waste filter changes', () => {
        const onWasteFilterChange = vi.fn()
        const onToggleZoneProfiles = vi.fn()
        const onZoomIn = vi.fn()
        const onZoomOut = vi.fn()

        render(
            <MapVisual
                fullContainersCount={5}
                simulatedClock="14:30"
                currentZoom={14}
                wasteFilter="all"
                onWasteFilterChange={onWasteFilterChange}
                zoneProfilesVisible={false}
                zoneProfilesLoading={false}
                onToggleZoneProfiles={onToggleZoneProfiles}
                onZoomIn={onZoomIn}
                onZoomOut={onZoomOut}
            />
        )

        expect(screen.getByText(/Al 100%/i)).toBeInTheDocument()
        expect(screen.getByText('5')).toBeInTheDocument()
        expect(screen.getByText(/Reloj de Simulación/i)).toBeInTheDocument()
        expect(screen.getByText('14:30')).toBeInTheDocument()

        // Waste filter buttons
        fireEvent.click(screen.getByRole('button', { name: /Húmedos/i }))
        expect(onWasteFilterChange).toHaveBeenCalledWith('organico')

        fireEvent.click(screen.getByRole('button', { name: /Reciclables/i }))
        expect(onWasteFilterChange).toHaveBeenCalledWith('reciclaje')

        // Zone profiles toggle
        fireEvent.click(screen.getByTitle(/Mostrar\/ocultar perfiles de zona/i))
        expect(onToggleZoneProfiles).toHaveBeenCalledTimes(1)
    })
})
